# Production Deployment - Quick Start

**⚡ Fast track guide to deploy your application on Hostinger VPS**

For detailed instructions, see [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)

---

## Prerequisites Checklist

- [ ] VPS from Hostinger (4GB RAM minimum)
- [ ] Domain: `vikalpshorthand.com`
- [ ] SSH access to VPS
- [ ] MongoDB Atlas account (or local MongoDB)
- [ ] Firebase project with service account

---

## 1. DNS Configuration (Do this first!)

Login to Hostinger → Domains → DNS/Nameservers

Add these A records (replace with your VPS IP):

```
Type    Host            Value               TTL
A       api             <YOUR_VPS_IP>       3600
A       grafana         <YOUR_VPS_IP>       3600
A       prometheus      <YOUR_VPS_IP>       3600
A       loki            <YOUR_VPS_IP>       3600
```

**⏰ Wait 5-30 minutes for DNS propagation**

---

## 2. Server Setup (Run on VPS)

```bash
# SSH into your VPS
ssh root@<YOUR_VPS_IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install -y nginx

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**🔄 Logout and login again for Docker group changes to take effect**

---

## 3. Deploy Application

```bash
# Create app directory
mkdir -p ~/apps && cd ~/apps

# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git backend
cd backend

# Create .env file
cp env.production.template .env
nano .env
# ⚠️ Fill in all required values (MongoDB URI, Firebase credentials, etc.)

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

---

## 4. Configure Nginx

```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Create API config
sudo nano /etc/nginx/sites-available/apitest.vikalpshorthand.com
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name apitest.vikalpshorthand.com;
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

**Create Grafana config:**
```bash
sudo nano /etc/nginx/sites-available/grafana.vikalpshorthand.com
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name grafana.vikalpshorthand.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
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

**Create Prometheus config:**
```bash
sudo nano /etc/nginx/sites-available/prometheus.vikalpshorthand.com
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name prometheus.vikalpshorthand.com;

    location / {
        proxy_pass http://127.0.0.1:9090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Create Loki config:**
```bash
sudo nano /etc/nginx/sites-available/loki.vikalpshorthand.com
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name loki.vikalpshorthand.com;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable all sites:**
```bash
sudo ln -s /etc/nginx/sites-available/apitest.vikalpshorthand.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/grafana.vikalpshorthand.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/prometheus.vikalpshorthand.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/loki.vikalpshorthand.com /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Install SSL Certificates

```bash
# Get certificates (run these one by one)
sudo certbot --nginx -d apitest.vikalpshorthand.com
sudo certbot --nginx -d grafana.vikalpshorthand.com
sudo certbot --nginx -d prometheus.vikalpshorthand.com
sudo certbot --nginx -d loki.vikalpshorthand.com

# Choose option 2 (Redirect) when asked
```

**✅ Certbot will automatically configure HTTPS and set up auto-renewal**

---

## 6. Verify Deployment

Visit these URLs in your browser:

- ✅ **API**: https://apitest.vikalpshorthand.com
  - Should show: `{"success":true,"message":"Shorthand Typing Test API is running!"...}`

- ✅ **Grafana**: https://grafana.vikalpshorthand.com
  - Login: `admin` / (password from .env)
  - Check dashboards → Node.js API monitoring

- ✅ **Prometheus**: https://prometheus.vikalpshorthand.com
  - Check Status → Targets (all should be UP)

- ✅ **Loki**: https://loki.vikalpshorthand.com
  - Should show metrics page

---

## 7. Post-Deployment

### Change Grafana Password
```bash
# Access Grafana → User icon → Change password
```

### Setup Monitoring Alerts
```bash
# In Grafana → Alerting → New alert rule
# Create alerts for:
# - High error rate (>5%)
# - High response time (>2s)
# - Container down
```

### Create Backup Script
```bash
nano ~/backup.sh
```

Paste:
```bash
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker run --rm -v grafana-storage:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/grafana-$DATE.tar.gz -C /data .
docker run --rm -v prometheus-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/prometheus-$DATE.tar.gz -C /data .
docker run --rm -v loki-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/loki-$DATE.tar.gz -C /data .

cp ~/apps/backend/.env $BACKUP_DIR/.env-$DATE
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
echo "Backup completed: $DATE"
```

Make it executable and schedule:
```bash
chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/YOUR_USER/backup.sh >> /home/YOUR_USER/backup.log 2>&1
```

---

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend

# Deploy updates
cd ~/apps/backend
git pull
./deploy.sh

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check system resources
docker stats
df -h
free -m

# View Nginx logs
sudo tail -f /var/log/nginx/api-error.log
sudo tail -f /var/log/nginx/grafana-error.log

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Renew SSL certificates (automatic, but manual command)
sudo certbot renew

# Stop all containers
docker-compose -f docker-compose.prod.yml down

# Clean Docker resources
docker system prune -a
```

---

## Troubleshooting

### Container won't start
```bash
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml restart backend
```

### 502 Bad Gateway
```bash
# Check if backend is running
curl http://localhost:3000/

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### MongoDB connection timeout
```bash
# If using MongoDB Atlas:
# 1. Check if VPS IP is whitelisted
# 2. Verify connection string in .env
# 3. Test connection: docker-compose -f docker-compose.prod.yml logs backend | grep MongoDB
```

### SSL certificate error
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check Nginx config
sudo nginx -t
```

### High memory usage
```bash
# Check which container is using memory
docker stats

# Restart container
docker-compose -f docker-compose.prod.yml restart [service_name]

# Add swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Security Checklist

- [ ] Changed Grafana admin password
- [ ] Strong SESSION_SECRET in .env
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Firewall enabled (ports 22, 80, 443 only)
- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] Regular backups scheduled
- [ ] SSL certificates installed and auto-renewing

---

## Architecture Overview

```
Internet
   ↓
Nginx (Port 80/443)
   ↓
Docker Network (monitoring)
   ├── Backend (Node.js) → Port 3000
   │     ↓
   │   MongoDB (Atlas or Local)
   │
   ├── Prometheus → Port 9090 (scrapes Backend /metrics)
   ├── Loki → Port 3100 (receives logs from Backend)
   └── Grafana → Port 3001 (queries Prometheus & Loki)
```

**Subdomains:**
- `apitest.vikalpshorthand.com` → Backend
- `grafana.vikalpshorthand.com` → Grafana
- `prometheus.vikalpshorthand.com` → Prometheus
- `loki.vikalpshorthand.com` → Loki

All traffic is encrypted with Let's Encrypt SSL certificates.

---

## Support

For detailed information:
- 📚 [Full Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- 📊 [Monitoring Guide](./MONITORING_IMPLEMENTATION_GUIDE.md)
- 🔧 [API Documentation](./COMPLETE_API_DOCUMENTATION.md)

---

**🎉 Congratulations! Your application is production-ready!**

Access URLs:
- 🌐 **API**: https://apitest.vikalpshorthand.com
- 📊 **Grafana**: https://grafana.vikalpshorthand.com
- 📈 **Prometheus**: https://prometheus.vikalpshorthand.com
- 📝 **Loki**: https://loki.vikalpshorthand.com

