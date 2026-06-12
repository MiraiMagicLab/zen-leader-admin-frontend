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
  remove: (key: string) =>
    apiDelete<void>(`/api/v1/assets?key=${encodeURIComponent(key)}`),
};
