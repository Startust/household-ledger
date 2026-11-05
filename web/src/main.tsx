import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AtlasModeProvider, applyAtlasMode, isAtlasMode } from './hoshikuzu/atlas-mode';
import './hoshikuzu.css';

try {
  const stored = localStorage.getItem('hoshikuzu-atlas-mode');
  applyAtlasMode(isAtlasMode(stored) ? stored : 'night');
} catch {
  applyAtlasMode('night');
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AtlasModeProvider>
      <App />
    </AtlasModeProvider>
  </StrictMode>,
);
