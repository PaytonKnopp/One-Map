import { useEffect, useRef } from 'react';

/**
 * Shared keyboard behavior for every side panel (InfoPanel, BrowseView,
 * ChroniclePage, AboutPage): focus the close button on open (so a
 * keyboard/screen-reader user lands somewhere inside the panel, not
 * wherever focus happened to be before), and close on Escape from
 * anywhere in the document.
 */
export function usePanelDismiss(onClose: () => void, focusKey?: unknown) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // `focusKey` lets a panel that stays mounted across a changing id
  // (InfoPanel, switching entities) refocus the close button each time,
  // not just on first mount.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return closeButtonRef;
}
