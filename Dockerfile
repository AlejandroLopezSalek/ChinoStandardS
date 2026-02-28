# Stage 1: Build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for Eleventy/Tailwind build)
RUN npm ci

# Copy source code
COPY . .

# Build the static site
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies and PM2 globally
RUN npm ci --only=production && npm install pm2 -g

# Copy built frontend from builder stage
COPY --from=builder /app/_site ./_site

# Copy backend source code from builder stage
COPY --from=builder /app/server ./server

# Copy ecosystem config
COPY --from=builder /app/ecosystem.config.js .

# Expose port
EXPOSE 3000

# Start application using PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
