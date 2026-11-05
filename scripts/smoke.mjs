import assert from 'node:assert/strict';

const base = process.env.SMOKE_URL ?? 'http://127.0.0.1:8765';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Demo smoke is local-only');
function client() {
  const cookies = new Map();
  let token;
  return async (path, method = 'GET', body, status = 200) => {
    const response = await fetch(new URL(path, base), {
      method,
      headers: {
        Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'X-CSRFToken': token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';', 1)[0];
      const equals = pair.indexOf('=');
      cookies.set(pair.slice(0, equals), pair.slice(equals + 1));
    }
    assert.equal(response.status, status, `${method} ${path}`);
    const data = await response.json();
    if (data.csrfToken) token = data.csrfToken;
    return data;
  };
}
const first = client(),
  second = client(),
  anonymous = client();
assert.equal((await first('/health/ready')).service, 'household-ledger-nestjs');
for (const [call, username] of [
  [first, 'demo1'],
  [second, 'demo2'],
]) {
  await call('/api/auth/csrf');
  await call('/api/auth/login', 'POST', { username, password: 'LocalDemo!2026' }, 201);
}
assert.equal((await first('/api/bank')).provider, 'demo', 'Only touch a demo ledger');
const rows = await first('/api/transactions');
assert.equal(rows.count, 6);
const original = rows.results.find((row) => row.name === 'COSTCO');
assert.ok(original);
const path = `/api/transactions/${original.id}`;
let edited;
try {
  edited = await first(path, 'PATCH', { version: original.version, note: 'NestJS HTTP smoke' });
  assert.equal((await second(path)).note, 'NestJS HTTP smoke');
  await second(path, 'PATCH', { version: original.version, note: 'stale update' }, 409);
  assert.equal(
    (await first(`/api/summary?month=${original.date.slice(0, 7)}`)).net_spend_cents,
    11999,
  );
  assert.ok((await first('/api/digests')).count >= 1);
  await anonymous('/api/transactions', 'GET', undefined, 403);
  assert.equal((await fetch(new URL('/api/docs', base))).status, 200);
  const schema = await (await fetch(new URL('/api/docs-json', base))).json();
  assert.ok(schema.paths['/api/auth/login']);
} finally {
  if (edited) await first(path, 'PATCH', { version: edited.version, note: original.note });
  await first('/api/auth/logout', 'POST', {}, 201);
  await second('/api/auth/logout', 'POST', {}, 201);
}
console.log(
  'PASS: NestJS HTTP, two logins, shared edit, 409 conflict, $119.99 summary, inbox, anonymous 403, Swagger; original note restored.',
);
