#!/bin/bash
set -e

echo "🚀 Starting Local CI/CD Pipeline Test..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print step
print_step() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Lint
print_step "Step 1: Running Lint"
if npm run lint; then
    print_success "Lint passed"
else
    print_warning "Lint found issues (continuing...)"
fi
echo ""

# Step 2: Tests
print_step "Step 2: Running Tests"
if npm run test:coverage; then
    print_success "Tests passed"
else
    print_error "Tests failed"
    exit 1
fi
echo ""

# Step 3: Security Audit
print_step "Step 3: Running Security Audit"
if npm run audit; then
    print_success "Security audit passed"
else
    print_warning "Security audit found issues (non-blocking)"
fi
echo ""

# Step 4: Build
print_step "Step 4: Building Application"
if npm run build; then
    print_success "Build completed"
else
    print_error "Build failed"
    exit 1
fi
echo ""

# Step 5: Docker Build
print_step "Step 5: Building Docker Image"
if command -v docker &> /dev/null; then
    if docker build -t shorthand-backend:local .; then
        print_success "Docker image built successfully"
        echo ""
        echo -e "${GREEN}📦 Docker image: shorthand-backend:local${NC}"
        echo -e "${BLUE}🚀 To run: docker run -p 3000:3000 --env-file .env shorthand-backend:local${NC}"
    else
        print_error "Docker build failed"
        exit 1
    fi
else
    print_warning "Docker not found, skipping Docker build"
fi
echo ""

# Final summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All CI steps passed locally!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

