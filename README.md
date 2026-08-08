# ДЗ 5 — Docker

Сервіс з Лекції 4 (Express + TypeScript, Node 24) + Postgres 17.

Ендпойнти: `GET /health` віддає `OK`, `GET /ping` віддає `Pong`.

## Запуск

```bash
docker compose up -d
```

Це dev-режим, бо автоматично підхоплюється `docker-compose.override.yml`: збирається стадія `builder`, `./src` кидається в контейнер bind mount'ом, працює `node --watch`.

Для CI треба явно вказати базовий файл, щоб override не підхопився:

```bash
docker compose -f docker-compose.yml up -d
```

Перевірка:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health   # 200
docker inspect --format '{{.State.Health.Status}}' homework-5-api-1     # healthy, секунд через 15
docker run --rm homework5-server id -u                                  # 100
```

`docker compose down` зупиняє все, дані Postgres при цьому лишаються. Якщо треба знести і їх — `down -v`.

## Розміри образів

```bash
docker build -f Dockerfile.naive -t homework5-server:naive .
docker images | grep homework5-server
```

| Образ | Розмір |
|---|---|
| `homework5-server:latest` (multi-stage) | 246 MB |
| `homework5-server:naive` (одна стадія) | 313 MB |

Різниця 67 МБ через те, що в multi-stage у фінальний образ їде тільки зібраний `dist/` і залежності з `--omit=dev`, а одностадійна збірка тягне туди ж typescript, `@types/*` і вихідні `.ts`.

Обидва образи збирались з одним і тим же `.dockerignore`. Без нього наївний був би ще товщий, бо `COPY . .` затягнув би локальні `node_modules` і `.git`.

## Кеш шарів

`COPY package*.json` і `npm ci` стоять до `COPY . .`, тому правка в `src/` не перезапускає встановлення залежностей:

```bash
docker compose -f docker-compose.yml build
echo "// touch" >> src/index.ts
docker compose -f docker-compose.yml build   # рядок з npm ci буде CACHED
```

## Non-root і healthcheck

У runner-стадії створюється `appuser` і далі йде `USER appuser`, процес крутиться під uid 100. `chown` зчеплений з `npm ci` в одному `RUN`, інакше вийшов би зайвий шар з копією `node_modules`.

`HEALTHCHECK` описаний у Dockerfile, а не в compose, тому працює і при звичайному `docker run`. Всередині звичайний `wget` по `/health`: busybox-версія повертає ненульовий код на все, що не 2xx, тож якщо ендпойнт відвалиться, контейнер стане unhealthy.

Сам api піднімається тільки після того, як Postgres реально готовий: `depends_on` з `condition: service_healthy` + `pg_isready` в healthcheck бази.

## Як перевіряв persistence

Дані в іменованому volume `postgres_data`.

```bash
docker compose exec -T db psql -U admin -d app -c \
  "CREATE TABLE IF NOT EXISTS persistence_check (id serial PRIMARY KEY, note text);"
docker compose exec -T db psql -U admin -d app -c \
  "INSERT INTO persistence_check (note) VALUES ('survived down/up');"

docker compose down
docker compose up -d

docker compose exec -T db psql -U admin -d app -c "SELECT * FROM persistence_check;"
```

Після рестарту таблиця на місці:

```
 id |       note
----+------------------
  1 | survived down/up
(1 row)
```
