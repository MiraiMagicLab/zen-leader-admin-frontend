import {
  storageObjectsApi,
  type CompleteUploadResponse,
} from '@/services/storage/storage-objects-api';

const DEFAULT_CONCURRENCY = 5;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [500, 1000, 2000] as const;

export type MultipartUploadProgress = {
  uploadedBytes: number;
  totalBytes: number;
  uploadedParts: number;
  totalParts: number;
};

export type MultipartUploadOptions = {
  concurrency?: number;
  onProgress?: (progress: MultipartUploadProgress) => void;
  signal?: AbortSignal;
};

/**
 * Uploads a large file directly to Cloudflare R2 via backend-managed multipart sessions.
 */
export async function uploadFileMultipart(
  file: File,
  options: MultipartUploadOptions = {},
): Promise<CompleteUploadResponse> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const contentType = file.type || 'application/octet-stream';

  const init = await storageObjectsApi.initialize({
    originalFilename: file.name,
    fileSize: file.size,
    contentType,
  });

  const { storageObjectId, chunkSize, totalParts } = init;
  const uploadedParts = new Set<number>();

  try {
    const progress = await storageObjectsApi.getUploadProgress(storageObjectId);
    progress.uploadedParts.forEach((partNumber) => uploadedParts.add(partNumber));

    const pendingParts = Array.from({ length: totalParts }, (_, index) => index + 1).filter(
      (partNumber) => !uploadedParts.has(partNumber),
    );

    emitProgress(options, file.size, chunkSize, uploadedParts.size, totalParts);

    let nextIndex = 0;
    const takeNextPart = () => {
      if (nextIndex >= pendingParts.length) {
        return null;
      }
      const partNumber = pendingParts[nextIndex];
      nextIndex += 1;
      return partNumber;
    };

    const worker = async () => {
      while (true) {
        if (options.signal?.aborted) {
          throw new DOMException('Upload aborted', 'AbortError');
        }

        const partNumber = takeNextPart();
        if (partNumber == null) {
          return;
        }

        await uploadPartWithRetry({
          storageObjectId,
          file,
          partNumber,
          chunkSize,
          signal: options.signal,
        });

        uploadedParts.add(partNumber);
        emitProgress(options, file.size, chunkSize, uploadedParts.size, totalParts);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, pendingParts.length || 1) }, () => worker()),
    );

    return await storageObjectsApi.complete(storageObjectId);
  } catch (error) {
    try {
      await storageObjectsApi.abort(storageObjectId);
    } catch {
      // Best-effort cleanup; preserve the original failure.
    }
    throw error;
  }
}

async function uploadPartWithRetry(params: {
  storageObjectId: string;
  file: File;
  partNumber: number;
  chunkSize: number;
  signal?: AbortSignal;
}) {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    if (params.signal?.aborted) {
      throw new DOMException('Upload aborted', 'AbortError');
    }

    try {
      await uploadSinglePart(params);
      return;
    } catch (error) {
      lastError = error;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay == null) {
        break;
      }
      await sleep(delay);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Chunk upload failed after retries.');
}

async function uploadSinglePart(params: {
  storageObjectId: string;
  file: File;
  partNumber: number;
  chunkSize: number;
}) {
  const start = (params.partNumber - 1) * params.chunkSize;
  const end = Math.min(start + params.chunkSize, params.file.size);
  const chunk = params.file.slice(start, end);

  const presigned = await storageObjectsApi.getPresignedUploadUrls(params.storageObjectId, [
    params.partNumber,
  ]);
  const uploadUrl = presigned.urls[0]?.uploadUrl;
  if (!uploadUrl) {
    throw new Error(`Missing presigned URL for part ${params.partNumber}.`);
  }

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: chunk,
    headers: {
      'Content-Type': params.file.type || 'application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new Error(`Chunk upload failed for part ${params.partNumber} (${response.status}).`);
  }

  const etag = response.headers.get('ETag') ?? response.headers.get('etag');
  if (!etag) {
    throw new Error(`Missing ETag for part ${params.partNumber}.`);
  }

  await storageObjectsApi.savePart(params.storageObjectId, {
    partNumber: params.partNumber,
    etag,
    size: chunk.size,
  });
}

function emitProgress(
  options: MultipartUploadOptions,
  totalBytes: number,
  chunkSize: number,
  uploadedParts: number,
  totalParts: number,
) {
  options.onProgress?.({
    uploadedBytes: Math.min(uploadedParts * chunkSize, totalBytes),
    totalBytes,
    uploadedParts,
    totalParts,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Uses direct multipart upload for large video files. */
export function shouldUseMultipartUpload(file: File): boolean {
  return file.type.startsWith('video/') || file.size > 50 * 1024 * 1024;
}
