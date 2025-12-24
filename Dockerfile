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
# Remove existing symlink if it exists to avoid symlink loops
RUN rm -f /usr/bin/chromium-browser && \
    if [ -f /usr/bin/chromium ]; then \
        ln -sf /usr/bin/chromium /usr/bin/chromium-browser && \
        echo "Chromium symlink created successfully"; \
    else \
        echo "WARNING: Chromium not found at /usr/bin/chromium"; \
    fi

# Verify the symlink was created correctly
RUN if [ -L /usr/bin/chromium-browser ] || [ -f /usr/bin/chromium-browser ]; then \
        echo "✓ Chromium-browser symlink verified"; \
        /usr/bin/chromium-browser --version 2>/dev/null || echo "Chromium found but may have dependency issues"; \
    else \
        echo "⚠ WARNING: chromium-browser symlink not found - Puppeteer will use bundled Chromium"; \
    fi

# Set Chromium path for our code to detect (code will validate and fallback if not found)
# DO NOT set PUPPETEER_EXECUTABLE_PATH - let our code control it via launchOptions.executablePath
# This allows proper fallback to bundled Chromium if system Chrome is not available
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser
# Set Puppeteer cache directory (for bundled Chromium)
ENV PUPPETEER_CACHE_DIR=/home/nodejs/.cache/puppeteer
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

# Switch to non-root user for Puppeteer installation
USER nodejs

# Install Puppeteer's bundled Chromium as fallback
# This ensures bundled Chromium is available if system Chromium fails
# Run as nodejs user to ensure proper permissions
RUN cd /app && \
    npx puppeteer browsers install chrome 2>&1 || echo "Note: Puppeteer Chromium installation completed or will use system Chromium"

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/app.js"]

