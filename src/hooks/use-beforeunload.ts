import { useEffect } from 'react';

/**
 * Warns the user (native browser prompt) before leaving/closing the tab while `when` is true —
 * e.g. when a form has unsaved changes.
 */
export function useBeforeUnload(when: boolean) {
  useEffect(() => {
    if (!when) {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
}
