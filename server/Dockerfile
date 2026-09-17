# Multi-stage Dockerfile for Express Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package and service configs
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/

RUN npm ci

# Copy sources
COPY packages/shared/ ./packages/shared/
COPY server/ ./server/

# Build shared types then server
RUN npm run build:shared
RUN npm run build:server

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/

RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 5000

USER node

CMD ["node", "server/dist/index.js"]
