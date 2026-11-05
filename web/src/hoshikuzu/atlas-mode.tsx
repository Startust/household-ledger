'use client';

import * as React from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { cn } from 'cn';

type AtlasMode = 'night' | 'archive';

const DEFAULT_STORAGE_KEY = 'hoshikuzu-atlas-mode';

const MODE_LABEL: Record<AtlasMode, string> = {
  night: 'Night atlas',
  archive: 'Archive sheet',
};

function isAtlasMode(value: unknown): value is AtlasMode {
  return value === 'night' || value === 'archive';
}

/** Writes the mode contract onto <html>: data-atlas-mode, plus .dark at night. */
function applyAtlasMode(mode: AtlasMode, root: HTMLElement = document.documentElement) {
  root.dataset.atlasMode = mode;
  root.classList.toggle('dark', mode === 'night');
}

/**
 * Inline this in <head> before hydration so the first paint uses the stored
 * mode: `<script dangerouslySetInnerHTML={{ __html: atlasModeScript() }} />`.
 */
function atlasModeScript(
  storageKey: string = DEFAULT_STORAGE_KEY,
  defaultMode: AtlasMode = 'night',
) {
  const key = JSON.stringify(storageKey);
  const fallback = JSON.stringify(defaultMode);
  return `(function(){var d=document.documentElement,m=${fallback};try{var s=localStorage.getItem(${key});if(s==="night"||s==="archive")m=s}catch(e){}d.dataset.atlasMode=m;d.classList.toggle("dark",m==="night")})()`;
}

type AtlasModeContextValue = {
  mode: AtlasMode;
  setMode: (mode: AtlasMode) => void;
  toggleMode: () => void;
};

const AtlasModeContext = React.createContext<AtlasModeContextValue | null>(null);

function readStoredMode(storageKey: string): AtlasMode | null {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isAtlasMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

function AtlasModeProvider({
  children,
  defaultMode = 'night',
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  children: React.ReactNode;
  defaultMode?: AtlasMode;
  storageKey?: string;
}) {
  const [mode, setMode] = React.useState<AtlasMode>(() =>
    typeof window === 'undefined' ? defaultMode : (readStoredMode(storageKey) ?? defaultMode),
  );

  React.useEffect(() => {
    applyAtlasMode(mode);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', mode === 'night' ? '#02040a' : '#f7f8f3');
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {
      // Storage can be unavailable (private windows); the mode still applies.
    }
  }, [mode, storageKey]);

  const value = React.useMemo<AtlasModeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((current) => (current === 'night' ? 'archive' : 'night')),
    }),
    [mode],
  );

  return <AtlasModeContext.Provider value={value}>{children}</AtlasModeContext.Provider>;
}

function useAtlasMode() {
  const context = React.useContext(AtlasModeContext);
  if (!context) {
    throw new Error('useAtlasMode must be used within <AtlasModeProvider>');
  }
  return context;
}

/**
 * Switches between night atlas and archive sheet. The accessible name always
 * names the mode it switches to.
 */
function AtlasModeToggle({
  className,
  compact = false,
  ...props
}: Omit<React.ComponentProps<'button'>, 'onClick' | 'children'> & {
  /** Icon-only square; the label stays available to assistive tech. */
  compact?: boolean;
}) {
  const { mode, toggleMode } = useAtlasMode();
  const next: AtlasMode = mode === 'night' ? 'archive' : 'night';
  const Icon = mode === 'night' ? MoonIcon : SunIcon;

  return (
    <button
      type="button"
      data-slot="atlas-mode-toggle"
      data-mode={mode}
      aria-label={`Switch to ${MODE_LABEL[next].toLowerCase()}`}
      title={MODE_LABEL[mode]}
      onClick={toggleMode}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-2 rounded-sm border border-border bg-card/80 px-2.5 text-2xs font-semibold tracking-[0.16em] text-muted-foreground uppercase transition-[color,border-color,background-color] duration-150 ease-out-quint outline-none hover:border-border-strong hover:bg-surface-raised hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97] [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-signal',
        compact && 'w-8 justify-center px-0',
        className,
      )}
      {...props}
    >
      <Icon aria-hidden />
      <span className={cn(compact && 'sr-only')}>{MODE_LABEL[mode]}</span>
    </button>
  );
}

export {
  AtlasModeProvider,
  AtlasModeToggle,
  applyAtlasMode,
  atlasModeScript,
  isAtlasMode,
  useAtlasMode,
  type AtlasMode,
};
