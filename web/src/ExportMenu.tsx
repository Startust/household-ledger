import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react';
import { exportFile } from './api';

export function ExportMenu({
  params,
  scope,
  disabled = false,
}: {
  params: URLSearchParams;
  scope: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const query = params.toString();
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node) && !request.current)
        ref.current.open = false;
    };
    const network = () => setOnline(navigator.onLine);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    return () => {
      request.current?.abort();
      request.current = null;
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
    };
  }, []);
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setBusy(null);
    setError('');
    if (ref.current) ref.current.open = false;
  }, [query]);
  async function download(format: 'csv' | 'pdf') {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(format);
    setError('');
    try {
      const query = new URLSearchParams(params);
      query.delete('page');
      query.set('format', format);
      const { blob, filename } = await exportFile(query, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      if (ref.current) ref.current.open = false;
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(null);
      }
    }
  }
  return (
    <details
      ref={ref}
      className="export-menu"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) {
          event.preventDefault();
          ref.current!.open = false;
          ref.current?.querySelector('summary')?.focus();
        }
      }}
    >
      <summary
        className="button secondary"
        aria-label="Export transactions"
        aria-disabled={disabled || !online}
        onClick={(event) => {
          if (disabled || !online || busy) event.preventDefault();
        }}
      >
        {busy ? <LoaderCircle size={17} className="spinning" /> : <Download size={17} />}Export
      </summary>
      <div className="export-options">
        <p>{scope}</p>
        <button type="button" disabled={!!busy || !online} onClick={() => download('csv')}>
          <FileSpreadsheet size={18} />
          <span>{busy === 'csv' ? 'Preparing CSV…' : 'Download CSV'}</span>
        </button>
        <button type="button" disabled={!!busy || !online} onClick={() => download('pdf')}>
          <FileText size={18} />
          <span>{busy === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}</span>
        </button>
        {busy && (
          <span className="sr-only" role="status">
            Preparing export
          </span>
        )}
        {error && (
          <p className="export-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
