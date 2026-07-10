import { apiDelete, apiGet, apiPost } from '@/services/lib/api-request';

export type InitStorageObjectRequest = {
  originalFilename: string;
  fileSize: number;
  contentType: string;
};

export type InitStorageObjectResponse = {
  storageObjectId: string;
  uploadId: string;
  chunkSize: number;
  totalParts: number;
};

export type PresignedUploadUrlResponse = {
  urls: Array<{ partNumber: number; uploadUrl: string }>;
  expiresAt: string;
};

export type SaveUploadPartRequest = {
  partNumber: number;
  etag: string;
  size: number;
};

export type SaveUploadPartResponse = {
  partNumber: number;
  uploadedPartCount: number;
  uploadedBytes: number;
};

export type UploadProgressResponse = {
  status: string;
  uploadedBytes: number;
  uploadedPartCount: number;
  totalParts: number;
  uploadedParts: number[];
};

export type CompleteUploadResponse = {
  storageObjectId: string;
  objectKey: string;
  status: string;
  downloadUrl: string;
};

export const storageObjectsApi = {
  initialize: (payload: InitStorageObjectRequest) =>
    apiPost<InitStorageObjectResponse>('/api/v2/storage-objects', payload),

  getPresignedUploadUrls: (storageObjectId: string, partNumbers: number[]) =>
    apiPost<PresignedUploadUrlResponse>(
      `/api/v2/storage-objects/${storageObjectId}/presigned-upload-urls`,
      { partNumbers },
    ),

  savePart: (storageObjectId: string, payload: SaveUploadPartRequest) =>
    apiPost<SaveUploadPartResponse>(
      `/api/v2/storage-objects/${storageObjectId}/parts`,
      payload,
    ),

  getUploadProgress: (storageObjectId: string) =>
    apiGet<UploadProgressResponse>(
      `/api/v2/storage-objects/${storageObjectId}/upload-progress`,
    ),

  complete: (storageObjectId: string) =>
    apiPost<CompleteUploadResponse>(
      `/api/v2/storage-objects/${storageObjectId}/complete`,
      {},
    ),

  abort: (storageObjectId: string) =>
    apiDelete<void>(`/api/v2/storage-objects/${storageObjectId}/upload`),
};
