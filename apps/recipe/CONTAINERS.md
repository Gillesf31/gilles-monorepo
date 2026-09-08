# Recipe production containers

Build the frontend image from the repository root:

```sh
pnpm nx run recipe:docker:build
```

The target builds Angular in production mode, writes the existing build-version
metadata, and packages the static output with Nginx. The Docker context allows
only that output and the Nginx configuration; local credentials are excluded.

Nginx runs as an unprivileged user on port 8080. It serves Angular deep links,
service-worker assets, and `/version.json`. Missing static assets return 404.
HTML and assets must revalidate, while API responses use `Cache-Control: no-store`.

Connect it to the API container on a Docker network with the hostname `api`.
Requests to `/api/*` are forwarded to `api:3000/*`; creation responses expose a
usable `/api/recipes/:id` Location header. Docker DNS is refreshed so replacing
the API container does not require restarting Nginx.

The proxy behavior uses Nginx's [URI replacement and response-header rewriting](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
and [upstream DNS resolution](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#server).
