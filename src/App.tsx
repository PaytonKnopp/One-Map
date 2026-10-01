import { useEffect, useMemo } from 'react';

import worldJson from '../data/world.json';
import { WorldSchema } from './core/schema/world.ts';

export function App() {
  // Parsed once per load, not per render — world.json only changes between
  // builds. Throwing here (rather than rendering broken UI) matches the
  // project's "fail loud on invalid data" stance; `npm run validate` is
  // meant to catch this long before it reaches the browser.
  const world = useMemo(() => WorldSchema.parse(worldJson), []);

  useEffect(() => {
    document.title = world.name;
  }, [world.name]);

  return (
    <main>
      <h1>{world.name}</h1>
      <p>The map viewer is under construction. Check back after Milestone 2.</p>
      <p>
        <em>
          "{world.name}" is a placeholder name — see <code>data/world.json</code> to change it.
        </em>
      </p>
    </main>
  );
}
