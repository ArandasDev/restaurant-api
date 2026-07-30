# ── Build stage ───────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run prisma:generate && npm run build && npm prune --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Run as the built-in non-root user for a smaller attack surface.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
# Apply migrations, then start. `migrate deploy` is safe to run on every boot.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
