FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src/ src/
COPY config.yaml tsconfig.json ./

ENV NODE_ENV=production
EXPOSE ${BRIDGE_WS_PORT:-8765}

CMD ["bun", "run", "src/index.ts"]
