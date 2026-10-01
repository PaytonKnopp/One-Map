import type { CSSProperties } from 'react';
import commits from 'virtual:chronicle';

import { usePanelDismiss } from './usePanelDismiss.ts';

interface ChroniclePageProps {
  onClose: () => void;
}

/** "World chronicle" (brief §8): recent git history, grouped by date — generated at build time (vite.config.ts's chroniclePlugin), not hand-maintained. */
export function ChroniclePage({ onClose }: ChroniclePageProps) {
  const closeButtonRef = usePanelDismiss(onClose);
  const byDate = new Map<string, typeof commits>();
  for (const commit of commits) {
    const existing = byDate.get(commit.date) ?? [];
    existing.push(commit);
    byDate.set(commit.date, existing);
  }

  return (
    <aside style={panelStyle} aria-label="World chronicle">
      <button
        type="button"
        ref={closeButtonRef}
        onClick={onClose}
        style={closeButtonStyle}
        aria-label="Close"
      >
        ×
      </button>
      <h2 style={{ marginTop: 0 }}>Chronicle</h2>
      {commits.length === 0 ? (
        <p>No git history available in this build.</p>
      ) : (
        <p style={{ fontSize: 12, opacity: 0.6 }}>
          The {commits.length} most recent change{commits.length === 1 ? '' : 's'}.
        </p>
      )}
      {Array.from(byDate.entries()).map(([date, dayCommits]) => (
        <section key={date} style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, opacity: 0.7, margin: '0 0 4px' }}>{date}</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {dayCommits.map((commit) => (
              <li key={commit.hash}>{commit.message}</li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  // Above the toolbar/breadcrumbs (zIndex 1, App.tsx) -- on a narrow
  // viewport the toolbar wraps tall enough to otherwise sit on top of
  // this panel's own close button and heading.
  zIndex: 2,
  bottom: 0,
  width: 'min(380px, 100%)',
  overflowY: 'auto',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
  padding: '16px 20px',
  boxShadow: '-2px 0 12px rgba(0,0,0,0.15)',
  boxSizing: 'border-box',
};

const closeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  background: 'none',
  border: 'none',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  color: 'inherit',
};
