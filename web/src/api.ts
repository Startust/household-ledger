let token = '';
let tokenRequest: Promise<void> | undefined;
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function clearSession() {
  token = '';
}
export async function exportFile(params: URLSearchParams, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch('/api/exports/transactions?' + params, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
    });
  } catch {
    throw new ApiError(0, 'Export failed. Check your connection and try again.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = data.detail ?? data.message ?? 'Export failed. Try again.';
    if (response.status === 403) window.dispatchEvent(new Event('ledger:unauthorized'));
    throw new ApiError(response.status, Array.isArray(detail) ? detail.join('; ') : String(detail));
  }
  const blob = await response.blob();
  const format = params.get('format') === 'pdf' ? 'pdf' : 'csv';
  const filename =
    response.headers.get('Content-Disposition')?.match(/filename="([a-z0-9.-]+)"/i)?.[1] ??
    `home-ledger.${format}`;
  return { blob, filename };
}
async function csrf() {
  if (!tokenRequest)
    tokenRequest = fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok)
          throw new ApiError(response.status, 'Unable to connect. Please try again.');
        token = (await response.json()).csrfToken;
      })
      .finally(() => {
        tokenRequest = undefined;
      });
  await tokenRequest;
}
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  retry = true,
): Promise<T> {
  if (!path.startsWith('/api/')) throw new Error('Only same-origin API paths are supported');
  if (method !== 'GET' && !token) await csrf();
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(method === 'GET' ? {} : { 'X-CSRFToken': token }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApiError(0, 'Connection failed. Check your network and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail ?? data.message ?? 'That did not finish. Please try again.';
    const message = Array.isArray(detail) ? detail.join('; ') : String(detail);
    if (response.status === 403 && message.includes('CSRF') && retry) {
      await csrf();
      return api(path, method, body, false);
    }
    if (
      path !== '/api/auth/me' &&
      response.status === 403 &&
      message.includes('Please sign in to your household account.')
    )
      window.dispatchEvent(new Event('ledger:unauthorized'));
    throw new ApiError(
      response.status,
      response.status === 429
        ? 'Too many sign-in attempts. Please wait 15 minutes and try again.'
        : message,
    );
  }
  if (data.csrfToken) token = data.csrfToken;
  return data as T;
}
