import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// This check intentionally restarts the local stack and cleans up only its recipe.
const origin = 'http://127.0.0.1:8080';
const compose = [
  'compose',
  '-f',
  'infra/recipe/compose.yaml',
  '-f',
  'infra/recipe/compose.runtime.yaml',
];

async function request(path, status, method = 'GET', body) {
  const response = await fetch(origin + path, {
    method,
    headers:
      body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, status, `${method} ${path}`);
  return response;
}

for (const path of [
  '/',
  '/recipe/00000000-0000-4000-8000-000000000001/edit',
  '/ngsw.json',
  '/ngsw-worker.js',
  '/version.json',
]) {
  const response = await request(path, 200);
  assert.equal(response.headers.get('cache-control'), 'no-cache');
}
assert.ok((await (await request('/version.json', 200)).json()).version);
await request('/missing.js', 404);
await request('/api/unknown', 404);
await request('/api/recipes', 400, 'POST', {});

const body = {
  title: `Runtime check ${randomUUID()}`,
  ingredients: [{ name: 'Egg', quantity: '1', unit: '' }],
  instructions: ['Cook.'],
  isWorkInProgress: false,
};
const creation = await request('/api/recipes', 201, 'POST', body);
const recipe = await creation.json();
const path = `/api/recipes/${recipe.id}`;

try {
  assert.equal(creation.headers.get('location'), path);
  assert.equal(creation.headers.get('cache-control'), 'no-store');
  const updated = await (
    await request(path, 200, 'PUT', { ...body, title: `${body.title} updated` })
  ).json();
  const pinned = await (
    await request(`${path}/pin`, 200, 'PATCH', { isPinned: true })
  ).json();
  assert.deepEqual(pinned, { ...updated, isPinned: true });
  console.log(
    'Proxy, creation, editing and pinning passed; restarting the local stack.',
  );

  execFileSync('docker', [...compose, 'stop'], { stdio: 'inherit' });
  execFileSync(
    'docker',
    [...compose, 'up', '-d', '--wait', '--wait-timeout', '90'],
    { stdio: 'inherit' },
  );

  assert.deepEqual(await (await request(path, 200)).json(), pinned);
  const list = await (await request('/api/recipes', 200)).json();
  assert.deepEqual(
    list.find((item) => item.id === recipe.id),
    pinned,
  );
  const unpinned = await (
    await request(`${path}/pin`, 200, 'PATCH', { isPinned: false })
  ).json();
  assert.deepEqual(unpinned, updated);
} finally {
  await request(path, 204, 'DELETE');
}

await request(path, 404);
await request(path, 404, 'DELETE');
assert.ok(
  !(await (await request('/api/recipes', 200)).json()).some(
    (item) => item.id === recipe.id,
  ),
);
console.log(
  'Restart persistence, unpinning and deletion passed; test recipe removed.',
);
