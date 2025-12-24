#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
SETUP_NGINX="${SETUP_NGINX:-false}"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
BACKEND_DOMAIN="${BACKEND_DOMAIN:-api.vikalpshorthand.com}"
GRAFANA_DOMAIN="${GRAFANA_DOMAIN:-grafana.vikalpshorthand.com}"
PROMETHEUS_DOMAIN="${PROMETHEUS_DOMAIN:-prometheus.vikalpshorthand.com}"
LOKI_DOMAIN="${LOKI_DOMAIN:-loki.vikalpshorthand.com}"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if port is in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warn "Port $port is already in use by $service"
        return 1
    fi
    return 0
}

# Stop and remove existing containers
cleanup() {
    log_info "Cleaning up existing containers..."
    
    cd "$SCRIPT_DIR"
    
    # Stop containers
    docker-compose -f docker-compose.yml down 2>/dev/null || true
    
    # Remove containers if they exist
    docker rm -f shorthnd-backend shorthnd-prometheus shorthnd-loki shorthnd-grafana 2>/dev/null || true
    
    # Wait a moment
    sleep 2
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check ports
    check_port 5001 "backend" || {
        log_warn "Port 5001 is in use. Attempting to free it..."
        PID=$(lsof -t -i:5001 2>/dev/null || echo "")
        if [ -n "$PID" ]; then
            log_warn "Killing process $PID on port 5001"
            kill -9 $PID 2>/dev/null || true
            sleep 2
        fi
    }
    
    check_port 9090 "prometheus" || log_warn "Port 9090 is in use"
    check_port 3100 "loki" || log_warn "Port 3100 is in use"
    check_port 3001 "grafana" || log_warn "Port 3001 is in use"
    
    # Check .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warn ".env file not found. Creating from template..."
        if [ -f "$PROJECT_ROOT/env.production.template" ]; then
            cp "$PROJECT_ROOT/env.production.template" "$PROJECT_ROOT/.env"
            log_warn "Please edit .env file with your actual values"
        else
            log_error ".env file not found and no template available"
            exit 1
        fi
    fi
}

# Wait for service to be healthy
wait_for_service() {
    local service=$1
    local port=$2
    local path=${3:-/}
    local max_attempts=${4:-30}
    local attempt=0
    
    log_info "Waiting for $service to be ready..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "http://127.0.0.1:$port$path" >/dev/null 2>&1; then
            log_info "$service is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    log_error "$service failed to start after $((max_attempts * 2)) seconds"
    return 1
}

# Start services
start_services() {
    log_info "Starting monitoring services..."
    
    cd "$SCRIPT_DIR"
    
    # Start services
    docker-compose -f docker-compose.yml up -d
    
    log_info "Services starting... waiting for containers to be ready"
    sleep 5
}

# Verify services
verify_services() {
    log_info "Verifying services..."
    
    # Check containers are running
    local containers=("shorthnd-backend" "shorthnd-prometheus" "shorthnd-loki" "shorthnd-grafana")
    local all_running=true
    
    for container in "${containers[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
            log_info "✓ $container is running"
        else
            log_error "✗ $container is NOT running"
            all_running=false
        fi
    done
    
    if [ "$all_running" = false ]; then
        log_error "Some containers failed to start. Check logs:"
        log_error "docker-compose -f monitoring/docker-compose.yml logs"
        return 1
    fi
    
    # Check network connectivity
    log_info "Checking network connectivity..."
    
    if docker exec shorthnd-prometheus nslookup backend >/dev/null 2>&1; then
        log_info "✓ DNS resolution working (backend -> prometheus)"
    else
        log_warn "✗ DNS resolution issue (backend -> prometheus)"
        log_warn "Attempting to fix network connection..."
        NETWORK_NAME=$(docker inspect shorthnd-prometheus | grep -oP '"Networks":\s*{\s*"\K[^"]+' | head -1)
        if [ -n "$NETWORK_NAME" ]; then
            docker network connect "$NETWORK_NAME" shorthnd-backend 2>/dev/null || true
            sleep 2
        fi
    fi
    
    # Check metrics endpoint
    log_info "Checking metrics endpoint..."
    if docker exec shorthnd-prometheus wget -qO- http://backend:5001/metrics 2>/dev/null | grep -q "http_request_total"; then
        log_info "✓ Backend metrics endpoint accessible"
    else
        log_warn "✗ Backend metrics endpoint not accessible yet (may need a few more seconds)"
    fi
    
    # Check Prometheus targets
    log_info "Checking Prometheus targets..."
    sleep 5
    local targets=$(curl -s http://127.0.0.1:9090/api/v1/targets 2>/dev/null)
    if echo "$targets" | grep -q '"health":"up"'; then
        log_info "✓ Prometheus targets are UP"
    else
        log_warn "✗ Some Prometheus targets are DOWN"
        echo "$targets" | grep -oP '"job":"[^"]*","health":"[^"]*"' || true
    fi
}

# ==========================================
# Nginx Setup Functions
# ==========================================

# Check if running as root (for nginx setup)
check_root_for_nginx() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Nginx setup requires root privileges. Use: sudo $0 --nginx"
        return 1
    fi
    return 0
}

# Install package if missing
install_if_missing() {
    local pkg="$1"
    if command -v dpkg >/dev/null 2>&1; then
        if dpkg -s "$pkg" >/dev/null 2>&1; then
            log_success "$pkg is already installed"
            return 0
        fi
    elif command -v rpm >/dev/null 2>&1; then
        if rpm -q "$pkg" >/dev/null 2>&1; then
            log_success "$pkg is already installed"
            return 0
        fi
    fi
    
    log_info "Installing $pkg..."
    if command -v apt-get >/dev/null 2>&1; then
        apt-get install -y "$pkg" >/dev/null 2>&1
    elif command -v yum >/dev/null 2>&1; then
        yum install -y "$pkg" >/dev/null 2>&1
    else
        log_warn "Package manager not found. Please install $pkg manually"
        return 1
    fi
    log_success "$pkg installed"
}

# Create Nginx config file
create_nginx_config() {
    local domain="$1"
    local port="$2"
    local config_name="$3"
    local extra_config="${4:-}"
    
    local config_file="$NGINX_SITES_AVAILABLE/$domain"
    
    if [ -f "$config_file" ]; then
        log_warn "Nginx config for $domain already exists: $config_file"
        log_info "Skipping creation (to recreate, delete the file first)"
        return 0
    fi
    
    log_info "Creating Nginx config for $domain..."
    
    cat > "$config_file" <<EOF
# $config_name Nginx Configuration
# Domain: $domain
# Backend: http://127.0.0.1:$port
# Generated by setup-monitoring.sh

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
    create_nginx_config "$BACKEND_DOMAIN" "5001" "Backend API"
}

# Create Grafana config
create_grafana_config() {
    local extra_config="        # WebSocket support for Grafana
        proxy_set_header Connection \"upgrade\";
        proxy_read_timeout 86400;"
    
    create_nginx_config "$GRAFANA_DOMAIN" "3001" "Grafana" "$extra_config"
}

# Create Prometheus config
create_prometheus_config() {
    local extra_config="        # Prometheus specific settings
        proxy_read_timeout 300;
        proxy_connect_timeout 75;"
    
    create_nginx_config "$PROMETHEUS_DOMAIN" "9090" "Prometheus" "$extra_config"
}

# Create Loki config
create_loki_config() {
    local extra_config="        # Loki specific settings
        proxy_read_timeout 300;
        proxy_connect_timeout 75;"
    
    create_nginx_config "$LOKI_DOMAIN" "3100" "Loki" "$extra_config"
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
    if nginx -t 2>/dev/null; then
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
    if systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null; then
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
    if ! host "$domain" >/dev/null 2>&1 && ! nslookup "$domain" >/dev/null 2>&1; then
        log_warn "Domain $domain does not resolve. Please configure DNS first."
        return 1
    fi
    
    # Run certbot
    if command -v certbot >/dev/null 2>&1; then
        if certbot --nginx -d "$domain" --non-interactive --agree-tos --redirect 2>/dev/null; then
            log_success "SSL certificate installed for $domain"
            return 0
        else
            log_warn "Failed to install SSL certificate for $domain"
            log_info "You can run manually: sudo certbot --nginx -d $domain"
            return 1
        fi
    else
        log_warn "Certbot not found. Install with: sudo apt-get install certbot python3-certbot-nginx"
        return 1
    fi
}

# Setup Nginx reverse proxy
setup_nginx() {
    log_info "========================================="
    log_info "Setting up Nginx Reverse Proxy"
    log_info "========================================="
    
    if ! check_root_for_nginx; then
        log_warn "Skipping Nginx setup (requires root)"
        return 1
    fi
    
    # Install dependencies
    log_info "Installing Nginx dependencies..."
    install_if_missing nginx || true
    install_if_missing certbot || true
    install_if_missing python3-certbot-nginx || true
    
    # Ensure directories exist
    mkdir -p "$NGINX_SITES_AVAILABLE"
    mkdir -p "$NGINX_SITES_ENABLED"
    
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
        log_success "Nginx setup complete!"
        
        # Ask about SSL
        log_info ""
        log_info "SSL Certificate Setup:"
        log_warn "SSL setup requires:"
        log_warn "  1. DNS records pointing to this server"
        log_warn "  2. Port 80 accessible from internet"
        log_warn ""
        read -p "Do you want to set up SSL certificates now? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_ssl_certificate "$BACKEND_DOMAIN" || true
            setup_ssl_certificate "$GRAFANA_DOMAIN" || true
            setup_ssl_certificate "$PROMETHEUS_DOMAIN" || true
            setup_ssl_certificate "$LOKI_DOMAIN" || true
            reload_nginx
        else
            log_info "Skipping SSL setup. Run later with:"
            log_info "  sudo certbot --nginx -d $BACKEND_DOMAIN"
            log_info "  sudo certbot --nginx -d $GRAFANA_DOMAIN"
            log_info "  sudo certbot --nginx -d $PROMETHEUS_DOMAIN"
            log_info "  sudo certbot --nginx -d $LOKI_DOMAIN"
        fi
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

# ==========================================
# Main execution
# ==========================================

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --nginx)
                SETUP_NGINX="true"
                shift
                ;;
            --backend-domain)
                BACKEND_DOMAIN="$2"
                shift 2
                ;;
            --grafana-domain)
                GRAFANA_DOMAIN="$2"
                shift 2
                ;;
            --prometheus-domain)
                PROMETHEUS_DOMAIN="$2"
                shift 2
                ;;
            --loki-domain)
                LOKI_DOMAIN="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --nginx              Setup Nginx reverse proxy (requires sudo)"
                echo "  --backend-domain      Backend domain (default: api.vikalpshorthand.com)"
                echo "  --grafana-domain      Grafana domain (default: grafana.vikalpshorthand.com)"
                echo "  --prometheus-domain   Prometheus domain (default: prometheus.vikalpshorthand.com)"
                echo "  --loki-domain         Loki domain (default: loki.vikalpshorthand.com)"
                echo "  -h, --help           Show this help message"
                echo ""
                echo "Environment variables:"
                echo "  SETUP_NGINX           Set to 'true' to enable Nginx setup"
                echo ""
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use -h or --help for usage information"
                exit 1
                ;;
        esac
    done
}

# Main execution
main() {
    # Parse command line arguments
    parse_args "$@"
    
    log_info "========================================="
    log_info "Monitoring Stack Setup"
    log_info "========================================="
    
    cleanup
    check_prerequisites
    start_services
    
    # Wait for services
    wait_for_service "Backend" 5001 "/" 20
    wait_for_service "Prometheus" 9090 "/-/healthy" 15
    wait_for_service "Loki" 3100 "/ready" 15
    wait_for_service "Grafana" 3001 "/api/health" 20
    
    verify_services
    
    # Setup Nginx if requested
    if [ "$SETUP_NGINX" = "true" ]; then
        log_info ""
        setup_nginx
    fi
    
    log_info "========================================="
    log_info "Setup Complete!"
    log_info "========================================="
    log_info "Services:"
    log_info "  - Backend:    http://127.0.0.1:5001"
    log_info "  - Prometheus: http://127.0.0.1:9090"
    log_info "  - Loki:       http://127.0.0.1:3100"
    log_info "  - Grafana:    http://127.0.0.1:3001"
    
    if [ "$SETUP_NGINX" = "true" ]; then
        log_info ""
        log_info "Nginx Reverse Proxy:"
        log_info "  - Backend:    http://$BACKEND_DOMAIN"
        log_info "  - Grafana:    http://$GRAFANA_DOMAIN"
        log_info "  - Prometheus: http://$PROMETHEUS_DOMAIN"
        log_info "  - Loki:       http://$LOKI_DOMAIN"
    fi
    
    log_info ""
    log_info "Grafana credentials:"
    log_info "  - Username: admin"
    log_info "  - Password: admin (or from GRAFANA_ADMIN_PASSWORD in .env)"
    log_info ""
    log_info "To view logs:"
    log_info "  cd monitoring && docker-compose -f docker-compose.yml logs -f"
    log_info ""
    log_info "To stop services:"
    log_info "  cd monitoring && docker-compose -f docker-compose.yml down"
    log_info ""
    if [ "$SETUP_NGINX" != "true" ]; then
        log_info "To setup Nginx reverse proxy:"
        log_info "  sudo $0 --nginx"
    fi
}

# Run main
main "$@"

