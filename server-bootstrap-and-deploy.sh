#!/bin/bash

# ======================================================
# Shorthnd - Full Server Bootstrap + Project Deployment
# ======================================================
# This single script combines:
#   1) Fresh server setup (packages, Docker, Nginx, etc.)
#   2) Backend project setup + first deployment via deploy.sh
#
# Usage on a brand-new Ubuntu VPS:
#   # 1) Copy this repo to the server (e.g. to ~/apps/backend)
#   # 2) As root:
#   sudo bash server-bootstrap-and-deploy.sh --server-init
#   # 3) As deploy user, from backend directory:
#   bash server-bootstrap-and-deploy.sh --project-deploy
#
# You can also run:
#   sudo bash server-bootstrap-and-deploy.sh --all
# which will perform server init, then instruct you to run
# the project deploy step as the non-root deploy user.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

install_if_missing() {
  local pkg="$1"
  if dpkg -s "$pkg" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ $pkg already installed${NC}"
  else
    echo -e "${YELLOW}Installing $pkg...${NC}"
    apt install -y "$pkg"
  fi
}

server_init() {
  echo -e "${GREEN}==================================${NC}"
  echo -e "${GREEN}   Shorthnd Server Init Script    ${NC}"
  echo -e "${GREEN}==================================${NC}"
  echo ""

  if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run server-init step as root (e.g. via sudo)${NC}"
    echo -e "${YELLOW}Example: sudo bash server-bootstrap-and-deploy.sh --server-init${NC}"
    exit 1
  fi

  OS_ID=$(grep -E '^ID=' /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')
  if [ "$OS_ID" != "ubuntu" ]; then
    echo -e "${YELLOW}⚠ This script is tested on Ubuntu only. Detected: ${OS_ID}${NC}"
  fi

  echo -e "${YELLOW}Updating system packages...${NC}"
  apt update -y
  apt upgrade -y

  echo ""
  echo -e "${YELLOW}Installing base utilities...${NC}"
  install_if_missing curl
  install_if_missing wget
  install_if_missing git
  install_if_missing vim
  install_if_missing ufw
  install_if_missing software-properties-common
  install_if_missing htop

  echo ""
  echo -e "${YELLOW}Checking Node.js installation...${NC}"
  if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Node.js already installed: $(node -v)${NC}"
  else
    echo -e "${YELLOW}Installing Node.js (LTS) via NodeSource...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    install_if_missing nodejs
    echo -e "${GREEN}✓ Node.js installed: $(node -v)${NC}"
  fi

  echo ""
  echo -e "${YELLOW}Configuring UFW firewall (SSH, HTTP, HTTPS)...${NC}"
  ufw allow 22/tcp || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true

  if ufw status | grep -q "Status: inactive"; then
    echo -e "${YELLOW}Enabling UFW...${NC}"
    yes | ufw enable || true
  fi

  ufw status verbose || true

  echo ""
  echo -e "${YELLOW}Checking Docker installation...${NC}"
  if command -v docker >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker already installed: $(docker --version)${NC}"
  else
    echo -e "${YELLOW}Installing Docker Engine...${NC}"
    apt remove -y docker docker-engine docker.io containerd runc || true

    install_if_missing apt-transport-https
    install_if_missing ca-certificates
    install_if_missing gnupg
    install_if_missing lsb-release

    if [ ! -f /usr/share/keyrings/docker-archive-keyring.gpg ]; then
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    fi

    if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    fi

    apt update -y
    install_if_missing docker-ce
    install_if_missing docker-ce-cli
    install_if_missing containerd.io

    echo -e "${GREEN}✓ Docker installed: $(docker --version)${NC}"
  fi

  echo ""
  echo -e "${YELLOW}Enabling Docker to start on boot...${NC}"
  systemctl enable docker || true
  systemctl start docker || true

  echo ""
  echo -e "${YELLOW}Checking Docker Compose installation...${NC}"
  if command -v docker-compose >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker Compose already installed: $(docker-compose --version)${NC}"
  else
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
      -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed: $(docker-compose --version)${NC}"
  fi

  echo ""
  echo -e "${YELLOW}Installing Nginx...${NC}"
  install_if_missing nginx
  systemctl enable nginx || true
  systemctl start nginx || true
  nginx -v || true

  echo ""
  echo -e "${YELLOW}Installing Certbot (for SSL)...${NC}"
  install_if_missing certbot
  install_if_missing python3-certbot-nginx
  certbot --version || true

  echo ""
  echo -e "${YELLOW}Installing security tools (apache2-utils, fail2ban)...${NC}"
  install_if_missing apache2-utils
  install_if_missing fail2ban

  echo ""
  echo -e "${YELLOW}Enabling Fail2Ban...${NC}"
  systemctl enable fail2ban || true
  systemctl start fail2ban || true

  echo ""
  echo -e "${GREEN}==================================${NC}"
  echo -e "${GREEN}  Server base setup complete!${NC}"
  echo -e "${GREEN}==================================${NC}"
  echo ""
  echo -e "Next steps (recommended):"
  echo -e "  1) Create a non-root deploy user (if you haven't already)."
  echo -e "  2) Add that user to the docker group:"
  echo -e "     ${YELLOW}usermod -aG docker <username>${NC}"
  echo -e "  3) Clone the backend repo under that user (e.g. ~/apps/backend)."
  echo -e "  4) As that user, run:"
  echo -e "     ${YELLOW}bash server-bootstrap-and-deploy.sh --project-deploy${NC}"
  echo ""
}

project_deploy() {
  echo -e "${GREEN}===========================================${NC}"
  echo -e "${GREEN}   Shorthnd Project Setup & Deployment     ${NC}"
  echo -e "${GREEN}===========================================${NC}"
  echo ""

  if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Please do NOT run project-deploy step as root${NC}"
    echo -e "${YELLOW}Run as your regular deploy user (with docker group)${NC}"
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
    echo -e "${YELLOW}Run server-bootstrap-and-deploy.sh --server-init as root first, then add this user to docker group:${NC}"
    echo -e "  sudo usermod -aG docker $USER"
    exit 1
  fi

  echo -e "${YELLOW}Checking Docker Compose...${NC}"
  if ! command -v docker-compose >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo -e "${YELLOW}Run server-bootstrap-and-deploy.sh --server-init as root first.${NC}"
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
      echo -e "${YELLOW}Please edit .env and fill in real production values, then re-run this command.${NC}"
      exit 1
    else
      echo -e "${RED}❌ .env file not found and env.production.template is missing${NC}"
      echo -e "${YELLOW}Create .env manually based on Docs/PRODUCTION_DEPLOYMENT_GUIDE.md${NC}"
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
}

usage() {
  echo "Usage:"
  echo "  sudo bash server-bootstrap-and-deploy.sh --server-init     # server packages, Docker, Nginx, etc."
  echo "  bash server-bootstrap-and-deploy.sh --project-deploy       # run from backend as deploy user"
  echo "  sudo bash server-bootstrap-and-deploy.sh --all             # server init now, then follow instructions for deploy step"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

case "$1" in
  --server-init)
    server_init
    ;;
  --project-deploy)
    project_deploy
    ;;
  --all)
    server_init
    echo -e "${YELLOW}Now switch to your deploy user and run:${NC}"
    echo -e "  ${YELLOW}bash server-bootstrap-and-deploy.sh --project-deploy${NC}"
    ;;
  *)
    usage
    ;;
esac


