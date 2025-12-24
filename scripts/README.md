# Deployment Scripts

This directory contains automated deployment scripts for the Shorthand Backend stack.

## Scripts Overview

### 0. `test-deployment-local.sh` - Local Testing 🧪

**Test deployment setup locally before production (Mac & Ubuntu).**

Use this to test everything locally without affecting your system:
- Tests Docker Compose configurations
- Starts monitoring stack locally
- Validates service health
- Tests Nginx configuration generation
- Safe to run (no system changes, no root required)

**Usage:**
```bash
bash scripts/test-deployment-local.sh
```

**Note**: Services will keep running after the script completes. Stop them with:
```bash
docker-compose -f docker-compose.yml down
```

**See**: `Docs/LOCAL_TESTING_GUIDE.md` for detailed instructions

---

### 0.1. `start-local-services.sh` - Quick Start Services 🚀

**Quick helper to just start services locally.**

Simple script to start all services without running full tests.

**Usage:**
```bash
bash scripts/start-local-services.sh
```

---

### 1. `setup-full-stack.sh` - One-Click Full Deployment ⭐

**Complete automated setup for fresh Ubuntu servers.**

This is the main script you should use for one-click deployment. It handles everything:
- Docker & Docker Compose installation
- System dependencies
- Monitoring stack (Grafana, Prometheus, Loki)
- Backend API deployment
- Nginx reverse proxy configuration
- SSL certificate setup (optional)

**Usage:**
```bash
sudo bash scripts/setup-full-stack.sh
```

**See**: `Docs/ONE_CLICK_DEPLOYMENT_GUIDE.md` for detailed instructions

---

### 2. `setup-nginx-monitoring.sh` - Nginx Configuration Only

**Sets up Nginx reverse proxy for existing services.**

Use this if you already have Docker and services running, and only need to configure Nginx.

**Usage:**
```bash
sudo bash scripts/setup-nginx-monitoring.sh
```

**See**: `Docs/NGINX_MONITORING_SETUP.md` for detailed instructions

---

## Quick Start

### For Local Testing (Recommended First Step)

```bash
# Test everything locally before production
bash scripts/test-deployment-local.sh
```

### For Fresh Server (Production)

```bash
# 1. Clone or upload your project
git clone <your-repo> shorthand-backend
cd shorthand-backend

# 2. Configure environment
cp env.production.template .env
nano .env  # Edit with your values

# 3. Run one-click deployment
sudo bash scripts/setup-full-stack.sh
```

### For Existing Server (Nginx Only)

```bash
# If services are already running, just configure Nginx
sudo bash scripts/setup-nginx-monitoring.sh
```

---

## Script Features

### ✅ Zero-Downtime Deployment
- Services updated in dependency order
- Health checks before proceeding
- Rollback capability

### ✅ Idempotent
- Safe to run multiple times
- Checks before installing
- Skips existing configurations

### ✅ Comprehensive Error Handling
- Detailed error messages
- Automatic rollback on failure
- Backup creation before changes

### ✅ Edge Case Handling
- OS compatibility checks
- Port conflict detection
- Service health verification
- DNS resolution checks

---

## Requirements

### For `setup-full-stack.sh`:
- Ubuntu 20.04+ server
- Root or sudo access
- Internet connection
- Minimum 2GB RAM, 20GB disk

### For `setup-nginx-monitoring.sh`:
- Nginx installed
- Services running on localhost
- Root or sudo access

---

## Troubleshooting

### Script Fails to Run

```bash
# Check permissions
chmod +x scripts/setup-full-stack.sh

# Check if running as root
sudo bash scripts/setup-full-stack.sh
```

### Services Not Starting

```bash
# Check Docker status
docker ps
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs
```

### Nginx Configuration Errors

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Documentation

- **Local Testing Guide**: `Docs/LOCAL_TESTING_GUIDE.md` ⭐ Start here!
- **Full Deployment Guide**: `Docs/ONE_CLICK_DEPLOYMENT_GUIDE.md`
- **Nginx Setup Guide**: `Docs/NGINX_MONITORING_SETUP.md`
- **Production Deployment**: `Docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

---

## Support

For issues or questions:
1. Check the troubleshooting section in the documentation
2. Review service logs: `docker-compose -f docker-compose.prod.yml logs`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

