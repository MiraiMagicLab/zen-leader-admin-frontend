import axios from 'axios';
import { ZodError } from 'zod';

import { getZodErrorMessage } from '@/lib/format-zod-error';
import type { ApiResponse } from '@/services/types/api';

export function getApiErrorMessage(
  error: unknown,
  fallback = 'An error occurred. Please try again.',
): string {
  if (error instanceof ZodError) {
    return getZodErrorMessage(error);
  }

  if (!axios.isAxiosError(error)) {
    if (error instanceof DOMException && error.name === 'NotReadableError') {
      return 'Could not read the selected file. Save and close it in Excel, then choose the file again.';
    }
    return error instanceof Error ? error.message : fallback;
  }

  const payload = error.response?.data as ApiResponse<unknown> | undefined;

  return (
    payload?.errorMessage?.message ??
    enrollmentErrorMessage(payload?.errorMessage?.errorCode) ??
    payload?.message ??
    error.message ??
    fallback
  );
}

const ENROLLMENT_ERROR_MESSAGES: Record<string, string> = {
  'lms.enrollment_already_exists':
    'This user is already enrolled in the class.',
  'lms.import_not_excel_format':
    'This file is not a valid Excel workbook. Download the template, paste your data into it, and save as .xlsx. Do not rename CSV files to .xlsx.',
  'lms.import_invalid_excel':
    'Invalid Excel file. Use the downloaded template and ensure the first sheet has an email column in row 1.',
  'lms.import_missing_email_column':
    'Excel must contain an email column in row 1.',
};

function enrollmentErrorMessage(errorCode: string | undefined): string | undefined {
  if (!errorCode) return undefined;
  return ENROLLMENT_ERROR_MESSAGES[errorCode];
}
