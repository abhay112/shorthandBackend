#!/bin/bash

# ================================================
# Local CI/CD Pipeline Testing Script
# ================================================
# This script simulates the CI/CD pipeline locally
# Usage: ./scripts/test-ci-local.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Local CI/CD Pipeline Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Code Quality Checks
echo -e "${YELLOW}[1/6] Running Code Quality Checks...${NC}"
echo ""

echo -e "${BLUE}→ Running ESLint...${NC}"
if npm run lint; then
    echo -e "${GREEN}✓ ESLint passed${NC}"
else
    echo -e "${RED}✗ ESLint failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}→ Running Security Audit...${NC}"
if npm audit --audit-level=moderate; then
    echo -e "${GREEN}✓ Security audit passed${NC}"
else
    echo -e "${YELLOW}⚠ Security audit found issues (continuing anyway)${NC}"
fi

# Step 2: Install Dependencies
echo ""
echo -e "${YELLOW}[2/6] Installing Dependencies...${NC}"
if npm ci; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Step 3: Run Tests
echo ""
echo -e "${YELLOW}[3/6] Running Tests...${NC}"
if npm test -- --passWithNoTests; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi

# Step 4: Build Docker Image
echo ""
echo -e "${YELLOW}[4/6] Building Docker Image...${NC}"
IMAGE_NAME="shorthnd-backend:test-$(date +%s)"
if docker build -t "$IMAGE_NAME" .; then
    echo -e "${GREEN}✓ Docker image built: $IMAGE_NAME${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

# Step 5: Start Application in Docker
echo ""
echo -e "${YELLOW}[5/6] Starting Application Container...${NC}"
CONTAINER_NAME="shorthnd-backend-test-$(date +%s)"

# Check if .env exists, if not create a minimal one
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found, creating minimal .env for testing...${NC}"
    cat > .env << EOF
NODE_ENV=test
PORT=3000
MONGO_URI=mongodb://localhost:27017/shorthnd_test
SESSION_SECRET=test-secret-key
EOF
fi

# Start container
if docker run -d \
    --name "$CONTAINER_NAME" \
    -p 3001:3000 \
    --env-file .env \
    "$IMAGE_NAME"; then
    echo -e "${GREEN}✓ Container started: $CONTAINER_NAME${NC}"
    
    # Wait for application to start
    echo -e "${BLUE}→ Waiting for application to start (30 seconds)...${NC}"
    sleep 30
    
    # Check if container is still running
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${RED}✗ Container stopped unexpectedly${NC}"
        echo -e "${YELLOW}Container logs:${NC}"
        docker logs "$CONTAINER_NAME"
        docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
        exit 1
    fi
else
    echo -e "${RED}✗ Failed to start container${NC}"
    exit 1
fi

# Step 6: Validate Monitoring Endpoints
echo ""
echo -e "${YELLOW}[6/6] Validating Monitoring Endpoints...${NC}"
BASE_URL="http://localhost:3001"

# Check health endpoint
echo -e "${BLUE}→ Checking /health endpoint...${NC}"
if curl -f -s "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Health endpoint is working${NC}"
else
    echo -e "${RED}✗ Health endpoint failed${NC}"
    docker logs "$CONTAINER_NAME"
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    exit 1
fi

# Check readiness endpoint
echo -e "${BLUE}→ Checking /health/ready endpoint...${NC}"
if curl -f -s "$BASE_URL/health/ready" > /dev/null; then
    echo -e "${GREEN}✓ Readiness endpoint is working${NC}"
else
    echo -e "${YELLOW}⚠ Readiness endpoint returned non-200 (might be expected if DB not connected)${NC}"
fi

# Check metrics endpoint
echo -e "${BLUE}→ Checking /metrics endpoint...${NC}"
if curl -f -s "$BASE_URL/metrics" | grep -q "http_request"; then
    echo -e "${GREEN}✓ Metrics endpoint is working${NC}"
else
    echo -e "${RED}✗ Metrics endpoint validation failed${NC}"
    docker logs "$CONTAINER_NAME"
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    exit 1
fi

# Run Node.js validation script if available
if [ -f scripts/validate-monitoring.js ]; then
    echo -e "${BLUE}→ Running comprehensive monitoring validation...${NC}"
    BASE_URL="$BASE_URL" node scripts/validate-monitoring.js || {
        echo -e "${YELLOW}⚠ Monitoring validation script had issues (continuing)${NC}"
    }
fi

# Cleanup
echo ""
echo -e "${YELLOW}Cleaning up...${NC}"
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
echo -e "${GREEN}✓ Container removed${NC}"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  CI/CD Pipeline Test: SUCCESS${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "All steps completed successfully:"
echo -e "  ${GREEN}✓${NC} Code quality checks"
echo -e "  ${GREEN}✓${NC} Dependencies installed"
echo -e "  ${GREEN}✓${NC} Tests passed"
echo -e "  ${GREEN}✓${NC} Docker image built"
echo -e "  ${GREEN}✓${NC} Application started"
echo -e "  ${GREEN}✓${NC} Monitoring endpoints validated"
echo ""
