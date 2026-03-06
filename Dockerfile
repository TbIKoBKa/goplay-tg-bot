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

CMD ["bun", "src/index.ts"]
