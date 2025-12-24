#!/bin/bash

# ==========================================
# One-Click Deployment Script
# Shorthand Backend with Nginx Reverse Proxy
# ==========================================
# This script provides complete automated deployment:
#   - Docker & Docker Compose installation
#   - Monitoring stack (Grafana, Prometheus, Loki)
#   - Backend API deployment
#   - Nginx reverse proxy configuration
#   - SSL certificates setup
#
# Usage: sudo bash scripts/deploy.sh
# ==========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
BACKEND_DOMAIN="${BACKEND_DOMAIN:-api.vikalpshorthand.com}"
GRAFANA_DOMAIN="${GRAFANA_DOMAIN:-grafana.vikalpshorthand.com}"
PROMETHEUS_DOMAIN="${PROMETHEUS_DOMAIN:-prometheus.vikalpshorthand.com}"
LOKI_DOMAIN="${LOKI_DOMAIN:-loki.vikalpshorthand.com}"

# Ports
BACKEND_PORT="5001"
GRAFANA_PORT="3001"
PROMETHEUS_PORT="9090"
LOKI_PORT="3100"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Error handler
error_exit() {
    log_error "$1"
    log_warning "Deployment failed. Check logs above for details."
    exit 1
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error_exit "This script must be run as root (use sudo)"
    fi
}

# Check OS compatibility
check_os() {
    if [ ! -f /etc/os-release ]; then
        error_exit "Cannot detect OS. This script requires Ubuntu 20.04+"
    fi
    
    OS_ID=$(grep -E '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
    OS_VERSION=$(grep -E '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
    
    if [ "$OS_ID" != "ubuntu" ]; then
        log_warning "This script is tested on Ubuntu. Detected: $OS_ID"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "OS detected: $OS_ID $OS_VERSION"
}

# Install package if missing (with retry)
install_if_missing() {
    local pkg="$1"
    local max_retries=3
    local retry=0
    
    if dpkg -s "$pkg" >/dev/null 2>&1; then
        log_success "$pkg is already installed"
        return 0
    fi
    
    while [ $retry -lt $max_retries ]; do
        log_info "Installing $pkg (attempt $((retry + 1))/$max_retries)..."
        if apt-get install -y "$pkg" >/dev/null 2>&1; then
            log_success "$pkg installed successfully"
            return 0
        fi
        retry=$((retry + 1))
        if [ $retry -lt $max_retries ]; then
            log_warning "Installation failed, retrying in 2 seconds..."
            sleep 2
        fi
    done
    
    error_exit "Failed to install $pkg after $max_retries attempts"
}

# Update system packages
update_system() {
    log_step "Step 1: Updating System Packages"
    
    log_info "Updating package lists..."
    if ! apt-get update -y >/dev/null 2>&1; then
        error_exit "Failed to update package lists"
    fi
    
    log_info "Upgrading system packages (this may take a while)..."
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y >/dev/null 2>&1 || true
    
    log_success "System packages updated"
}

# Install base utilities
install_base_utilities() {
    log_step "Step 2: Installing Base Utilities"
    
    local packages=(
        "curl"
        "wget"
        "git"
        "ufw"
        "software-properties-common"
        "apt-transport-https"
        "ca-certificates"
        "gnupg"
        "lsb-release"
        "jq"
        "lsof"
    )
    
    for pkg in "${packages[@]}"; do
        install_if_missing "$pkg"
    done
    
    log_success "Base utilities installed"
}

# Configure firewall
configure_firewall() {
    log_step "Step 3: Configuring Firewall"
    
    log_info "Configuring UFW firewall rules..."
    ufw allow 22/tcp comment 'SSH' || true
    ufw allow 80/tcp comment 'HTTP' || true
    ufw allow 443/tcp comment 'HTTPS' || true
    
    if ufw status | grep -q "Status: inactive"; then
        log_info "Enabling UFW firewall..."
        echo "y" | ufw enable || true
    fi
    
    log_success "Firewall configured"
}

# Install Docker
install_docker() {
    log_step "Step 4: Installing Docker"
    
    if command -v docker >/dev/null 2>&1; then
        log_success "Docker already installed: $(docker --version)"
        return 0
    fi
    
    log_info "Removing old Docker versions if any..."
    apt-get remove -y docker docker-engine docker.io containerd runc >/dev/null 2>&1 || true
    
    log_info "Adding Docker's official GPG key..."
    if [ ! -f /usr/share/keyrings/docker-archive-keyring.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
            gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    fi
    
    log_info "Adding Docker repository..."
    if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
        echo \
            "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
            https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
            > /etc/apt/sources.list.d/docker.list
    fi
    
    apt-get update -y >/dev/null 2>&1
    
    log_info "Installing Docker Engine..."
    install_if_missing docker-ce
    install_if_missing docker-ce-cli
    install_if_missing containerd.io
    install_if_missing docker-buildx-plugin
    install_if_missing docker-compose-plugin
    
    log_info "Starting Docker service..."
    systemctl enable docker >/dev/null 2>&1
    systemctl start docker >/dev/null 2>&1
    
    # Wait for Docker to be ready
    local retries=0
    while [ $retries -lt 10 ]; do
        if docker info >/dev/null 2>&1; then
            break
        fi
        retries=$((retries + 1))
        sleep 1
    done
    
    if [ $retries -eq 10 ]; then
        error_exit "Docker service failed to start"
    fi
    
    log_success "Docker installed and running: $(docker --version)"
}

# Install Docker Compose
install_docker_compose() {
    log_step "Step 5: Installing Docker Compose"
    
    if command -v docker-compose >/dev/null 2>&1; then
        log_success "Docker Compose already installed: $(docker-compose --version)"
        return 0
    fi
    
    log_info "Downloading Docker Compose..."
    local compose_version=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
    curl -L "https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    
    chmod +x /usr/local/bin/docker-compose
    
    # Verify installation
    if ! docker-compose --version >/dev/null 2>&1; then
        error_exit "Docker Compose installation verification failed"
    fi
    
    log_success "Docker Compose installed: $(docker-compose --version)"
}

# Install Nginx
install_nginx() {
    log_step "Step 6: Installing Nginx"
    
    install_if_missing nginx
    
    log_info "Creating Nginx directories..."
    mkdir -p "$NGINX_SITES_AVAILABLE"
    mkdir -p "$NGINX_SITES_ENABLED"
    
    log_info "Starting Nginx service..."
    systemctl enable nginx >/dev/null 2>&1
    systemctl start nginx >/dev/null 2>&1 || true
    
    log_success "Nginx installed: $(nginx -v 2>&1 | cut -d/ -f2)"
}

# Install Certbot
install_certbot() {
    log_step "Step 7: Installing Certbot"
    
    install_if_missing certbot
    install_if_missing python3-certbot-nginx
    
    log_success "Certbot installed: $(certbot --version 2>&1 | head -1)"
}

# Verify project files
verify_project_files() {
    log_step "Step 8: Verifying Project Files"
    
    local required_files=(
        "docker-compose.prod.yml"
        "Dockerfile"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "Missing required files:"
        for file in "${missing_files[@]}"; do
            log_error "  - $file"
        done
        error_exit "Please ensure all required files are present in the project directory"
    fi
    
    # Check for prometheus.yml - create symlink if needed
    if [ ! -f "$PROJECT_ROOT/prometheus.yml" ]; then
        if [ -f "$PROJECT_ROOT/monitoring/prometheus/prometheus.yml" ]; then
            log_info "Creating symlink for prometheus.yml..."
            ln -sf "$PROJECT_ROOT/monitoring/prometheus/prometheus.yml" "$PROJECT_ROOT/prometheus.yml"
            log_success "Prometheus config symlink created"
        else
            log_warning "prometheus.yml not found, creating default..."
            cat > "$PROJECT_ROOT/prometheus.yml" <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ['prometheus:9090']

  - job_name: shorthnd-backend
    metrics_path: /metrics
    static_configs:
      - targets:
          - 'backend:5001'
EOF
            log_success "Default prometheus.yml created"
        fi
    fi
    
    # Check for .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        if [ -f "$PROJECT_ROOT/env.production.template" ]; then
            log_warning ".env file not found"
            log_info "Creating .env from template..."
            cp "$PROJECT_ROOT/env.production.template" "$PROJECT_ROOT/.env"
            log_warning "Please edit .env file with your production values before continuing"
            read -p "Press Enter after editing .env file (or Ctrl+C to exit)..."
        else
            error_exit ".env file not found and no template available"
        fi
    fi
    
    log_success "Project files verified"
}

# Check if port is in use
is_port_in_use() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    elif command -v ss >/dev/null 2>&1; then
        ss -lnt | grep -q ":$port "
    elif command -v netstat >/dev/null 2>&1; then
        netstat -lnt | grep -q ":$port "
    else
        # Fallback: try to bind to the port
        timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/$port" 2>/dev/null
    fi
}

# Get process ID using port
get_port_pid() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti :$port 2>/dev/null || echo ""
    elif command -v ss >/dev/null 2>&1; then
        ss -lntp | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1 || echo ""
    elif command -v netstat >/dev/null 2>&1; then
        netstat -lntp 2>/dev/null | grep ":$port " | grep -oP '\d+/\w+' | cut -d'/' -f1 | head -1 || echo ""
    else
        echo ""
    fi
}

# Check and free up ports
check_and_free_ports() {
    log_step "Step 9: Checking and Freeing Ports"
    
    local ports=("$BACKEND_PORT" "$GRAFANA_PORT" "$PROMETHEUS_PORT" "$LOKI_PORT")
    local port_names=("Backend" "Grafana" "Prometheus" "Loki")
    
    # First, try to stop existing docker-compose services
    cd "$PROJECT_ROOT" || error_exit "Failed to change to project directory"
    
    log_info "Stopping existing Docker containers..."
    # Try docker compose (v2) first, then docker-compose (v1)
    if docker compose version >/dev/null 2>&1; then
        docker compose -f docker-compose.prod.yml down 2>/dev/null || true
    else
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    fi
    
    # Also remove containers by name
    log_info "Removing existing containers..."
    docker rm -f shorthnd-backend shorthnd-prometheus shorthnd-loki shorthnd-grafana 2>/dev/null || true
    
    # Wait a moment for ports to be released
    sleep 3
    
    # Check each port
    for i in "${!ports[@]}"; do
        local port="${ports[$i]}"
        local name="${port_names[$i]}"
        
        # Check if port is in use
        if is_port_in_use "$port"; then
            log_warning "Port $port ($name) is in use"
            
            # Try to find and kill the process
            local pid=$(get_port_pid "$port")
            if [ -n "$pid" ] && [ "$pid" != "0" ]; then
                log_info "Found process $pid using port $port"
                
                # Check if it's a docker container
                local container_id=$(docker ps --format "{{.ID}}" --filter "publish=$port" 2>/dev/null | head -1)
                if [ -n "$container_id" ]; then
                    log_info "Stopping Docker container $container_id using port $port..."
                    docker stop "$container_id" 2>/dev/null || true
                    docker rm -f "$container_id" 2>/dev/null || true
                else
                    log_info "Killing process $pid using port $port..."
                    kill -9 $pid 2>/dev/null || true
                fi
                
                sleep 2
                
                # Verify port is free
                if is_port_in_use "$port"; then
                    log_error "Port $port is still in use after attempting to free it"
                    log_error "Please manually stop the process using: sudo lsof -i :$port"
                    error_exit "Port $port conflict could not be resolved"
                else
                    log_success "Port $port freed successfully"
                fi
            else
                log_warning "Could not identify process using port $port"
                log_warning "Port may be in use by system. Please check manually: sudo lsof -i :$port"
            fi
        else
            log_success "Port $port ($name) is available"
        fi
    done
    
    log_success "Ports checked and freed"
}

# Get docker compose command (v2 or v1)
get_docker_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    else
        echo "docker-compose"
    fi
}

# Deploy monitoring stack
deploy_monitoring_stack() {
    log_step "Step 10: Deploying Monitoring Stack"
    
    cd "$PROJECT_ROOT" || error_exit "Failed to change to project directory"
    
    local compose_cmd=$(get_docker_compose_cmd)
    
    # Check if services are already running
    local services_running=false
    if $compose_cmd -f docker-compose.prod.yml ps 2>/dev/null | grep -q "Up"; then
        services_running=true
        log_info "Existing services detected. Performing update..."
    fi
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    $compose_cmd -f docker-compose.prod.yml pull || log_warning "Some images failed to pull (may use cached versions)"
    
    # Start services
    if [ "$services_running" = true ]; then
        log_info "Updating services..."
        $compose_cmd -f docker-compose.prod.yml up -d
    else
        log_info "Starting services for the first time..."
        $compose_cmd -f docker-compose.prod.yml up -d
    fi
    
    # Wait for all services to be healthy
    log_info "Waiting for services to be healthy..."
    wait_for_service "Loki" "$LOKI_PORT" "/ready" 60
    wait_for_service "Prometheus" "$PROMETHEUS_PORT" "/-/healthy" 60
    wait_for_service "Grafana" "$GRAFANA_PORT" "/api/health" 90
    wait_for_service "Backend API" "$BACKEND_PORT" "/" 90
    
    log_success "Monitoring stack deployed"
}

# Wait for service to be healthy
wait_for_service() {
    local service_name="$1"
    local port="$2"
    local health_path="${3:-/}"
    local max_wait="${4:-60}"
    local waited=0
    
    log_info "Waiting for $service_name to be healthy..."
    
    while [ $waited -lt $max_wait ]; do
        if curl -sf "http://127.0.0.1:$port$health_path" >/dev/null 2>&1; then
            log_success "$service_name is healthy"
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
        echo -n "."
    done
    
    echo ""
    log_warning "$service_name health check timeout (waited ${max_wait}s)"
    return 1
}

# Create Nginx config file
create_nginx_config() {
    local domain="$1"
    local port="$2"
    local config_name="$3"
    local extra_config="${4:-}"
    
    local config_file="$NGINX_SITES_AVAILABLE/$domain"
    
    if [ -f "$config_file" ]; then
        log_warning "Nginx config for $domain already exists: $config_file"
        log_info "Skipping creation (to recreate, delete the file first)"
        return 0
    fi
    
    log_info "Creating Nginx config for $domain..."
    
    cat > "$config_file" <<EOF
# $config_name Nginx Configuration
# Domain: $domain
# Backend: http://127.0.0.1:$port
# Generated by deploy.sh

server {
    server_name $domain;

    location / {
        proxy_pass http://127.0.0.1:$port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
$extra_config
    }

    listen 80;
}
EOF
    
    log_success "Created Nginx config: $config_file"
}

# Create backend API config
create_backend_config() {
    create_nginx_config "$BACKEND_DOMAIN" "$BACKEND_PORT" "Backend API"
}

# Create Grafana config
create_grafana_config() {
    local extra_config="        # WebSocket support for Grafana
        proxy_set_header Connection \"upgrade\";
        proxy_read_timeout 86400;"
    
    create_nginx_config "$GRAFANA_DOMAIN" "$GRAFANA_PORT" "Grafana" "$extra_config"
}

# Create Prometheus config
create_prometheus_config() {
    local extra_config="        # Prometheus specific settings
        proxy_read_timeout 300;
        proxy_connect_timeout 75;"
    
    create_nginx_config "$PROMETHEUS_DOMAIN" "$PROMETHEUS_PORT" "Prometheus" "$extra_config"
}

# Create Loki config
create_loki_config() {
    local extra_config="        # Loki specific settings
        proxy_read_timeout 300;
        proxy_connect_timeout 75;"
    
    create_nginx_config "$LOKI_DOMAIN" "$LOKI_PORT" "Loki" "$extra_config"
}

# Enable Nginx site
enable_nginx_site() {
    local domain="$1"
    local config_file="$NGINX_SITES_AVAILABLE/$domain"
    local symlink="$NGINX_SITES_ENABLED/$domain"
    
    if [ ! -f "$config_file" ]; then
        log_error "Config file not found: $config_file"
        return 1
    fi
    
    if [ -L "$symlink" ]; then
        log_info "Site $domain is already enabled"
        return 0
    fi
    
    log_info "Enabling site: $domain"
    ln -sf "$config_file" "$symlink"
    log_success "Enabled site: $domain"
}

# Test Nginx configuration
test_nginx_config() {
    log_info "Testing Nginx configuration..."
    if nginx -t >/dev/null 2>&1; then
        log_success "Nginx configuration is valid"
        return 0
    else
        log_error "Nginx configuration has errors"
        return 1
    fi
}

# Reload Nginx
reload_nginx() {
    log_info "Reloading Nginx..."
    if systemctl reload nginx >/dev/null 2>&1; then
        log_success "Nginx reloaded successfully"
    else
        log_error "Failed to reload Nginx"
        return 1
    fi
}

# Setup SSL certificate
setup_ssl_certificate() {
    local domain="$1"
    
    # Check if certificate already exists
    if [ -d "/etc/letsencrypt/live/$domain" ]; then
        log_info "SSL certificate for $domain already exists"
        return 0
    fi
    
    log_info "Setting up SSL certificate for $domain..."
    
    # Check if domain resolves
    if ! host "$domain" >/dev/null 2>&1; then
        log_warning "Domain $domain does not resolve. Skipping..."
        return 1
    fi
    
    # Run certbot
    if certbot --nginx -d "$domain" --non-interactive --agree-tos --redirect 2>&1 | tee /tmp/certbot-$domain.log; then
        log_success "SSL certificate installed for $domain"
        return 0
    else
        log_warning "Failed to install SSL certificate for $domain"
        log_warning "You may need to run manually: sudo certbot --nginx -d $domain"
        return 1
    fi
}

# Setup Nginx configurations
setup_nginx_configs() {
    log_step "Step 11: Setting Up Nginx Configurations"
    
    # Create configurations
    log_info "Creating Nginx configurations..."
    create_backend_config
    create_grafana_config
    create_prometheus_config
    create_loki_config
    
    # Enable sites
    log_info "Enabling Nginx sites..."
    enable_nginx_site "$BACKEND_DOMAIN"
    enable_nginx_site "$GRAFANA_DOMAIN"
    enable_nginx_site "$PROMETHEUS_DOMAIN"
    enable_nginx_site "$LOKI_DOMAIN"
    
    # Test and reload
    if test_nginx_config; then
        reload_nginx
        log_success "Nginx configurations created and enabled"
    else
        error_exit "Nginx configuration test failed"
    fi
}

# Setup SSL certificates (optional)
setup_ssl_certificates() {
    log_step "Step 12: Setting Up SSL Certificates"
    
    log_warning "SSL certificate setup requires:"
    log_warning "  1. DNS records pointing to this server"
    log_warning "  2. Port 80 accessible from internet"
    log_warning "  3. Valid email for Let's Encrypt"
    echo ""
    
    read -p "Do you want to set up SSL certificates now? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Skipping SSL setup. You can run it later with:"
        log_info "  sudo certbot --nginx -d $BACKEND_DOMAIN"
        log_info "  sudo certbot --nginx -d $GRAFANA_DOMAIN"
        log_info "  sudo certbot --nginx -d $PROMETHEUS_DOMAIN"
        log_info "  sudo certbot --nginx -d $LOKI_DOMAIN"
        return 0
    fi
    
    local domains=("$BACKEND_DOMAIN" "$GRAFANA_DOMAIN" "$PROMETHEUS_DOMAIN" "$LOKI_DOMAIN")
    
    for domain in "${domains[@]}"; do
        setup_ssl_certificate "$domain" || true
    done
    
    # Reload Nginx after SSL setup
    reload_nginx
    
    log_success "SSL certificate setup completed"
}

# Verify deployment
verify_deployment() {
    log_step "Step 13: Verifying Deployment"
    
    local all_healthy=true
    
    # Check services
    log_info "Checking service health..."
    check_service_health "Backend API" "$BACKEND_PORT" "/" || all_healthy=false
    check_service_health "Grafana" "$GRAFANA_PORT" "/api/health" || all_healthy=false
    check_service_health "Prometheus" "$PROMETHEUS_PORT" "/-/healthy" || all_healthy=false
    check_service_health "Loki" "$LOKI_PORT" "/ready" || all_healthy=false
    
    # Check Nginx
    log_info "Checking Nginx configuration..."
    if nginx -t >/dev/null 2>&1; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration has errors"
        all_healthy=false
    fi
    
    # Check Docker containers
    log_info "Checking Docker containers..."
    local compose_cmd=$(get_docker_compose_cmd)
    if $compose_cmd -f docker-compose.prod.yml ps 2>/dev/null | grep -q "Up"; then
        log_success "All Docker containers are running"
    else
        log_warning "Some Docker containers may not be running"
        $compose_cmd -f docker-compose.prod.yml ps
    fi
    
    if [ "$all_healthy" = true ]; then
        log_success "Deployment verification passed"
    else
        log_warning "Some services may not be fully healthy. Check logs above."
    fi
}

# Check service health
check_service_health() {
    local service_name="$1"
    local port="$2"
    local health_path="${3:-/}"
    
    if curl -sf "http://127.0.0.1:$port$health_path" >/dev/null 2>&1; then
        log_success "$service_name is healthy"
        return 0
    else
        log_warning "$service_name health check failed"
        return 1
    fi
}

# Print summary
print_summary() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Deployment Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    log_success "All services have been deployed and configured"
    echo ""
    
    echo "Access URLs:"
    echo "  - Backend API:  http://$BACKEND_DOMAIN (or https:// if SSL configured)"
    echo "  - Grafana:      http://$GRAFANA_DOMAIN (or https:// if SSL configured)"
    echo "  - Prometheus:   http://$PROMETHEUS_DOMAIN (or https:// if SSL configured)"
    echo "  - Loki:         http://$LOKI_DOMAIN (or https:// if SSL configured)"
    echo ""
    
    local compose_cmd=$(get_docker_compose_cmd)
    echo "Useful commands:"
    echo "  - View logs:        $compose_cmd -f docker-compose.prod.yml logs -f"
    echo "  - Restart services:  $compose_cmd -f docker-compose.prod.yml restart"
    echo "  - Stop services:     $compose_cmd -f docker-compose.prod.yml down"
    echo "  - View status:       $compose_cmd -f docker-compose.prod.yml ps"
    echo ""
}

# Main function
main() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║     One-Click Deployment Script                        ║${NC}"
    echo -e "${GREEN}║     Shorthand Backend + Monitoring + Nginx               ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    check_root
    check_os
    
    # Run setup steps
    update_system
    install_base_utilities
    configure_firewall
    install_docker
    install_docker_compose
    install_nginx
    install_certbot
    verify_project_files
    check_and_free_ports
    deploy_monitoring_stack
    setup_nginx_configs
    setup_ssl_certificates
    verify_deployment
    
    # Print summary
    print_summary
}

# Run main function
main "$@"

