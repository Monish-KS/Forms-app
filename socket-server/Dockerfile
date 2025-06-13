# Use a Node.js 20 LTS image as the base
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Build the Socket.IO server
FROM base AS builder
COPY socket-server/. .
RUN pnpm install --no-frozen-lockfile --force
RUN pnpm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment variables for production
ENV NODE_ENV production
ENV PORT 3001

# Copy necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose the port Socket.IO server runs on
EXPOSE 3001

# Command to run the application
CMD ["node", "dist/index.js"]