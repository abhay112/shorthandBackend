#!/bin/bash

# ================================================
# Local Jenkins Testing Script
# ================================================
# This script helps test Jenkins setup locally
# Usage: ./scripts/test-jenkins-local.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Jenkins Local Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Jenkins is running
echo -e "${YELLOW}[1/5] Checking Jenkins status...${NC}"
if systemctl is-active --quiet jenkins; then
    echo -e "${GREEN}✓ Jenkins is running${NC}"
else
    echo -e "${RED}❌ Jenkins is not running${NC}"
    echo -e "${YELLOW}Start it with: sudo systemctl start jenkins${NC}"
    exit 1
fi
echo ""

# Check Jenkins port
echo -e "${YELLOW}[2/5] Checking Jenkins port (8080)...${NC}"
if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Jenkins is accessible on port 8080${NC}"
    echo -e "${BLUE}   URL: http://localhost:8080${NC}"
else
    echo -e "${YELLOW}⚠ Jenkins might not be fully started yet${NC}"
fi
echo ""

# Check Docker access for Jenkins user
echo -e "${YELLOW}[3/5] Checking Docker access for Jenkins user...${NC}"
if sudo -u jenkins docker ps > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Jenkins user can access Docker${NC}"
else
    echo -e "${RED}❌ Jenkins user cannot access Docker${NC}"
    echo -e "${YELLOW}Fix with: sudo usermod -aG docker jenkins && sudo systemctl restart jenkins${NC}"
fi
echo ""

# Check if MongoDB is running (for tests)
echo -e "${YELLOW}[4/5] Checking MongoDB for tests...${NC}"
if docker ps | grep -q mongo || docker ps | grep -q mongodb; then
    echo -e "${GREEN}✓ MongoDB container is running${NC}"
elif nc -z localhost 27017 2>/dev/null; then
    echo -e "${GREEN}✓ MongoDB is accessible on port 27017${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB not found. Start it with:${NC}"
    echo -e "${BLUE}   docker run -d --name test-mongodb -p 27017:27017 mongo:7${NC}"
fi
echo ""

# Check Jenkinsfile exists
echo -e "${YELLOW}[5/5] Checking Jenkinsfile...${NC}"
if [ -f "Jenkinsfile" ]; then
    echo -e "${GREEN}✓ Jenkinsfile exists${NC}"
else
    echo -e "${RED}❌ Jenkinsfile not found${NC}"
    exit 1
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Local Testing Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Open Jenkins: ${BLUE}http://localhost:8080${NC}"
echo -e "2. Create a new Pipeline job"
echo -e "3. Configure it to use Jenkinsfile from SCM"
echo -e "4. Run the pipeline"
echo ""
echo -e "${YELLOW}To get Jenkins admin password:${NC}"
echo -e "  ${BLUE}sudo cat /var/lib/jenkins/secrets/initialAdminPassword${NC}"
echo ""

