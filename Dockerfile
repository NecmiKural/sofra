# Sofra — single-container self-host image

FROM node:22-alpine AS builder
WORKDIR /app
ENV DATABASE_URL=file:/app/data/sofra.db
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
RUN npm run build

# The entrypoint runs the prisma and tsx CLIs, and neither survives into the
# runner otherwise: Next's standalone bundle only traces what the server imports,
# and the CLIs' own dependencies are hoisted across the full install. A separate
# self-contained tree (~140 MB) is smaller and sturdier than cherry-picking one.
FROM node:22-alpine AS clitools
WORKDIR /src
COPY package.json ./
RUN mkdir -p /clitools && cd /clitools \
 && npm init -y > /dev/null \
 && npm install --no-audit --no-fund \
      "prisma@$(node -p 'require("/src/package.json").devDependencies.prisma')" \
      "tsx@$(node -p 'require("/src/package.json").devDependencies.tsx')"

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/sofra.db
# Next's standalone server binds to $HOSTNAME, and container runtimes set that
# to the container ID — which resolves nowhere, so the server never starts.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=clitools /clitools/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# The generated client and its query engine, built for this image's platform.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY docker-entrypoint.sh ./

RUN mkdir -p /app/data
VOLUME /app/data
EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
