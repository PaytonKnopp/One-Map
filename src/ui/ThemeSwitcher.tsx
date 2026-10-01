import type { CSSProperties } from 'react';

import { themeIds } from '../map/data.ts';

interface ThemeSwitcherProps {
  current: string;
  onChange: (themeId: string) => void;
}

/** Cycles through every data/themes/*.json (brief §9 — "the UI has a theme switcher"). No code change needed to add a theme. */
export function ThemeSwitcher({ current, onChange }: ThemeSwitcherProps) {
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Theme"
      style={selectStyle}
    >
      {themeIds().map((id) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </select>
  );
}

const selectStyle: CSSProperties = {
  padding: '6px 8px',
  borderRadius: 4,
  border: '1px solid rgba(128,128,128,0.4)',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
  font: '14px system-ui, sans-serif',
  cursor: 'pointer',
};
