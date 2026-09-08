# Build with: pnpm nx run recipe-api:docker:build
# The build context contains only the production output, never local credentials.
FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app
COPY main.js ./main.js
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3000/hello').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "main.js"]
