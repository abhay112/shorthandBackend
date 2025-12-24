#!/bin/bash

# ==========================================
# Start Local Services - Quick Helper Script
# ==========================================
# Simple script to start all services locally for testing
#
# Usage: bash scripts/start-local-services.sh
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT" || exit 1

echo "Starting local services..."
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating from template..."
    if [ -f "env.production.template" ]; then
        cp env.production.template .env
        echo "✅ Created .env from template"
        echo "⚠️  Please edit .env with your configuration before services will work properly"
    else
        echo "❌ env.production.template not found"
        exit 1
    fi
    echo ""
fi

# Start services
echo "Building and starting Docker containers..."
docker-compose -f docker-compose.yml up -d --build

echo ""
echo "Waiting for services to start (10 seconds)..."
sleep 10

echo ""
echo "Checking service status..."
docker-compose -f docker-compose.yml ps

echo ""
echo "✅ Services started!"
echo ""
echo "Access services at:"
echo "  - Backend API:  http://127.0.0.1:5001"
echo "  - Grafana:      http://127.0.0.1:3001"
echo "  - Prometheus:   http://127.0.0.1:9090"
echo "  - Loki:         http://127.0.0.1:3100"
echo ""
echo "View logs: docker-compose -f docker-compose.yml logs -f"
echo "Stop services: docker-compose -f docker-compose.yml down"
echo ""

