# One-Click Deployment Guide - Full Stack Setup

This guide provides step-by-step instructions for deploying the complete Shorthand Backend stack with monitoring services (Grafana, Prometheus, Loki) on a fresh Ubuntu server using a single automated script.

## Overview

The deployment script (`scripts/setup-full-stack.sh`) automates the entire setup process:

- ✅ Docker & Docker Compose installation
- ✅ System dependencies and utilities
- ✅ Firewall configuration
- ✅ Monitoring stack deployment (Grafana, Prometheus, Loki)
- ✅ Backend API deployment
- ✅ Nginx reverse proxy configuration
- ✅ SSL certificate setup (optional)
- ✅ Zero-downtime deployment
- ✅ Health checks and verification

---

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 20.04 LTS or later (tested on Ubuntu 20.04, 22.04, 24.04)
- **RAM**: Minimum 2GB (4GB+ recommended)
- **Disk**: Minimum 20GB free space
- **Network**: Internet connection for package downloads
- **Access**: Root or sudo access

### Before You Start

1. **DNS Records**: Configure DNS A records pointing to your server IP:
   - `api.vikalpshorthand.com` → Your server IP
   - `grafana.vikalpshorthand.com` → Your server IP
   - `prometheus.vikalpshorthand.com` → Your server IP
   - `loki.vikalpshorthand.com` → Your server IP

2. **Firewall**: Ensure ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) are open

3. **Project Files**: Ensure you have the following files in your project directory:
   - `docker-compose.prod.yml`
   - `prometheus.yml`
   - `Dockerfile`
   - `.env` (or `env.production.template`)

---

## Quick Start (One-Click Deployment)

### Step 1: Connect to Your Server

```bash
ssh root@your-server-ip
# or
ssh your-user@your-server-ip
```

### Step 2: Clone or Upload Your Project

```bash
# Option 1: Clone from Git
git clone <your-repo-url> shorthand-backend
cd shorthand-backend

# Option 2: Upload via SCP (from your local machine)
# scp -r /path/to/shorthandBackend user@server:/home/user/
```

### Step 3: Configure Environment Variables

```bash
# If .env doesn't exist, copy from template
cp env.production.template .env

# Edit .env with your production values
nano .env
```

**Important**: Update these values in `.env`:
- `MONGO_URI` - Your MongoDB connection string
- `SESSION_SECRET` - Generate a strong random secret
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `FIREBASE_PRIVATE_KEY` - Firebase private key
- `GRAFANA_ADMIN_PASSWORD` - Strong password for Grafana
- `ALLOWED_ORIGINS` - Your frontend URLs

### Step 4: Run the Setup Script

```bash
# Make script executable
chmod +x scripts/setup-full-stack.sh

# Run the setup script
sudo bash scripts/setup-full-stack.sh
```

The script will:
1. Update system packages
2. Install all dependencies (Docker, Nginx, Certbot, etc.)
3. Configure firewall
4. Deploy monitoring stack
5. Configure Nginx
6. Optionally set up SSL certificates

**Estimated Time**: 10-15 minutes (depending on server speed and internet connection)

---

## Detailed Step-by-Step Guide

### Phase 1: Initial Server Setup

#### 1.1 System Update
The script automatically updates all system packages to ensure security and compatibility.

#### 1.2 Base Utilities Installation
Installs essential tools:
- `curl`, `wget` - For downloading files
- `git` - Version control
- `vim` - Text editor
- `ufw` - Firewall management
- `htop` - System monitoring
- `jq` - JSON processing

#### 1.3 Firewall Configuration
Configures UFW (Uncomplicated Firewall) with rules:
- Port 22 (SSH) - Required for server access
- Port 80 (HTTP) - Required for web traffic and SSL validation
- Port 443 (HTTPS) - Required for secure connections

---

### Phase 2: Docker Installation

#### 2.1 Docker Engine Installation
- Removes old Docker versions if present
- Adds Docker's official GPG key
- Configures Docker repository
- Installs Docker CE (Community Edition)
- Starts and enables Docker service

#### 2.2 Docker Compose Installation
- Downloads latest Docker Compose binary
- Installs to `/usr/local/bin/docker-compose`
- Verifies installation

**Verification**:
```bash
docker --version
docker-compose --version
```

---

### Phase 3: Nginx and SSL Setup

#### 3.1 Nginx Installation
- Installs Nginx web server
- Creates required directories
- Starts Nginx service

#### 3.2 Certbot Installation
- Installs Certbot for SSL certificate management
- Installs Nginx plugin for automatic certificate configuration

---

### Phase 4: Project Verification

#### 4.1 File Verification
The script checks for required files:
- `docker-compose.prod.yml` - Docker Compose configuration
- `prometheus.yml` - Prometheus configuration
- `Dockerfile` - Docker image build instructions
- `.env` - Environment variables

#### 4.2 Environment Setup
- Creates `.env` from template if missing
- Prompts to edit `.env` if created from template

---

### Phase 5: Monitoring Stack Deployment

#### 5.1 Zero-Downtime Deployment Strategy

The script implements zero-downtime deployment:

1. **Pull Latest Images**: Downloads latest Docker images
2. **Update in Order**:
   - Loki (no dependencies)
   - Prometheus (depends on backend)
   - Grafana (depends on Prometheus and Loki)
   - Backend API (main service, updated last)

3. **Health Checks**: Waits for each service to be healthy before proceeding

#### 5.2 Service Health Monitoring

Each service is checked for health:
- **Loki**: `http://127.0.0.1:3100/ready`
- **Prometheus**: `http://127.0.0.1:9090/-/healthy`
- **Grafana**: `http://127.0.0.1:3001/api/health`
- **Backend API**: `http://127.0.0.1:3000/`

---

### Phase 6: Nginx Configuration

#### 6.1 Reverse Proxy Setup
The script automatically:
- Creates Nginx configuration files for each service
- Configures reverse proxy rules
- Sets up proper headers (X-Forwarded-For, X-Real-IP, etc.)
- Enables WebSocket support for Grafana
- Adds health check endpoints

#### 6.2 Site Activation
- Creates symbolic links in `/etc/nginx/sites-enabled/`
- Tests Nginx configuration
- Reloads Nginx service

---

### Phase 7: SSL Certificate Setup (Optional)

#### 7.1 Certificate Installation
If you choose to set up SSL:
- Uses Let's Encrypt for free SSL certificates
- Automatically configures Nginx with SSL
- Sets up HTTP to HTTPS redirect
- Configures auto-renewal

**Requirements**:
- DNS records must be configured
- Port 80 must be accessible from internet
- Valid email for Let's Encrypt notifications

#### 7.2 Certificate Renewal
Certbot automatically sets up renewal. Certificates renew every 90 days automatically.

---

### Phase 8: Deployment Verification

#### 8.1 Health Checks
The script verifies:
- All services are running and healthy
- Nginx configuration is valid
- Docker containers are up
- Ports are accessible

#### 8.2 Summary Report
Displays:
- Access URLs for all services
- Useful management commands
- Backup location

---

## Post-Deployment

### Verify Services

```bash
# Check Docker containers
docker-compose -f docker-compose.prod.yml ps

# Check service health
curl http://127.0.0.1:3000/          # Backend API
curl http://127.0.0.1:3001/api/health  # Grafana
curl http://127.0.0.1:9090/-/healthy   # Prometheus
curl http://127.0.0.1:3100/ready      # Loki

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t
```

### Access Services

After deployment, access services via:
- **Backend API**: `http://api.vikalpshorthand.com` (or `https://` if SSL configured)
- **Grafana**: `http://grafana.vikalpshorthand.com` (or `https://` if SSL configured)
- **Prometheus**: `http://prometheus.vikalpshorthand.com` (or `https://` if SSL configured)
- **Loki**: `http://loki.vikalpshorthand.com` (or `https://` if SSL configured)

### Default Credentials

**Grafana**:
- Username: `admin` (or value from `GRAFANA_ADMIN_USER` in `.env`)
- Password: Value from `GRAFANA_ADMIN_PASSWORD` in `.env`

**Important**: Change Grafana password on first login!

---

## Troubleshooting

### Issue: Script Fails During Docker Installation

**Solution**:
```bash
# Check Docker service status
sudo systemctl status docker

# Check Docker logs
sudo journalctl -u docker -n 50

# Manually start Docker
sudo systemctl start docker
```

### Issue: Services Not Starting

**Solution**:
```bash
# Check Docker Compose logs
docker-compose -f docker-compose.prod.yml logs

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs grafana

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Issue: Nginx Configuration Errors

**Solution**:
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### Issue: SSL Certificate Installation Fails

**Solution**:
```bash
# Check DNS resolution
nslookup api.vikalpshorthand.com

# Check if port 80 is accessible
sudo netstat -tlnp | grep :80

# Manually run Certbot
sudo certbot --nginx -d api.vikalpshorthand.com
```

### Issue: Port Already in Use

**Solution**:
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :9090
sudo lsof -i :3100

# Stop conflicting services or change ports in docker-compose.prod.yml
```

### Issue: Permission Denied

**Solution**:
```bash
# Ensure script is executable
chmod +x scripts/setup-full-stack.sh

# Run with sudo
sudo bash scripts/setup-full-stack.sh

# Check file permissions
ls -la scripts/setup-full-stack.sh
```

---

## Maintenance

### Updating Services

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Restart services (zero-downtime)
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Backup and Restore

**Backup**:
```bash
# Backup Docker volumes
docker run --rm -v grafana-storage:/data -v $(pwd):/backup \
  alpine tar czf /backup/grafana-backup.tar.gz /data

# Backup configuration files
tar czf config-backup.tar.gz docker-compose.prod.yml .env prometheus.yml
```

**Restore**:
```bash
# Restore volumes
docker run --rm -v grafana-storage:/data -v $(pwd):/backup \
  alpine tar xzf /backup/grafana-backup.tar.gz -C /
```

### Monitoring

```bash
# View container stats
docker stats

# View service logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Check disk usage
df -h
docker system df
```

---

## Advanced Configuration

### Custom Domains

Edit the script or set environment variables:
```bash
export BACKEND_DOMAIN="api.yourdomain.com"
export GRAFANA_DOMAIN="grafana.yourdomain.com"
export PROMETHEUS_DOMAIN="prometheus.yourdomain.com"
export LOKI_DOMAIN="loki.yourdomain.com"

sudo -E bash scripts/setup-full-stack.sh
```

### Custom Ports

Edit `docker-compose.prod.yml` to change ports:
```yaml
ports:
  - '127.0.0.1:3001:3000'  # Change 3001 to your desired port
```

Then update the script or Nginx configuration accordingly.

### Resource Limits

Add resource limits in `docker-compose.prod.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## Security Best Practices

1. **Change Default Passwords**: Update all default passwords in `.env`
2. **Firewall**: Keep UFW enabled and only open necessary ports
3. **SSL Certificates**: Always use HTTPS in production
4. **Regular Updates**: Keep system and Docker images updated
5. **Backup**: Regularly backup important data and configurations
6. **Monitoring**: Monitor logs and metrics regularly
7. **Access Control**: Use strong passwords and consider IP whitelisting for monitoring services

---

## Rollback Procedure

If something goes wrong:

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Restore from backup (backup location shown in script output)
# Example: /tmp/shorthand-backup-YYYYMMDD-HHMMSS

# Restore Nginx configs
sudo cp -r /tmp/shorthand-backup-*/nginx-sites-available/* /etc/nginx/sites-available/

# Restore docker-compose.prod.yml
cp /tmp/shorthand-backup-*/docker-compose.prod.yml .

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

---

## Support and Resources

- **Docker Documentation**: https://docs.docker.com/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Certbot Documentation**: https://eff-certbot.readthedocs.io/
- **Grafana Documentation**: https://grafana.com/docs/
- **Prometheus Documentation**: https://prometheus.io/docs/
- **Loki Documentation**: https://grafana.com/docs/loki/latest/

---

## Summary

The one-click deployment script automates the entire setup process, making it easy to deploy the complete stack on a fresh Ubuntu server. The script:

✅ Handles all dependencies and installations  
✅ Implements zero-downtime deployment  
✅ Includes comprehensive error handling  
✅ Provides health checks and verification  
✅ Creates backups for rollback capability  
✅ Supports idempotent execution (safe to run multiple times)  

**Total Setup Time**: ~10-15 minutes  
**Manual Steps Required**: Minimal (just edit `.env` file)  

For issues or questions, refer to the troubleshooting section or check the service logs.

