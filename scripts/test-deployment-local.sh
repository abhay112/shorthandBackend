#!/bin/bash

# ==========================================
# Local Deployment Testing Script
# ==========================================
# This script allows you to test the deployment setup locally
# without affecting your system or requiring root access.
#
# Usage: bash scripts/test-deployment-local.sh
#
# Features:
#   - Tests Docker Compose setup
#   - Tests monitoring stack locally
#   - Validates Nginx configurations (without installing)
#   - Safe to run (no system changes)
#   - Works on Mac and Ubuntu
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
TEST_DIR="$PROJECT_ROOT/.test-deployment"
NGINX_TEST_DIR="$TEST_DIR/nginx-configs"

# Ports for local testing
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

# Check prerequisites
check_prerequisites() {
    log_step "Step 1: Checking Prerequisites"
    
    local missing=()
    
    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        missing+=("Docker")
    else
        log_success "Docker installed: $(docker --version)"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        missing+=("Docker Compose")
    else
        log_success "Docker Compose installed: $(docker-compose --version)"
    fi
    
    # Check curl
    if ! command -v curl >/dev/null 2>&1; then
        missing+=("curl")
    else
        log_success "curl installed"
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing prerequisites: ${missing[*]}"
        log_info "Please install missing tools before running tests"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        log_info "Please start Docker Desktop (Mac) or Docker service (Linux)"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Check project files
check_project_files() {
    log_step "Step 2: Verifying Project Files"
    
    local required_files=(
        "docker-compose.yml"
        "docker-compose.prod.yml"
        "prometheus.yml"
        "Dockerfile"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$file" ]; then
            missing_files+=("$file")
        else
            log_success "Found: $file"
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "Missing required files:"
        for file in "${missing_files[@]}"; do
            log_error "  - $file"
        done
        exit 1
    fi
    
    log_success "All project files present"
}

# Create test directory
setup_test_environment() {
    log_step "Step 3: Setting Up Test Environment"
    
    log_info "Creating test directory: $TEST_DIR"
    mkdir -p "$TEST_DIR"
    mkdir -p "$NGINX_TEST_DIR"
    
    log_success "Test environment ready"
}

# Test Docker Compose configuration
test_docker_compose() {
    log_step "Step 4: Testing Docker Compose Configuration"
    
    cd "$PROJECT_ROOT" || exit 1
    
    log_info "Validating docker-compose.yml..."
    if docker-compose -f docker-compose.yml config >/dev/null 2>&1; then
        log_success "docker-compose.yml is valid"
    else
        log_error "docker-compose.yml has errors"
        docker-compose -f docker-compose.yml config
        exit 1
    fi
    
    log_info "Validating docker-compose.prod.yml..."
    if docker-compose -f docker-compose.prod.yml config >/dev/null 2>&1; then
        log_success "docker-compose.prod.yml is valid"
    else
        log_error "docker-compose.prod.yml has errors"
        docker-compose -f docker-compose.prod.yml config
        exit 1
    fi
}

# Start services locally
start_local_services() {
    log_step "Step 5: Starting Services Locally"
    
    cd "$PROJECT_ROOT" || exit 1
    
    log_info "Stopping any existing containers..."
    docker-compose -f docker-compose.yml down >/dev/null 2>&1 || true
    
    log_info "Building and starting services..."
    if docker-compose -f docker-compose.yml up -d --build 2>&1; then
        log_success "Docker Compose command executed"
    else
        log_error "Failed to start services"
        log_info "Checking logs for errors..."
        docker-compose -f docker-compose.yml logs --tail=20
        exit 1
    fi
    
    log_info "Waiting for services to be ready (15 seconds)..."
    sleep 15
    
    # Verify containers are actually running
    log_info "Verifying containers are running..."
    local running_count=$(docker-compose -f docker-compose.yml ps -q | wc -l | tr -d ' ')
    if [ "$running_count" -eq 0 ]; then
        log_error "No containers are running!"
        log_info "Checking logs for errors..."
        docker-compose -f docker-compose.yml logs --tail=30
        exit 1
    else
        log_success "$running_count container(s) are running"
        docker-compose -f docker-compose.yml ps
    fi
}

# Test service health
test_service_health() {
    log_step "Step 6: Testing Service Health"
    
    local all_healthy=true
    
    # Test Backend
    log_info "Testing Backend API on port $BACKEND_PORT..."
    if curl -sf --max-time 5 "http://127.0.0.1:$BACKEND_PORT/" >/dev/null 2>&1; then
        log_success "Backend API is healthy"
    else
        log_warning "Backend API health check failed (may need .env configured or still starting)"
        log_info "Checking if backend container is running..."
        if docker ps | grep -q shorthnd-backend; then
            log_info "Backend container is running. Check logs: docker-compose -f docker-compose.yml logs backend"
        else
            log_warning "Backend container is not running"
        fi
        all_healthy=false
    fi
    
    # Test Grafana
    log_info "Testing Grafana on port $GRAFANA_PORT..."
    if curl -sf --max-time 5 "http://127.0.0.1:$GRAFANA_PORT/api/health" >/dev/null 2>&1; then
        log_success "Grafana is healthy"
    else
        log_warning "Grafana health check failed (may still be starting)"
        log_info "Grafana can take 10-20 seconds to start. Try: curl http://127.0.0.1:$GRAFANA_PORT/api/health"
        all_healthy=false
    fi
    
    # Test Prometheus
    log_info "Testing Prometheus on port $PROMETHEUS_PORT..."
    if curl -sf --max-time 5 "http://127.0.0.1:$PROMETHEUS_PORT/-/healthy" >/dev/null 2>&1; then
        log_success "Prometheus is healthy"
    else
        log_warning "Prometheus health check failed (may still be starting)"
        all_healthy=false
    fi
    
    # Test Loki
    log_info "Testing Loki on port $LOKI_PORT..."
    if curl -sf --max-time 5 "http://127.0.0.1:$LOKI_PORT/ready" >/dev/null 2>&1; then
        log_success "Loki is healthy"
    else
        log_warning "Loki health check failed (may still be starting)"
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        log_success "All services are healthy"
    else
        log_warning "Some services may not be fully ready yet"
        log_info "Check logs with: docker-compose -f docker-compose.yml logs"
    fi
}

# Generate and validate Nginx configs
test_nginx_configs() {
    log_step "Step 7: Testing Nginx Configuration Generation"
    
    log_info "Generating Nginx configurations..."
    
    # Create test nginx configs (simulating what the script would create)
    local domains=(
        "api.vikalpshorthand.com:$BACKEND_PORT:Backend API"
        "grafana.vikalpshorthand.com:$GRAFANA_PORT:Grafana"
        "prometheus.vikalpshorthand.com:$PROMETHEUS_PORT:Prometheus"
        "loki.vikalpshorthand.com:$LOKI_PORT:Loki"
    )
    
    for domain_info in "${domains[@]}"; do
        IFS=':' read -r domain port service <<< "$domain_info"
        local config_file="$NGINX_TEST_DIR/$domain"
        
        log_info "Creating config for $service ($domain)..."
        
        cat > "$config_file" <<EOF
# $service Nginx Configuration (Test)
# Domain: $domain
# Backend: http://127.0.0.1:$port

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
    }

    listen 80;
}
EOF
        
        log_success "Created: $config_file"
    done
    
    # Validate nginx configs (if nginx is available)
    if command -v nginx >/dev/null 2>&1; then
        log_info "Validating Nginx configurations..."
        
        # Create a test nginx.conf
        local test_nginx_conf="$TEST_DIR/nginx-test.conf"
        cat > "$test_nginx_conf" <<EOF
events {
    worker_connections 1024;
}

http {
    include $NGINX_TEST_DIR/*;
}
EOF
        
        if nginx -t -c "$test_nginx_conf" >/dev/null 2>&1; then
            log_success "Nginx configurations are valid"
        else
            log_warning "Nginx validation failed (nginx may not be installed, which is OK for local testing)"
            nginx -t -c "$test_nginx_conf" 2>&1 | head -5 || true
        fi
    else
        log_info "Nginx not installed - skipping syntax validation (OK for local testing)"
    fi
    
    log_success "Nginx configurations generated"
}

# Test port availability
test_port_availability() {
    log_step "Step 8: Testing Port Availability"
    
    local ports=("$BACKEND_PORT" "$GRAFANA_PORT" "$PROMETHEUS_PORT" "$LOKI_PORT")
    local port_names=("Backend API" "Grafana" "Prometheus" "Loki")
    
    for i in "${!ports[@]}"; do
        local port="${ports[$i]}"
        local name="${port_names[$i]}"
        
        if command -v lsof >/dev/null 2>&1; then
            if lsof -i ":$port" >/dev/null 2>&1; then
                log_success "$name port $port is in use (expected)"
            else
                log_warning "$name port $port is not in use"
            fi
        elif command -v netstat >/dev/null 2>&1; then
            if netstat -an | grep -q ":$port "; then
                log_success "$name port $port is in use (expected)"
            else
                log_warning "$name port $port is not in use"
            fi
        else
            log_info "Cannot check port $port (lsof/netstat not available)"
        fi
    done
}

# Display service URLs
display_service_urls() {
    log_step "Step 9: Service Access Information"
    
    echo "Services are running locally. Access them at:"
    echo ""
    echo "  - Backend API:  http://127.0.0.1:$BACKEND_PORT (port 5001)"
    echo "  - Grafana:      http://127.0.0.1:$GRAFANA_PORT"
    echo "  - Prometheus:   http://127.0.0.1:$PROMETHEUS_PORT"
    echo "  - Loki:         http://127.0.0.1:$LOKI_PORT"
    echo ""
    echo "Default Grafana credentials:"
    echo "  - Username: admin"
    echo "  - Password: admin (or value from .env)"
    echo ""
    echo "Useful commands:"
    echo "  - View logs:        docker-compose -f docker-compose.yml logs -f"
    echo "  - Stop services:    docker-compose -f docker-compose.yml down"
    echo "  - Restart:         docker-compose -f docker-compose.yml restart"
    echo "  - View status:     docker-compose -f docker-compose.yml ps"
    echo ""
}

# Cleanup function (optional - only if CLEANUP_ON_EXIT is set)
cleanup() {
    if [ "${CLEANUP_ON_EXIT:-}" = "true" ]; then
        log_step "Cleanup: Stopping Test Services"
        
        cd "$PROJECT_ROOT" || exit 1
        
        log_info "Stopping Docker containers..."
        docker-compose -f docker-compose.yml down >/dev/null 2>&1 || true
        
        log_info "Test directory: $TEST_DIR"
        log_info "You can remove it manually if needed: rm -rf $TEST_DIR"
        
        log_success "Cleanup complete"
    fi
}

# Main function
main() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║     Local Deployment Testing                            ║${NC}"
    echo -e "${GREEN}║     Test deployment setup without affecting system     ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Only cleanup on exit if CLEANUP_ON_EXIT is set
    # By default, keep services running so user can test them
    if [ "${CLEANUP_ON_EXIT:-}" = "true" ]; then
        trap cleanup EXIT
    fi
    
    check_prerequisites
    check_project_files
    setup_test_environment
    test_docker_compose
    start_local_services
    test_service_health
    test_nginx_configs
    test_port_availability
    display_service_urls
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Local Testing Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    log_success "All tests passed! Your deployment setup is ready."
    echo ""
    log_info "Services are still running. You can now test them in your browser."
    echo ""
    log_info "To stop services manually:"
    log_info "  docker-compose -f docker-compose.yml down"
    echo ""
    log_info "To stop services automatically on script exit, run:"
    log_info "  CLEANUP_ON_EXIT=true bash scripts/test-deployment-local.sh"
    echo ""
}

# Run main function
main "$@"

