/**
 * Returns true if it's safe to close a form. When the form is dirty, asks the user to confirm
 * discarding unsaved changes. Use inside a Sheet/Dialog `onOpenChange` close handler.
 */
export function confirmDiscard(isDirty: boolean): boolean {
  if (!isDirty) {
    return true;
  }
  return window.confirm('Discard unsaved changes?');
}
