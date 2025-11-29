#!/bin/bash

# ==========================================
# Shorthnd - Project Setup & First Deploy
# ==========================================
# Run this script as your non-root deploy user
# *after* cloning the backend repo on the server.
#
# It will:
#   - Ensure Docker & Docker Compose are available
#   - Create ~/apps directory structure if needed
#   - Optionally move this project into ~/apps/backend
#   - Check for .env and docker-compose.prod.yml
#   - Run ./deploy.sh to build & start services

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}   Shorthnd Project Setup & Deployment     ${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""

if [ "$EUID" -eq 0 ]; then
  echo -e "${RED}❌ Please do NOT run this script as root${NC}"
  echo -e "${YELLOW}Run as your regular deploy user (with sudo for Docker if needed)${NC}"
  exit 1
fi

if [ ! -f "./deploy.sh" ]; then
  echo -e "${RED}❌ deploy.sh not found in current directory${NC}"
  echo -e "${YELLOW}Please run this script from the backend project root (where deploy.sh is).${NC}"
  exit 1
fi

echo -e "${YELLOW}Checking Docker...${NC}"
if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not installed or not in PATH for this user${NC}"
  echo -e "${YELLOW}Run server-init.sh as root first, then add this user to docker group:${NC}"
  echo -e "  sudo usermod -aG docker $USER"
  exit 1
fi

echo -e "${YELLOW}Checking Docker Compose...${NC}"
if ! command -v docker-compose >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker Compose is not installed${NC}"
  echo -e "${YELLOW}Run server-init.sh as root first to install Docker Compose.${NC}"
  exit 1
fi

APPS_DIR="$HOME/apps"
if [ ! -d "$APPS_DIR" ]; then
  echo -e "${YELLOW}Creating apps directory at ${APPS_DIR}...${NC}"
  mkdir -p "$APPS_DIR"
fi

echo -e "${YELLOW}Verifying environment file (.env)...${NC}"
if [ ! -f ".env" ]; then
  if [ -f "env.production.template" ]; then
    echo -e "${YELLOW}.env not found, creating from env.production.template...${NC}"
    cp env.production.template .env
    echo -e "${YELLOW}Please edit .env and fill in real production values before running again.${NC}"
    exit 1
  else
    echo -e "${RED}❌ .env file not found and env.production.template is missing${NC}"
    echo -e "${YELLOW}Create .env manually based on the values in Docs/PRODUCTION_DEPLOYMENT_GUIDE.md${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ .env file found${NC}"
fi

echo -e "${YELLOW}Checking docker-compose.prod.yml...${NC}"
if [ ! -f "docker-compose.prod.yml" ]; then
  echo -e "${RED}❌ docker-compose.prod.yml not found${NC}"
  echo -e "${YELLOW}Create it based on Docs/PRODUCTION_DEPLOYMENT_GUIDE.md (section: 'Update Docker Compose for Production')${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Running production deployment (./deploy.sh)...${NC}"
chmod +x ./deploy.sh || true
./deploy.sh

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}   Project setup & deployment complete!    ${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""


