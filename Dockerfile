# Multi-stage Dockerfile for Node.js (production)
FROM node:18-bullseye-slim AS builder
WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

FROM node:18-bullseye-slim
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Copy built app from the builder stage
COPY --from=builder /usr/src/app /usr/src/app

# Ensure the official 'node' user owns the app directory (official Node images include this user)
RUN chown -R node:node /usr/src/app

# Switch to the non-root node user
USER node

# Expose application port
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]
