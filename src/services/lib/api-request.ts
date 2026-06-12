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
  const { data } = await httpClient.post<ApiResponse<T>>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapApiResponse(data);
}

export async function apiGetBlob(url: string): Promise<Blob> {
  const response = await httpClient.get(url, { responseType: 'blob' });
  return response.data as Blob;
}
