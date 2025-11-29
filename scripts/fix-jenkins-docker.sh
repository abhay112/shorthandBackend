#!/bin/bash

# ================================================
# Fix Docker Compose for Jenkins
# ================================================
# This script fixes the docker-compose snap issue in Jenkins
# Run this on your Jenkins server

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Fix Docker Compose for Jenkins${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Option 1: Install Docker Compose as standalone binary (recommended)
echo -e "${YELLOW}[1/3] Installing Docker Compose standalone...${NC}"
if ! command -v docker-compose &> /dev/null || docker-compose --version | grep -q snap; then
    # Remove snap version if exists
    if command -v docker-compose &> /dev/null; then
        echo "Removing snap docker-compose..."
        snap remove docker 2>/dev/null || true
    fi
    
    # Install Docker Compose standalone
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Verify
    /usr/local/bin/docker-compose --version
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed (not snap)${NC}"
fi
echo ""

# Option 2: Configure snap to allow /var/lib/jenkins (alternative)
echo -e "${YELLOW}[2/3] Configuring snap for Jenkins workspace...${NC}"
if command -v snap &> /dev/null; then
    # Allow snap to access /var/lib/jenkins
    snap set system home=/var/lib/jenkins 2>/dev/null || echo "⚠️ Could not configure snap home"
    echo -e "${GREEN}✓ Snap configured${NC}"
else
    echo -e "${YELLOW}⚠ Snap not installed, skipping${NC}"
fi
echo ""

# Option 3: Ensure Jenkins user can use Docker
echo -e "${YELLOW}[3/3] Ensuring Jenkins user can use Docker...${NC}"
if id "jenkins" &>/dev/null; then
    usermod -aG docker jenkins
    echo -e "${GREEN}✓ Jenkins user added to docker group${NC}"
    
    # Restart Jenkins
    systemctl restart jenkins
    echo -e "${GREEN}✓ Jenkins restarted${NC}"
else
    echo -e "${YELLOW}⚠ Jenkins user not found${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Docker Compose Fix Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Verify installation:${NC}"
echo -e "  ${BLUE}docker-compose --version${NC}"
echo -e "  ${BLUE}sudo -u jenkins docker-compose --version${NC}"
echo ""

