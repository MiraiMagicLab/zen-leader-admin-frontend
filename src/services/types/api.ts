/** Khớp com.zenleader.api.common.dtos.response.ApiResponse */
export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  errorMessage?: ApiErrorMessage;
  data?: T;
};

/** Khớp com.zenleader.api.common.dtos.ErrorMessage */
export type ApiErrorMessage = {
  errorCode?: string;
  message?: string;
  params?: Record<string, unknown>;
};
