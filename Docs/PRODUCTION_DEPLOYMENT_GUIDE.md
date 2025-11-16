# Production Deployment Guide - VPS with Subdomains

Complete step-by-step guide to deploy your Node.js application with monitoring stack (Grafana, Prometheus, Loki) on a Hostinger VPS with subdomain configuration.

## Table of Contents
1. [Server Prerequisites](#server-prerequisites)
2. [Domain and DNS Configuration](#domain-and-dns-configuration)
3. [Server Initial Setup](#server-initial-setup)
4. [Install Required Software](#install-required-software)
5. [Setup Application](#setup-application)
6. [Configure Nginx](#configure-nginx)
7. [SSL/TLS Certificates](#ssltls-certificates)
8. [Production Environment Variables](#production-environment-variables)
9. [Deploy with Docker](#deploy-with-docker)
10. [Monitoring Access](#monitoring-access)
11. [Security Hardening](#security-hardening)
12. [Maintenance and Troubleshooting](#maintenance-and-troubleshooting)

---

## 1. Server Prerequisites

### Minimum Server Requirements:
- **OS**: Ubuntu 20.04 LTS or newer (recommended)
- **RAM**: 4GB minimum (8GB recommended for monitoring stack)
- **Storage**: 40GB SSD minimum
- **CPU**: 2 cores minimum
- **Network**: Static IP address

### What You'll Deploy:
- `apitest.vikalpshorthand.com` → Node.js Backend (Port 3000)
- `grafana.vikalpshorthand.com` → Grafana Dashboard (Port 3001)
- `prometheus.vikalpshorthand.com` → Prometheus Metrics (Port 9090)
- `loki.vikalpshorthand.com` → Loki Logs (Port 3100)

---

## 2. Domain and DNS Configuration

### Step 1: Access Your Domain Panel (Hostinger)

1. Login to your Hostinger account
2. Go to **Domains** section
3. Select your domain `vikalpshorthand.com`
4. Click on **DNS / Name Servers**

### Step 2: Add DNS Records

Add the following **A Records** pointing to your VPS IP address:

```
Type    Host            Value               TTL
A       api             <YOUR_VPS_IP>       3600
A       grafana         <YOUR_VPS_IP>       3600
A       prometheus      <YOUR_VPS_IP>       3600
A       loki            <YOUR_VPS_IP>       3600
```

**Example** (if your VPS IP is `203.0.113.50`):
```
A       api             203.0.113.50        3600
A       grafana         203.0.113.50        3600
A       prometheus      203.0.113.50        3600
A       loki            203.0.113.50        3600
```

### Step 3: Verify DNS Propagation

Wait 5-30 minutes, then verify:

```bash
# On your local machine
nslookup apitest.vikalpshorthand.com
nslookup grafana.vikalpshorthand.com
nslookup prometheus.vikalpshorthand.com
nslookup loki.vikalpshorthand.com
```

All should point to your VPS IP.

---

## 3. Server Initial Setup

### Step 1: SSH into Your VPS

```bash
ssh root@<YOUR_VPS_IP>
# Example: ssh root@203.0.113.50
```

### Step 2: Update System

```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install basic utilities
sudo apt install -y curl wget git vim ufw software-properties-common
```

### Step 3: Create Non-Root User (Security Best Practice)

```bash
# Create new user
adduser deploy

# Add to sudo group
usermod -aG sudo deploy

# Switch to new user
su - deploy
```

### Step 4: Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**Output should show:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                     ALLOW       Anywhere
```

---

## 4. Install Required Software

### Step 1: Install Docker

```bash
# Remove old versions (if any)
sudo apt remove docker docker-engine docker.io containerd runc

# Install Docker dependencies
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Verify Docker installation
docker --version
# Should show: Docker version 24.x.x or newer
```

### Step 2: Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
# Should show: Docker Compose version v2.x.x or newer
```

### Step 3: Configure Docker for Non-Root User

```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Verify (should run without sudo)
docker ps
```

### Step 4: Enable Docker to Start on Boot

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### Step 5: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx

# Check Nginx version
nginx -v
# Should show: nginx version: nginx/1.18.0 or newer
```

### Step 6: Install Certbot (for SSL certificates)

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

---

## 5. Setup Application

### Step 1: Clone Your Repository

```bash
# Navigate to home directory
cd ~

# Create application directory
mkdir -p apps
cd apps

# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git backend
# OR upload files via SCP/SFTP

cd backend
```

### Step 2: Setup MongoDB

You have two options:

#### Option A: Use MongoDB Atlas (Recommended for Production)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Whitelist your VPS IP address
5. Use the connection string in your `.env` file

#### Option B: Install MongoDB on VPS

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Reload package database
sudo apt update

# Install MongoDB
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

**MongoDB Connection String** (if local):
```
mongodb://localhost:27017/shorthand
```

### Step 3: Create Production Environment File

```bash
# Create .env file
nano .env
```

Add the following (replace with your actual values):

```env
# Application
NODE_ENV=production
PORT=3000

# MongoDB (use Atlas or local)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/shorthand?retryWrites=true&w=majority

# Session Secret (generate a strong secret)
SESSION_SECRET=your-super-secret-session-key-change-this

# Firebase Admin (your actual credentials)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKey\n-----END PRIVATE KEY-----\n"

# Frontend URL
FRONTEND_URL=https://vikalpshorthand.com

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=change-this-strong-password

# Monitoring
LOKI_URL=http://loki:3100
ENABLE_LOKI_LOGS=true

# CORS Origins (add your production frontend domains)
ALLOWED_ORIGINS=https://vikalpshorthand.com,https://www.vikalpshorthand.com
```

**Generate Strong Session Secret:**
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Update Docker Compose for Production

Create a `docker-compose.prod.yml` file:

```bash
nano docker-compose.prod.yml
```

```yaml
version: '3.9'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: shorthnd-backend
    restart: unless-stopped
    env_file:
      - .env
    environment:
      PORT: 3000
      NODE_ENV: production
      LOKI_URL: http://loki:3100
      ENABLE_LOKI_LOGS: "true"
    ports:
      - '127.0.0.1:3000:3000'  # Bind to localhost only (Nginx will proxy)
    networks:
      - monitoring
    depends_on:
      - loki
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  prometheus:
    image: prom/prometheus:latest
    container_name: shorthnd-prometheus
    restart: unless-stopped
    ports:
      - '127.0.0.1:9090:9090'  # Bind to localhost only
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --storage.tsdb.retention.time=30d
    depends_on:
      - backend
    networks:
      - monitoring
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9090/-/healthy"]
      interval: 30s
      timeout: 10s
      retries: 3

  loki:
    image: grafana/loki:3.1.1
    container_name: shorthnd-loki
    restart: unless-stopped
    command: -config.file=/etc/loki/local-config.yaml
    ports:
      - '127.0.0.1:3100:3100'  # Bind to localhost only
    volumes:
      - loki-data:/loki
    networks:
      - monitoring
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3100/ready"]
      interval: 30s
      timeout: 10s
      retries: 3

  grafana:
    image: grafana/grafana-oss:latest
    container_name: shorthnd-grafana
    restart: unless-stopped
    ports:
      - '127.0.0.1:3001:3000'  # Bind to localhost only
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
      GF_SERVER_ROOT_URL: https://grafana.vikalpshorthand.com
      GF_SERVER_DOMAIN: grafana.vikalpshorthand.com
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/provisioning/dashboards:/etc/grafana/provisioning/dashboards:ro
    depends_on:
      - prometheus
      - loki
    networks:
      - monitoring
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  monitoring:
    driver: bridge

volumes:
  grafana-storage:
  prometheus-data:
  loki-data:
```

**Key Production Changes:**
1. All ports bound to `127.0.0.1` (only accessible via Nginx reverse proxy)
2. Added `restart: unless-stopped` for all services
3. Added health checks for all services
4. Added persistent volumes for Prometheus and Loki data
5. Configured Grafana's root URL for proper subdomain access

---

## 6. Configure Nginx

### Step 1: Remove Default Nginx Configuration

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### Step 2: Create Nginx Configuration for API

```bash
sudo nano /etc/nginx/sites-available/apitest.vikalpshorthand.com
```

```nginx
# API Backend Configuration
server {
    listen 80;
    server_name apitest.vikalpshorthand.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Request size limit
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/api-access.log;
    error_log /var/log/nginx/api-error.log;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # Proxy headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache settings
        proxy_cache_bypass $http_upgrade;
    }

    # Metrics endpoint (restrict access if needed)
    location /metrics {
        proxy_pass http://127.0.0.1:3000/metrics;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # Optional: Restrict access to Prometheus only
        allow 127.0.0.1;  # Allow localhost
        deny all;         # Deny all others
    }
}
```

### Step 3: Create Nginx Configuration for Grafana

```bash
sudo nano /etc/nginx/sites-available/grafana.vikalpshorthand.com
```

```nginx
# Grafana Configuration
server {
    listen 80;
    server_name grafana.vikalpshorthand.com;

    # Logging
    access_log /var/log/nginx/grafana-access.log;
    error_log /var/log/nginx/grafana-error.log;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        
        # Proxy headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Grafana specific
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    # WebSocket support for live updates
    location /api/live/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### Step 4: Create Nginx Configuration for Prometheus

```bash
sudo nano /etc/nginx/sites-available/prometheus.vikalpshorthand.com
```

```nginx
# Prometheus Configuration
server {
    listen 80;
    server_name prometheus.vikalpshorthand.com;

    # Logging
    access_log /var/log/nginx/prometheus-access.log;
    error_log /var/log/nginx/prometheus-error.log;

    # Optional: Add authentication for production
    # auth_basic "Prometheus";
    # auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:9090;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 5: Create Nginx Configuration for Loki

```bash
sudo nano /etc/nginx/sites-available/loki.vikalpshorthand.com
```

```nginx
# Loki Configuration
server {
    listen 80;
    server_name loki.vikalpshorthand.com;

    # Logging
    access_log /var/log/nginx/loki-access.log;
    error_log /var/log/nginx/loki-error.log;

    # Optional: Add authentication for production
    # auth_basic "Loki";
    # auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 6: Enable Nginx Sites

```bash
# Create symbolic links to enable sites
sudo ln -s /etc/nginx/sites-available/apitest.vikalpshorthand.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/grafana.vikalpshorthand.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/prometheus.vikalpshorthand.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/loki.vikalpshorthand.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Should output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx
sudo systemctl reload nginx
```

---

## 7. SSL/TLS Certificates

### Step 1: Obtain SSL Certificates with Certbot

```bash
# Get certificates for all subdomains
sudo certbot --nginx -d apitest.vikalpshorthand.com
sudo certbot --nginx -d grafana.vikalpshorthand.com
sudo certbot --nginx -d prometheus.vikalpshorthand.com
sudo certbot --nginx -d loki.vikalpshorthand.com
```

**During the process:**
1. Enter your email address
2. Agree to Terms of Service
3. Choose whether to redirect HTTP to HTTPS (choose option 2: Redirect)

Certbot will automatically:
- Obtain certificates from Let's Encrypt
- Update Nginx configurations
- Setup automatic renewal

### Step 2: Verify SSL Certificates

```bash
# Check certificate renewal
sudo certbot renew --dry-run

# List all certificates
sudo certbot certificates
```

### Step 3: Setup Auto-Renewal (Should be automatic, but verify)

```bash
# Check if renewal timer is active
sudo systemctl status certbot.timer

# If not active, enable it
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Step 4: Verify HTTPS Access

Visit in your browser:
- `https://apitest.vikalpshorthand.com` (should show API welcome message)
- `https://grafana.vikalpshorthand.com` (should show Grafana login)
- `https://prometheus.vikalpshorthand.com` (should show Prometheus UI)
- `https://loki.vikalpshorthand.com` (should show Loki metrics)

---

## 8. Production Environment Variables

### Update CORS in Your Application

Edit `src/app.js` to add production domains:

```javascript
const allowedOrigins = [
  'https://vikalpshorthand.com',
  'https://www.vikalpshorthand.com',
  'https://apitest.vikalpshorthand.com',
  process.env.FRONTEND_URL
].filter(Boolean);
```

### Update Loki URL in Backend

In `docker-compose.prod.yml`, the `LOKI_URL` should be:
```yaml
LOKI_URL: http://loki:3100
```

### Update Prometheus Targets

Edit `prometheus.yml`:

```yaml
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
          - 'backend:3000'
```

---

## 9. Deploy with Docker

### Step 1: Build and Start Services

```bash
# Navigate to application directory
cd ~/apps/backend

# Build Docker images
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker-compose -f docker-compose.prod.yml ps
```

**Expected output:**
```
NAME                   IMAGE                          STATUS         PORTS
shorthnd-backend       backend-backend                Up (healthy)   127.0.0.1:3000->3000/tcp
shorthnd-grafana       grafana/grafana-oss:latest     Up (healthy)   127.0.0.1:3001->3000/tcp
shorthnd-loki          grafana/loki:3.1.1             Up (healthy)   127.0.0.1:3100->3100/tcp
shorthnd-prometheus    prom/prometheus:latest         Up (healthy)   127.0.0.1:9090->9090/tcp
```

### Step 2: Check Logs

```bash
# View logs for all services
docker-compose -f docker-compose.prod.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f grafana
```

### Step 3: Verify Services

```bash
# Check backend health
curl http://localhost:3000/

# Check Prometheus
curl http://localhost:9090/-/healthy

# Check Loki
curl http://localhost:3100/ready

# Check Grafana
curl http://localhost:3001/api/health
```

---

## 10. Monitoring Access

### Access Your Services

1. **API**: https://apitest.vikalpshorthand.com
2. **Grafana**: https://grafana.vikalpshorthand.com
   - Username: `admin`
   - Password: (from your `.env` file)
3. **Prometheus**: https://prometheus.vikalpshorthand.com
4. **Loki**: https://loki.vikalpshorthand.com

### Initial Grafana Setup

1. Login to Grafana at `https://grafana.vikalpshorthand.com`
2. Change admin password (Settings → Change Password)
3. Verify datasources are connected:
   - Go to Connections → Data Sources
   - Check Prometheus and Loki show green checkmark
4. View dashboards:
   - Go to Dashboards
   - Open "Node.js API - Detailed Monitoring"

---

## 11. Security Hardening

### Step 1: Add HTTP Authentication for Prometheus and Loki

```bash
# Install apache2-utils for htpasswd
sudo apt install -y apache2-utils

# Create password file
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Enter password when prompted
```

Uncomment the auth lines in Prometheus and Loki Nginx configs:

```nginx
auth_basic "Prometheus";
auth_basic_user_file /etc/nginx/.htpasswd;
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 2: Setup Firewall Rules

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Enable firewall
sudo ufw enable
```

### Step 3: Disable Password Authentication for SSH

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

Change these lines:
```
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### Step 4: Install Fail2Ban (Prevent Brute Force)

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
sudo nano /etc/fail2ban/jail.local
```

Add/modify:
```ini
[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/*error.log
```

Start Fail2Ban:
```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status
```

### Step 5: Regular Updates

Create a script for automatic updates:

```bash
sudo nano /usr/local/bin/system-update.sh
```

```bash
#!/bin/bash
apt update
apt upgrade -y
apt autoremove -y
docker system prune -af --volumes
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/system-update.sh
```

Setup cron job (run weekly):
```bash
sudo crontab -e
```

Add:
```
0 3 * * 0 /usr/local/bin/system-update.sh >> /var/log/system-update.log 2>&1
```

---

## 12. Maintenance and Troubleshooting

### Common Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service_name]

# Restart a service
docker-compose -f docker-compose.prod.yml restart [service_name]

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# View resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

### Update Application (Git Pull)

```bash
# Navigate to app directory
cd ~/apps/backend

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# View logs to verify
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Check Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/api-access.log
sudo tail -f /var/log/nginx/grafana-access.log

# Error logs
sudo tail -f /var/log/nginx/api-error.log
sudo tail -f /var/log/nginx/grafana-error.log
```

### Check System Resources

```bash
# Disk space
df -h

# Memory usage
free -m

# CPU usage
top

# Docker resource usage
docker stats
```

### Backup Important Data

```bash
# Create backup script
nano ~/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm -v grafana-storage:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/grafana-$DATE.tar.gz -C /data .
docker run --rm -v prometheus-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/prometheus-$DATE.tar.gz -C /data .
docker run --rm -v loki-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/loki-$DATE.tar.gz -C /data .

# Backup environment files
cp ~/apps/backend/.env $BACKUP_DIR/.env-$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable and schedule:
```bash
chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add:
```
0 2 * * * /home/deploy/backup.sh >> /home/deploy/backup.log 2>&1
```

### Troubleshooting Common Issues

#### Issue 1: Containers Not Starting

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs

# Check Docker daemon
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker
```

#### Issue 2: SSL Certificate Renewal Fails

```bash
# Manually renew
sudo certbot renew --force-renewal

# Check renewal timer
sudo systemctl status certbot.timer

# View Certbot logs
sudo cat /var/log/letsencrypt/letsencrypt.log
```

#### Issue 3: High Memory Usage

```bash
# Check which container is using memory
docker stats

# Restart memory-heavy container
docker-compose -f docker-compose.prod.yml restart [service_name]

# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Issue 4: Nginx Configuration Issues

```bash
# Test configuration
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

#### Issue 5: MongoDB Connection Issues

```bash
# If using local MongoDB
sudo systemctl status mongod
sudo systemctl restart mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# If using MongoDB Atlas, verify:
# 1. IP whitelist includes VPS IP
# 2. Connection string is correct
# 3. Network access is allowed
```

### Monitoring Health

Create a simple health check script:

```bash
nano ~/health-check.sh
```

```bash
#!/bin/bash

echo "=== Health Check Report ==="
echo "Date: $(date)"
echo ""

# Check API
echo "API Status:"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/ || echo "FAILED"

# Check Grafana
echo "Grafana Status:"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/health || echo "FAILED"

# Check Prometheus
echo "Prometheus Status:"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9090/-/healthy || echo "FAILED"

# Check Loki
echo "Loki Status:"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/ready || echo "FAILED"

# Check disk space
echo ""
echo "Disk Space:"
df -h / | tail -1

# Check memory
echo ""
echo "Memory Usage:"
free -m | grep Mem | awk '{print "Used: " $3 "MB / Total: " $2 "MB (" int($3/$2*100) "%)"}'

echo ""
echo "=== End of Report ==="
```

Make it executable:
```bash
chmod +x ~/health-check.sh

# Run it
./health-check.sh
```

---

## Quick Reference Commands

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Stop all services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart a service
docker-compose -f docker-compose.prod.yml restart backend

# Rebuild and deploy
cd ~/apps/backend
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# Check Nginx
sudo nginx -t
sudo systemctl reload nginx

# Renew SSL certificates
sudo certbot renew

# View system resources
htop
docker stats

# Clean up Docker
docker system prune -a

# Backup
~/backup.sh

# Health check
~/health-check.sh
```

---

## Post-Deployment Checklist

- [ ] DNS records configured and propagated
- [ ] VPS firewall configured (ports 22, 80, 443)
- [ ] Docker and Docker Compose installed
- [ ] Nginx installed and configured
- [ ] SSL certificates obtained and auto-renewal enabled
- [ ] Application deployed and running
- [ ] All subdomains accessible via HTTPS
- [ ] Grafana dashboards working
- [ ] Prometheus collecting metrics
- [ ] Loki receiving logs
- [ ] MongoDB connection working
- [ ] CORS configured for frontend
- [ ] Strong passwords set for Grafana and sensitive endpoints
- [ ] SSH key authentication enabled, password auth disabled
- [ ] Fail2Ban installed and configured
- [ ] Backup script created and scheduled
- [ ] Health check script created
- [ ] Monitoring alerts configured (optional)

---

## Support and Monitoring

### Set Up Monitoring Alerts (Optional but Recommended)

Configure Grafana alerts for:
1. High error rates (>5% 5xx errors)
2. High response times (>2s average)
3. Low disk space (<20% free)
4. High memory usage (>80%)
5. Container down/unhealthy

### Resources

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)

---

**Congratulations! Your application is now production-ready and deployed! 🎉**

Access your services:
- 🌐 **API**: https://apitest.vikalpshorthand.com
- 📊 **Grafana**: https://grafana.vikalpshorthand.com
- 📈 **Prometheus**: https://prometheus.vikalpshorthand.com
- 📝 **Loki**: https://loki.vikalpshorthand.com

