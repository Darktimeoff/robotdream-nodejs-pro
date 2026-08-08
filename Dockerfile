FROM node:24-alpine AS builder

WORKDIR /src

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S appuser && adduser -S -G appuser appuser

COPY package*.json ./
COPY --from=builder /src/dist ./dist

RUN npm ci --omit=dev && chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://localhost:${PORT:-3000}/health || exit 1

CMD ["node", "dist/index.js"]