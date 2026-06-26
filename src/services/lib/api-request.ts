import type { ApiResponse } from '@/services/types/api';
import { httpClient } from '@/services/http-client';
import { unwrapApiResponse } from '@/services/lib/unwrap-api-response';

export async function apiGet<T>(url: string): Promise<T> {
  const { data } = await httpClient.get<ApiResponse<T>>(url);
  return unwrapApiResponse(data);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await httpClient.post<ApiResponse<T>>(url, body);
  return unwrapApiResponse(data);
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await httpClient.put<ApiResponse<T>>(url, body);
  return unwrapApiResponse(data);
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await httpClient.patch<ApiResponse<T>>(url, body);
  return unwrapApiResponse(data);
}

export async function apiDelete<T>(url: string): Promise<T> {
  const { data } = await httpClient.delete<ApiResponse<T>>(url);
  return unwrapApiResponse(data);
}

export async function apiPostForm<T>(url: string, formData: FormData): Promise<T> {
  const { data } = await httpClient.post<ApiResponse<T>>(url, formData);
  return unwrapApiResponse(data);
}

async function readBlobApiError(blob: Blob, fallbackMessage: string): Promise<string> {
  try {
    const text = await blob.text();
    const payload = JSON.parse(text) as ApiResponse<unknown>;
    return payload.errorMessage?.message ?? payload.message ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function apiGetBlob(url: string): Promise<Blob> {
  const response = await httpClient.get<Blob>(url, { responseType: 'blob' });
  const blob = response.data;
  const rawContentType = response.headers['content-type'];
  const contentType =
    typeof rawContentType === 'string'
      ? rawContentType
      : Array.isArray(rawContentType)
        ? rawContentType.join(';')
        : '';

  if (contentType.includes('application/json') || blob.type.includes('json')) {
    throw new Error(await readBlobApiError(blob, 'Download failed.'));
  }

  if (blob.size === 0) {
    throw new Error('Download failed: empty file.');
  }

  return blob;
}
