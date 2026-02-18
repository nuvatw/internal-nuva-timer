FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm install --workspace=server --production=false

# Build
COPY server/ server/
RUN npm run build --workspace=server

# Production
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm install --workspace=server --omit=dev

COPY --from=base /app/server/dist server/dist

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
