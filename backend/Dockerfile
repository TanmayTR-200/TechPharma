# Backend Dockerfile
FROM node:18-alpine

# Install wget for health checks, build tools for native addons (better-sqlite3)
RUN apk add --no-cache wget python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data directory for JSON files
RUN mkdir -p data

# Expose the port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
