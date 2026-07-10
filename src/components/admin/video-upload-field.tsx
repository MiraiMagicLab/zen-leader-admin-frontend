import { useRef } from 'react';
import { Film, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  shouldUseMultipartUpload,
  uploadFileMultipart,
  type MultipartUploadProgress,
} from '@/lib/multipart-upload';
import { cn } from '@/lib/utils';
import { syllabusItemsApi } from '@/services/lms/lms-api';

export type VideoAttachmentPreview = {
  fileName?: string;
  url?: string;
};

type VideoUploadFieldProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  existingAttachment?: VideoAttachmentPreview | null;
  required?: boolean;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  disabled?: boolean;
  uploadProgress?: MultipartUploadProgress | null;
  isUploading?: boolean;
};

/** Video file picker UI with chunked-upload hint for large assets. */
export function VideoUploadField({
  file,
  onFileChange,
  existingAttachment,
  required = false,
  error,
  touched,
  onBlur,
  disabled = false,
  uploadProgress = null,
  isUploading = false,
}: VideoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerPicker = () => inputRef.current?.click();

  return (
    <div className="space-y-2">
      <Label>
        Video file{' '}
        {existingAttachment && !file && !required ? null : (
          <span className="text-destructive">*</span>
        )}
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={(event) => {
          onFileChange(event.target.files?.[0] ?? null);
        }}
        onBlur={onBlur}
      />

      {file ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Film className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {Math.round((file.size / 1024 / 1024) * 10) / 10} MB
                {shouldUseMultipartUpload(file) ? ' · chunked upload' : ''}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => onFileChange(null)}
          >
            <X className="mr-1 size-4" /> Remove
          </Button>
        </div>
      ) : existingAttachment ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Film className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {existingAttachment.fileName || 'Attached video'}
                </p>
                <p className="text-muted-foreground text-xs">Already uploaded</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={triggerPicker}>
              Replace
            </Button>
          </div>
          {existingAttachment.url ? (
            <div className="overflow-hidden rounded-lg border bg-black">
              <video
                controls
                preload="metadata"
                src={existingAttachment.url}
                className="max-h-48 w-full"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={triggerPicker}
          className={cn(
            'flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 px-4 py-8 text-center transition-colors hover:bg-muted/20',
            error && touched && 'border-destructive bg-destructive/5',
          )}
        >
          <Upload className="text-muted-foreground mb-2 size-6" />
          <p className="text-sm font-medium">Click to upload video</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Large files upload in chunks directly to Cloudflare R2
          </p>
        </button>
      )}

      {uploadProgress ? (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Uploading to R2…</span>
            <span className="text-muted-foreground tabular-nums">
              {uploadProgress.uploadedParts}/{uploadProgress.totalParts} parts
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (uploadProgress.uploadedBytes / uploadProgress.totalBytes) * 100,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {error && touched ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

/**
 * Uploads a syllabus video file, using multipart R2 flow for large assets.
 */
export async function uploadSyllabusVideo(
  syllabusItemId: string,
  selectedFile: File,
  onProgress?: (progress: MultipartUploadProgress) => void,
): Promise<void> {
  if (shouldUseMultipartUpload(selectedFile)) {
    const completed = await uploadFileMultipart(selectedFile, { onProgress });
    await syllabusItemsApi.attachStorageObject(syllabusItemId, completed.storageObjectId);
    return;
  }

  await syllabusItemsApi.uploadFile(syllabusItemId, selectedFile);
}
