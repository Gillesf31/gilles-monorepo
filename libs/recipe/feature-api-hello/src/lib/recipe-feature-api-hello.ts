import { HttpRouter, HttpServerResponse } from '@effect/platform';

export const helloRoutes = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/hello',
    HttpServerResponse.text('Hello World', {
      contentType: 'text/plain; charset=utf-8',
    }),
  ),
);
