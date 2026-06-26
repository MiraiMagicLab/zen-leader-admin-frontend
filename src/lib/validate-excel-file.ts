const INVALID_EXCEL_MESSAGE =
  'This file is not a valid Excel workbook. Download the template, paste your data, and save as .xlsx — do not rename CSV files to .xlsx.';

const FILE_READ_ERROR_MESSAGE =
  'Could not read the selected file. Save and close it in Excel, then choose the file again.';

export async function snapshotUploadFile(file: File): Promise<File> {
  const buffer = await file.arrayBuffer();
  const type =
    file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return new File([buffer], file.name, { type, lastModified: file.lastModified });
}

export async function validateExcelFile(file: File): Promise<string | null> {
  const buffer = await file.slice(0, 8).arrayBuffer();
  return validateExcelBuffer(buffer);
}

export function validateExcelBuffer(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));

  const isXlsx = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  const isXls =
    bytes.length >= 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0;

  if (!isXlsx && !isXls) {
    return INVALID_EXCEL_MESSAGE;
  }

  return null;
}

export { INVALID_EXCEL_MESSAGE, FILE_READ_ERROR_MESSAGE };
