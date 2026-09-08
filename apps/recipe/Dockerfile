# Build with: pnpm nx run recipe:docker:build
FROM nginx:stable-alpine

COPY apps/recipe/nginx.conf /etc/nginx/nginx.conf
COPY dist/apps/recipe/browser/ /usr/share/nginx/html/
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=6 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/index.html || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
