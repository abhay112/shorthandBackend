#!/bin/bash

# ================================================
# Jenkins Setup Script for Hostinger VPS
# ================================================
# This script installs Jenkins, Docker, and Docker Compose on Hostinger VPS
# Usage: sudo ./scripts/setup-jenkins-hostinger.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Jenkins Setup for Hostinger VPS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Step 1: Update system
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Step 2: Install Java
echo -e "${YELLOW}[2/8] Installing Java 17...${NC}"
apt install -y openjdk-17-jdk
java -version
echo -e "${GREEN}✓ Java installed${NC}"
echo ""

# Step 3: Add Jenkins repository
echo -e "${YELLOW}[3/8] Adding Jenkins repository...${NC}"
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

apt update
echo -e "${GREEN}✓ Jenkins repository added${NC}"
echo ""

# Step 4: Install Jenkins
echo -e "${YELLOW}[4/8] Installing Jenkins...${NC}"
apt install -y jenkins
echo -e "${GREEN}✓ Jenkins installed${NC}"
echo ""

# Step 5: Start Jenkins
echo -e "${YELLOW}[5/8] Starting Jenkins service...${NC}"
systemctl start jenkins
systemctl enable jenkins
echo -e "${GREEN}✓ Jenkins started${NC}"
echo ""

# Step 6: Install Docker
echo -e "${YELLOW}[6/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi
docker --version
echo ""

# Step 7: Install Docker Compose
echo -e "${YELLOW}[7/8] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi
docker-compose --version
echo ""

# Step 8: Configure Jenkins user for Docker
echo -e "${YELLOW}[8/8] Configuring Jenkins user for Docker...${NC}"
usermod -aG docker jenkins
systemctl restart jenkins
echo -e "${GREEN}✓ Jenkins user added to docker group${NC}"
echo ""

# Get initial admin password
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Jenkins Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Initial Admin Password:${NC}"
echo -e "${GREEN}$(cat /var/lib/jenkins/secrets/initialAdminPassword)${NC}"
echo ""
echo -e "${YELLOW}Jenkins URL:${NC}"
echo -e "${BLUE}http://$(hostname -I | awk '{print $1}'):8080${NC}"
echo -e "${BLUE}or${NC}"
echo -e "${BLUE}http://your-domain.com:8080${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Open Jenkins URL in browser"
echo -e "2. Enter the password above"
echo -e "3. Install suggested plugins"
echo -e "4. Create admin user"
echo -e "5. Install additional plugins:"
echo -e "   - Docker Pipeline"
echo -e "   - Docker"
echo -e "   - Git"
echo -e "   - Pipeline"
echo ""
echo -e "${YELLOW}Verify Docker access:${NC}"
echo -e "  sudo -u jenkins docker ps"
echo -e "  sudo -u jenkins docker-compose --version"
echo ""

