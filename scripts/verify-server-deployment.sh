#!/bin/bash

# ==========================================
# Server Deployment Verification Script
# ==========================================
# Run this on your production server to verify
# that everything is working correctly.
#
# Usage: bash scripts/verify-server-deployment.sh
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKEND_PORT="5001"
GRAFANA_PORT="3001"
PROMETHEUS_PORT="9090"
LOKI_PORT="3100"
BACKEND_DOMAIN="${BACKEND_DOMAIN:-api.vikalpshorthand.com}"
GRAFANA_DOMAIN="${GRAFANA_DOMAIN:-grafana.vikalpshorthand.com}"
PROMETHEUS_DOMAIN="${PROMETHEUS_DOMAIN:-prometheus.vikalpshorthand.com}"
LOKI_DOMAIN="${LOKI_DOMAIN:-loki.vikalpshorthand.com}"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check Docker containers
check_docker_containers() {
    log_section "1. Checking Docker Containers"
    
    local containers=("shorthnd-backend" "shorthnd-grafana" "shorthnd-prometheus" "shorthnd-loki")
    local all_running=true
    
    for container in "${containers[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
            local status=$(docker ps --filter "name=${container}" --format "{{.Status}}")
            log_success "$container is running - $status"
        else
            log_error "$container is not running"
            all_running=false
        fi
    done
    
    if [ "$all_running" = false ]; then
        log_warning "Some containers are not running. Check with: docker-compose -f docker-compose.prod.yml ps"
    fi
    
    echo ""
    log_info "All containers status:"
    docker-compose -f docker-compose.prod.yml ps 2>/dev/null || docker ps | grep shorthnd
}

# Check service health (localhost)
check_local_health() {
    log_section "2. Checking Service Health (Localhost)"
    
    # Backend
    log_info "Testing Backend API on port $BACKEND_PORT..."
    if curl -sf --max-time 5 "http://127.0.0.1:$BACKEND_PORT/" >/dev/null 2>&1; then
        log_success "Backend API is healthy on localhost:$BACKEND_PORT"
    else
        log_error "Backend API is not responding on localhost:$BACKEND_PORT"
        log_info "Check logs: docker-compose -f docker-compose.prod.yml logs backend"
    fi
    
    # Grafana
    log_info "Testing Grafana on port $GRAFANA_PORT..."
    if curl -sf --max-time 5 "http://127.0.0.1:$GRAFANA_PORT/api/health" >/dev/null 2>&1; then
        log_success "Grafana is healthy on localhost:$GRAFANA_PORT"
    else
        log_error "Grafana is not responding on localhost:$GRAFANA_PORT"
    fi
    
    # Prometheus
    log_info "Testing Prometheus on port $PROMETHEUS_PORT..."
    if curl -sf --max-time 5 "http://127.0.0.1:$PROMETHEUS_PORT/-/healthy" >/dev/null 2>&1; then
        log_success "Prometheus is healthy on localhost:$PROMETHEUS_PORT"
    else
        log_error "Prometheus is not responding on localhost:$PROMETHEUS_PORT"
    fi
    
    # Loki
    log_info "Testing Loki on port $LOKI_PORT..."
    if curl -sf --max-time 5 "http://127.0.0.1:$LOKI_PORT/ready" >/dev/null 2>&1; then
        log_success "Loki is healthy on localhost:$LOKI_PORT"
    else
        log_error "Loki is not responding on localhost:$LOKI_PORT"
    fi
}

# Check Nginx configuration
check_nginx() {
    log_section "3. Checking Nginx Configuration"
    
    if ! command -v nginx >/dev/null 2>&1; then
        log_error "Nginx is not installed"
        return 1
    fi
    
    log_info "Testing Nginx configuration..."
    if sudo nginx -t 2>&1; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration has errors"
        return 1
    fi
    
    log_info "Checking Nginx service status..."
    if systemctl is-active --quiet nginx; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service is not running"
        log_info "Start with: sudo systemctl start nginx"
    fi
    
    # Check enabled sites
    echo ""
    log_info "Enabled Nginx sites:"
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null | grep -E "\.(conf|)$" || log_warning "No sites enabled"
}

# Check SSL certificates
check_ssl() {
    log_section "4. Checking SSL Certificates"
    
    local domains=("$BACKEND_DOMAIN" "$GRAFANA_DOMAIN" "$PROMETHEUS_DOMAIN" "$LOKI_DOMAIN")
    
    for domain in "${domains[@]}"; do
        if [ -d "/etc/letsencrypt/live/$domain" ]; then
            local expiry=$(sudo openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$domain/cert.pem" 2>/dev/null | cut -d= -f2)
            log_success "$domain - SSL certificate exists (expires: $expiry)"
        else
            log_warning "$domain - SSL certificate not found"
            log_info "Install with: sudo certbot --nginx -d $domain"
        fi
    done
}

# Check external access
check_external_access() {
    log_section "5. Checking External Access (via Domains)"
    
    local domains=(
        "$BACKEND_DOMAIN:$BACKEND_PORT"
        "$GRAFANA_DOMAIN:$GRAFANA_PORT"
        "$PROMETHEUS_DOMAIN:$PROMETHEUS_PORT"
        "$LOKI_DOMAIN:$LOKI_PORT"
    )
    
    for domain_info in "${domains[@]}"; do
        IFS=':' read -r domain port <<< "$domain_info"
        
        log_info "Testing $domain..."
        
        # Try HTTP first
        if curl -sf --max-time 5 "http://$domain" >/dev/null 2>&1; then
            log_success "$domain - HTTP is accessible"
        else
            log_warning "$domain - HTTP not accessible (may redirect to HTTPS)"
        fi
        
        # Try HTTPS
        if curl -sf --max-time 5 "https://$domain" >/dev/null 2>&1; then
            log_success "$domain - HTTPS is accessible"
        else
            log_error "$domain - HTTPS not accessible"
        fi
    done
}

# Check ports
check_ports() {
    log_section "6. Checking Port Availability"
    
    local ports=("$BACKEND_PORT" "$GRAFANA_PORT" "$PROMETHEUS_PORT" "$LOKI_PORT")
    local port_names=("Backend API" "Grafana" "Prometheus" "Loki")
    
    for i in "${!ports[@]}"; do
        local port="${ports[$i]}"
        local name="${port_names[$i]}"
        
        if command -v lsof >/dev/null 2>&1; then
            if lsof -i ":$port" >/dev/null 2>&1; then
                log_success "$name port $port is in use"
            else
                log_warning "$name port $port is not in use"
            fi
        elif command -v netstat >/dev/null 2>&1; then
            if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
                log_success "$name port $port is in use"
            else
                log_warning "$name port $port is not in use"
            fi
        else
            log_info "Cannot check port $port (lsof/netstat not available)"
        fi
    done
}

# Check disk space
check_resources() {
    log_section "7. Checking System Resources"
    
    log_info "Disk space:"
    df -h / | tail -1 | awk '{print "  Available: " $4 " / Total: " $2 " (" $5 " used)"}'
    
    log_info "Docker disk usage:"
    docker system df 2>/dev/null || log_warning "Cannot check Docker disk usage"
    
    log_info "Memory:"
    free -h 2>/dev/null | grep Mem | awk '{print "  Used: " $3 " / Total: " $2}'
}

# Check logs for errors
check_logs() {
    log_section "8. Checking Recent Errors"
    
    log_info "Recent Docker container errors (last 10 lines):"
    docker-compose -f docker-compose.prod.yml logs --tail=10 2>/dev/null | grep -i error || log_success "No recent errors in Docker logs"
    
    if [ -f "/var/log/nginx/error.log" ]; then
        echo ""
        log_info "Recent Nginx errors (last 5 lines):"
        sudo tail -5 /var/log/nginx/error.log 2>/dev/null | grep -i error || log_success "No recent errors in Nginx logs"
    fi
}

# Summary
print_summary() {
    log_section "Verification Summary"
    
    echo "Service URLs:"
    echo "  - Backend API:  http://$BACKEND_DOMAIN (or https://)"
    echo "  - Grafana:      http://$GRAFANA_DOMAIN (or https://)"
    echo "  - Prometheus:   http://$PROMETHEUS_DOMAIN (or https://)"
    echo "  - Loki:         http://$LOKI_DOMAIN (or https://)"
    echo ""
    echo "Useful commands:"
    echo "  - View logs:        docker-compose -f docker-compose.prod.yml logs -f"
    echo "  - Restart services:  docker-compose -f docker-compose.prod.yml restart"
    echo "  - Check status:      docker-compose -f docker-compose.prod.yml ps"
    echo "  - Nginx status:      sudo systemctl status nginx"
    echo "  - Nginx reload:      sudo systemctl reload nginx"
    echo ""
}

# Main
main() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}║     Server Deployment Verification                     ║${NC}"
    echo -e "${GREEN}║                                                          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    check_docker_containers
    check_local_health
    check_nginx
    check_ssl
    check_external_access
    check_ports
    check_resources
    check_logs
    print_summary
}

main "$@"

