import { apiDelete, apiGet, apiPostForm } from '@/services/lib/api-request';
import type { AssetResponse, PresignedUploadResponse } from '@/services/types/domain';

export const assetsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiPostForm<AssetResponse>('/api/v1/assets/upload', form);
  },
  getPresignedUpload: (fileName: string, contentType: string) =>
    apiGet<PresignedUploadResponse>(
      `/api/v1/assets/presigned-upload?fileName=${encodeURIComponent(fileName)}&contentType=${encodeURIComponent(contentType)}`,
    ),
  getPresignedDownload: (key: string) =>
    apiGet<string>(
      `/api/v1/assets/presigned-download?key=${encodeURIComponent(key)}`,
    ),
  uploadViaPresigned: async (file: File): Promise<PresignedUploadResponse> => {
    const presigned = await assetsApi.getPresignedUpload(file.name, file.type);
    const response = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error('Image upload failed.');
    }

    return presigned;
  },
  remove: (key: string) =>
    apiDelete<void>(`/api/v1/assets?key=${encodeURIComponent(key)}`),
};
