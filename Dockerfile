FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY package.json config.yaml tsconfig.json ./
COPY src/ src/

# Подписчики переживают редеплой только на volume — /app перезаписывается образом.
RUN mkdir -p /data && chown -R bun:bun /data
VOLUME /data
ENV SUBSCRIBERS_FILE=/data/subscribers.json

ENV NODE_ENV=production
EXPOSE 8765
USER bun

CMD ["bun", "src/index.ts"]
