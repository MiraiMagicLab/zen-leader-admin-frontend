/**
 * Removes HTML tags so rich-text content can be shown safely in plain-text UI slots.
 *
 * @param value HTML or plain text content
 * @return plain text without markup
 */
export function stripHtml(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
