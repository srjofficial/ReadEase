# Multi-stage Dockerfile for React Client with Nginx
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and client definitions
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY client/package*.json ./client/

RUN npm ci

# Copy sources
COPY packages/shared/ ./packages/shared/
COPY client/ ./client/

# Build shared types then client
RUN npm run build:shared
RUN npm run build:client

# Production runtime stage
FROM nginx:1.25-alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html

# Custom nginx config to support client-side SPA routing
RUN printf 'server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
