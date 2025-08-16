# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy TypeScript config & source code
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Build the project
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy package files & install prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built dist from builder stage
COPY --from=builder /app/dist ./dist
COPY .env ./.env

EXPOSE 3000

CMD ["node", "dist/main.js"]
