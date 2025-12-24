# Multi-stage build for Node.js application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Development dependencies stage
FROM base AS dev-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Build stage (if needed)
FROM base AS builder
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    && rm -rf /var/cache/apk/*

# Create symlink for chromium-browser (Alpine uses chromium, but Puppeteer expects chromium-browser)
RUN ln -s /usr/bin/chromium /usr/bin/chromium-browser || true

# Set Chromium path for Puppeteer
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy dependencies and application
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Create cache directory for Puppeteer with proper permissions
RUN mkdir -p /home/nodejs/.cache/puppeteer && \
    chown -R nodejs:nodejs /home/nodejs/.cache

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/app.js"]

