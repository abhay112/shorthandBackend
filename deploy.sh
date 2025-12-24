#!/bin/bash

# =================================
# Production Deployment Script
# =================================
# Run this script on your VPS to deploy/update the application
# Usage: ./deploy.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  Shorthnd Backend Deployment${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please don't run this script as root${NC}"
   echo -e "${YELLOW}Run as your regular user with sudo privileges${NC}"
   exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Please create .env file from env.production.template${NC}"
    echo -e "cp env.production.template .env"
    echo -e "nano .env"
    exit 1
fi

echo -e "${GREEN}✓ Environment file found${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo -e "${YELLOW}Please install Docker first. See PRODUCTION_DEPLOYMENT_GUIDE.md${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo -e "${YELLOW}Please install Docker Compose first. See PRODUCTION_DEPLOYMENT_GUIDE.md${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Pull latest changes (if git repo)
if [ -d .git ]; then
    echo ""
    echo -e "${YELLOW}Pulling latest changes from git...${NC}"
    git pull origin main || git pull origin master || echo "No changes to pull"
    echo -e "${GREEN}✓ Git pull complete${NC}"
fi

# Stop existing containers
echo ""
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down || true
echo -e "${GREEN}✓ Containers stopped${NC}"

# Build images
echo ""
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache
echo -e "${GREEN}✓ Images built${NC}"

# Start containers
echo ""
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Containers started${NC}"

# Wait for services to be healthy
echo ""
echo -e "${YELLOW}Waiting for services to be healthy (this may take 30-60 seconds)...${NC}"
sleep 10

# Check container status
echo ""
echo -e "${YELLOW}Container status:${NC}"
docker-compose -f docker-compose.prod.yml ps

# Check health of services
echo ""
echo -e "${YELLOW}Checking service health...${NC}"

# Check backend
if curl -f -s http://localhost:5001/ > /dev/null; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
    echo -e "${YELLOW}Check logs: docker-compose -f docker-compose.prod.yml logs backend${NC}"
fi

# Check Prometheus
if curl -f -s http://localhost:9090/-/healthy > /dev/null; then
    echo -e "${GREEN}✓ Prometheus is healthy${NC}"
else
    echo -e "${RED}❌ Prometheus is not responding${NC}"
fi

# Check Loki
if curl -f -s http://localhost:3100/ready > /dev/null; then
    echo -e "${GREEN}✓ Loki is healthy${NC}"
else
    echo -e "${RED}❌ Loki is not responding${NC}"
fi

# Check Grafana
if curl -f -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✓ Grafana is healthy${NC}"
else
    echo -e "${RED}❌ Grafana is not responding${NC}"
fi

# Show logs for a few seconds
echo ""
echo -e "${YELLOW}Recent logs (last 20 lines):${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=20

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "Your services should now be accessible at:"
echo -e "${GREEN}• API:        https://apitest.vikalpshorthand.com${NC}"
echo -e "${GREEN}• Grafana:    https://grafana.vikalpshorthand.com${NC}"
echo -e "${GREEN}• Prometheus: https://prometheus.vikalpshorthand.com${NC}"
echo -e "${GREEN}• Loki:       https://loki.vikalpshorthand.com${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  View logs:         ${YELLOW}docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  View backend logs: ${YELLOW}docker-compose -f docker-compose.prod.yml logs -f backend${NC}"
echo -e "  Restart service:   ${YELLOW}docker-compose -f docker-compose.prod.yml restart backend${NC}"
echo -e "  Stop all:          ${YELLOW}docker-compose -f docker-compose.prod.yml down${NC}"
echo -e "  Container status:  ${YELLOW}docker-compose -f docker-compose.prod.yml ps${NC}"
echo ""
echo -e "${YELLOW}If you encounter any issues, check the logs and refer to PRODUCTION_DEPLOYMENT_GUIDE.md${NC}"

