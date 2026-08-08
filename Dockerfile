FROM node:24-alpine AS builder

WORKDIR /src

COPY package*.json ./

RUN npm clean-install

COPY . .

RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S appuser && adduser -S -G appuser appuser

COPY package*.json ./
COPY --from=builder /src/dist ./dist

RUN npm clean-install --omit=dev && chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]