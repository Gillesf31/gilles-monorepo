import { HttpApp } from '@effect/platform';
import { expect, it } from 'vitest';
import { helloRoutes } from './recipe-feature-api-hello';

it('returns Hello World as plain text for GET /hello', async () => {
  const handler = HttpApp.toWebHandler(helloRoutes);
  const response = await handler(new Request('http://localhost/hello'));

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe(
    'text/plain; charset=utf-8',
  );
  expect(await response.text()).toBe('Hello World');
});
