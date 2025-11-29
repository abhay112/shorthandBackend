#!/bin/bash

# =================================
# Shorthnd - Fresh Server Bootstrap
# =================================
# Use this on a brand‑new Ubuntu VPS (20.04+)
# It will:
#   - Update the system
#   - Install core tools (curl, git, ufw, etc.)
#   - Install & configure Docker + Docker Compose
#   - Install Nginx + Certbot
#   - Install basic security tools (Fail2Ban, apache2-utils)
# All steps are idempotent: it checks before installing.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}   Shorthnd Server Init Script    ${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Require root (this script configures system packages, firewall, users, etc.)
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run this script as root (e.g. via sudo)${NC}"
  echo -e "${YELLOW}Example: sudo bash server-init.sh${NC}"
  exit 1
fi

OS_ID=$(grep -E '^ID=' /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')
if [ "$OS_ID" != "ubuntu" ]; then
  echo -e "${YELLOW}⚠ This script is tested on Ubuntu only. Detected: ${OS_ID}${NC}"
fi

echo -e "${YELLOW}Updating system packages...${NC}"
apt update -y
apt upgrade -y

install_if_missing() {
  local pkg="$1"
  if dpkg -s "$pkg" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ $pkg already installed${NC}"
  else
    echo -e "${YELLOW}Installing $pkg...${NC}"
    apt install -y "$pkg"
  fi
}

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
  # Remove old versions if any
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
echo -e "  4) Run ${YELLOW}server-project-setup.sh${NC} from inside the backend folder."
echo ""


