# Local Testing Guide - Deployment Scripts

This guide explains how to test your deployment setup locally on **Mac** and **Ubuntu** before running it on your production server.

## Overview

The local testing script (`scripts/test-deployment-local.sh`) allows you to:
- ✅ Test Docker Compose configurations
- ✅ Start monitoring stack locally
- ✅ Validate service health
- ✅ Test Nginx configuration generation
- ✅ Verify port availability
- ✅ **Safe to run** (no system changes, no root required)

---

## Prerequisites

### For Mac

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
   ```bash
   # Verify installation
   docker --version
   docker-compose --version
   ```

2. **Homebrew** (optional, for easy package management)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **curl** (usually pre-installed)
   ```bash
   curl --version
   ```

### For Ubuntu

1. **Docker** - Install Docker Engine
   ```bash
   # Update package index
   sudo apt-get update
   
   # Install prerequisites
   sudo apt-get install -y \
       ca-certificates \
       curl \
       gnupg \
       lsb-release
   
   # Add Docker's official GPG key
   sudo mkdir -p /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
       sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   
   # Set up repository
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
     https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   
   # Install Docker
   sudo apt-get update
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
   
   # Add user to docker group (to run without sudo)
   sudo usermod -aG docker $USER
   newgrp docker
   
   # Verify installation
   docker --version
   docker compose version
   ```

2. **Docker Compose** (if not using plugin)
   ```bash
   # Download Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
       -o /usr/local/bin/docker-compose
   
   # Make executable
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Verify
   docker-compose --version
   ```

3. **curl** (usually pre-installed)
   ```bash
   curl --version
   ```

---

## Quick Start

### Option 1: Full Testing Script (Recommended)

```bash
# Step 1: Navigate to project directory
cd /path/to/shorthandBackend

# Step 2: Make script executable
chmod +x scripts/test-deployment-local.sh

# Step 3: Run local tests
bash scripts/test-deployment-local.sh
```

The script will:
1. Check prerequisites
2. Verify project files
3. Start services locally
4. Test service health
5. Generate and validate Nginx configs
6. Display access information

**Note**: Services will continue running after the script completes. To stop them:
```bash
docker-compose -f docker-compose.yml down
```

### Option 2: Quick Start (Just Start Services)

If you just want to start services quickly:

```bash
bash scripts/start-local-services.sh
```

This will:
- Check for .env file (create from template if missing)
- Start all services
- Show service status
- Display access URLs

---

## What Gets Tested

### 1. Prerequisites Check
- Docker installation
- Docker Compose installation
- Docker daemon running
- curl availability

### 2. Project Files Verification
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `prometheus.yml`
- `Dockerfile`

### 3. Docker Compose Validation
- Syntax validation
- Configuration correctness
- Service definitions

### 4. Service Health Checks
- Backend API (port 3000)
- Grafana (port 3001)
- Prometheus (port 9090)
- Loki (port 3100)

### 5. Nginx Configuration Generation
- Creates test Nginx configs
- Validates syntax (if Nginx installed)
- Tests proxy configurations

### 6. Port Availability
- Checks if ports are in use
- Verifies service accessibility

---

## Accessing Services Locally

After running the test script, services are available at:

- **Backend API**: http://127.0.0.1:5001
- **Grafana**: http://127.0.0.1:3001
  - Username: `admin`
  - Password: `admin` (or from `.env`)
- **Prometheus**: http://127.0.0.1:9090
- **Loki**: http://127.0.0.1:3100

### Opening in Browser

**Mac:**
```bash
open http://127.0.0.1:5001  # Backend API
open http://127.0.0.1:3001  # Grafana
open http://127.0.0.1:9090  # Prometheus
```

**Ubuntu:**
```bash
xdg-open http://127.0.0.1:5001  # Backend API
xdg-open http://127.0.0.1:3001  # Grafana
xdg-open http://127.0.0.1:9090   # Prometheus
```

---

## Useful Commands During Testing

### View Service Logs

```bash
# All services
docker-compose -f docker-compose.yml logs -f

# Specific service
docker-compose -f docker-compose.yml logs -f backend
docker-compose -f docker-compose.yml logs -f grafana
docker-compose -f docker-compose.yml logs -f prometheus
docker-compose -f docker-compose.yml logs -f loki
```

### Check Service Status

```bash
docker-compose -f docker-compose.yml ps
```

### Restart Services

```bash
docker-compose -f docker-compose.yml restart
```

### Stop Services

```bash
docker-compose -f docker-compose.yml down
```

### View Container Stats

```bash
docker stats
```

---

## Troubleshooting

### Issue: Docker Not Running

**Mac:**
```bash
# Start Docker Desktop from Applications
# Or via command line
open -a Docker
```

**Ubuntu:**
```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### Issue: Port Already in Use

If a port is already in use:

```bash
# Find what's using the port (Mac/Ubuntu)
lsof -i :5001  # Backend
lsof -i :3001  # Grafana
lsof -i :9090  # Prometheus
lsof -i :3100  # Loki

# Or use netstat (Ubuntu)
netstat -an | grep :3000

# Stop conflicting service or change port in docker-compose.yml
```

### Issue: Permission Denied (Ubuntu)

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply changes (logout/login or use newgrp)
newgrp docker

# Verify
docker ps
```

### Issue: Services Not Starting

```bash
# Check if containers are running
docker-compose -f docker-compose.yml ps

# Check logs for errors
docker-compose -f docker-compose.yml logs

# Check specific service logs
docker-compose -f docker-compose.yml logs backend
docker-compose -f docker-compose.yml logs grafana

# Check if .env file exists
ls -la .env

# Check Docker resources
docker system df
docker system prune  # Clean up if needed

# Try starting manually
docker-compose -f docker-compose.yml up -d --build
```

### Issue: Services Start But Immediately Stop

This usually means there's an error in the container. Check logs:

```bash
# View all logs
docker-compose -f docker-compose.yml logs

# View logs for specific service
docker-compose -f docker-compose.yml logs backend

# Check container status
docker-compose -f docker-compose.yml ps -a
```

### Issue: Backend API Not Responding

The backend may require a `.env` file with database configuration:

```bash
# Create .env from template
cp env.production.template .env

# Edit with your local MongoDB or use a test database
nano .env
```

### Issue: Out of Memory

**Mac:**
- Open Docker Desktop
- Go to Settings > Resources
- Increase Memory allocation (recommended: 4GB+)

**Ubuntu:**
```bash
# Check memory
free -h

# Increase swap if needed
sudo swapon --show
```

---

## Testing Nginx Configurations

The test script generates Nginx configurations in `.test-deployment/nginx-configs/`.

To manually validate them:

### If Nginx is Installed

```bash
# Test generated configs
nginx -t -c .test-deployment/nginx-test.conf
```

### If Nginx is Not Installed

The script will skip Nginx validation, which is fine for local testing. The configs are still generated and can be reviewed manually.

---

## Cleanup

### Automatic Cleanup

The test script automatically stops services when you exit (via trap).

### Manual Cleanup

```bash
# Stop and remove containers
docker-compose -f docker-compose.yml down

# Remove test directory
rm -rf .test-deployment

# Remove unused Docker resources (optional)
docker system prune -a
```

---

## Testing Production Configuration

To test the production configuration:

```bash
# Use production docker-compose file
docker-compose -f docker-compose.prod.yml up -d

# Test services
curl http://127.0.0.1:3000/
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:9090/-/healthy
curl http://127.0.0.1:3100/ready

# Stop when done
docker-compose -f docker-compose.prod.yml down
```

---

## Differences: Local vs Production

| Aspect | Local Testing | Production |
|--------|---------------|------------|
| Docker Compose | `docker-compose.yml` | `docker-compose.prod.yml` |
| Ports | All ports exposed | Only localhost (127.0.0.1) |
| Nginx | Not installed/required | Required |
| SSL | Not configured | Configured via Certbot |
| Domain | localhost/127.0.0.1 | Real domains |
| Root Access | Not required | Required for setup |
| Firewall | Not configured | UFW configured |

---

## Next Steps

After successful local testing:

1. ✅ Verify all services start correctly
2. ✅ Check service health endpoints
3. ✅ Review Nginx configurations
4. ✅ Test Grafana dashboards
5. ✅ Verify Prometheus metrics
6. ✅ Check Loki log ingestion

Then proceed to production deployment:
- See `Docs/ONE_CLICK_DEPLOYMENT_GUIDE.md` for production setup

---

## Mac-Specific Notes

### Docker Desktop Resources

Recommended settings:
- **Memory**: 4GB minimum, 8GB recommended
- **CPUs**: 2 minimum, 4 recommended
- **Disk**: 20GB+ free space

### Port Conflicts

Mac may have services using common ports:
```bash
# Check what's using a port
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### Homebrew Docker

If using Homebrew:
```bash
brew install --cask docker
brew install docker-compose
```

---

## Ubuntu-Specific Notes

### Docker Without Sudo

After adding user to docker group:
```bash
# Logout and login again, or:
newgrp docker

# Verify
docker ps
```

### Systemd Service

Docker runs as a systemd service:
```bash
# Check status
sudo systemctl status docker

# Start/stop
sudo systemctl start docker
sudo systemctl stop docker
```

### Firewall (UFW)

Local testing doesn't require firewall changes, but for production:
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
```

---

## Summary

Local testing allows you to:
- ✅ Verify deployment setup works
- ✅ Test service configurations
- ✅ Validate Docker Compose files
- ✅ Check service health
- ✅ Review Nginx configs
- ✅ **All without affecting your system**

**Time Required**: ~5-10 minutes  
**System Impact**: None (uses Docker containers)  
**Root Access**: Not required  

For production deployment, see `Docs/ONE_CLICK_DEPLOYMENT_GUIDE.md`.

