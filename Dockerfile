FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY package.json config.yaml tsconfig.json ./
COPY src/ src/

ENV NODE_ENV=production
EXPOSE 8765

# База переживает редеплой только на постоянном диске: /app заменяется образом.
# Диск подключается в дашборде Railway (Volume, mount path /data), объявлять его
# директивой в Dockerfile там запрещено, сборка падает. Без диска путь всё равно
# рабочий, просто данные сбрасываются при деплое; каталог создаётся сам.
ENV DATABASE_FILE=/data/goplay.db

CMD ["bun", "src/index.ts"]
