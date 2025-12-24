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

# Install Chromium and ALL required dependencies for Puppeteer 24.x
# This is critical - missing libs cause "Target closed" errors
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    # Additional required libraries for Chromium stability
    libstdc++ \
    dbus \
    dbus-libs \
    mesa-gl \
    mesa-dri-gallium \
    # Font rendering
    fontconfig \
    ttf-liberation \
    # Additional utilities
    udev \
    # Timezone data (sometimes needed)
    tzdata \
    && rm -rf /var/cache/apk/* \
    # Clean up
    && rm -rf /tmp/*

# Create symlink for chromium-browser (Alpine uses chromium, but Puppeteer expects chromium-browser)
RUN ln -sf /usr/bin/chromium /usr/bin/chromium-browser

# Set Chromium path for Puppeteer
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# Mark as Docker container for our detection logic
ENV DOCKER_CONTAINER=true

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy dependencies and application
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Create cache and temp directories for Puppeteer with proper permissions
RUN mkdir -p /home/nodejs/.cache/puppeteer && \
    mkdir -p /tmp/.chromium && \
    chown -R nodejs:nodejs /home/nodejs/.cache && \
    chown -R nodejs:nodejs /tmp/.chromium

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/app.js"]

