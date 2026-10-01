import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted OFL webfonts (see docs/DECISIONS.md "Fonts self-hosted via
// @fontsource/*") — only the weights the atlas theme actually uses.
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';

import { App } from './App.tsx';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root element is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
