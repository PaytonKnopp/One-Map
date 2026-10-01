import { useMemo, type CSSProperties } from 'react';

import { toSortKey } from '../core/calendar.ts';
import { listEntities } from '../content/entities.ts';
import { world } from '../map/data.ts';

interface TimelineProps {
  year: number;
  onYearChange: (year: number) => void;
  ghost: boolean;
  onGhostChange: (ghost: boolean) => void;
}

const DEFAULT_SPAN_YEARS = 100;

/** The slider bounds: every dated entity's year, padded, or a span around "now" if nothing's dated yet. */
function yearRange(): { min: number; max: number } {
  const years: number[] = [];
  for (const entity of listEntities()) {
    if (entity.from) years.push(entity.from.y);
    if (entity.to) years.push(entity.to.y);
    if (entity.date) years.push(entity.date.y);
  }
  years.push(world.calendar.currentYear);
  const min = Math.min(...years);
  const max = Math.max(...years);
  const pad = Math.max(10, Math.round((max - min) * 0.1));
  return years.length > 1
    ? { min: min - pad, max: max + pad }
    : {
        min: world.calendar.currentYear - DEFAULT_SPAN_YEARS,
        max: world.calendar.currentYear + DEFAULT_SPAN_YEARS,
      };
}

/** The timeline slider (brief §4.3): scrub to a year, map shows what exists then. */
export function Timeline({ year, onYearChange, ghost, onGhostChange }: TimelineProps) {
  const { min, max } = useMemo(() => yearRange(), []);
  const era = year < 0 ? world.calendar.eraBefore : world.calendar.eraAfter;

  return (
    <div style={containerStyle}>
      <button
        type="button"
        onClick={() => onYearChange(world.calendar.currentYear)}
        style={nowButtonStyle}
      >
        Now
      </button>
      <input
        type="range"
        min={min}
        max={max}
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        aria-label="Year"
        aria-valuetext={`${Math.abs(year)} ${era}`}
        style={sliderStyle}
      />
      <span style={yearLabelStyle}>
        {Math.abs(year)} {era}
      </span>
      <label style={ghostLabelStyle}>
        <input type="checkbox" checked={ghost} onChange={(e) => onGhostChange(e.target.checked)} />{' '}
        ghost
      </label>
    </div>
  );
}

// Re-exported for App.tsx, which needs a sort key to compare against entity ranges without duplicating calendar logic.
export function yearSortKey(year: number): number {
  return toSortKey({ y: year }, world.calendar);
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  left: 12,
  right: 12,
  // Lifted clear of ScaleBar/CoordinateReadout, which sit at the very
  // bottom corners (rendered inside MapView).
  bottom: 56,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'rgba(255,255,255,0.9)',
  padding: '8px 12px',
  borderRadius: 4,
  font: '13px system-ui, sans-serif',
  color: '#1a1a1a',
};

const nowButtonStyle: CSSProperties = {
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid rgba(128,128,128,0.4)',
  background: '#fff',
  cursor: 'pointer',
  font: 'inherit',
};

const sliderStyle: CSSProperties = {
  flex: 1,
  minWidth: 80,
};

const yearLabelStyle: CSSProperties = {
  minWidth: 80,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const ghostLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  whiteSpace: 'nowrap',
};
