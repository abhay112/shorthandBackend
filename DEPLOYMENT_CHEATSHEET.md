# 🚀 Deployment Cheat Sheet

Quick reference for common deployment tasks.

---

## 📦 Initial Setup (One-Time)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Firewall
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

---

## 🔐 DNS Records (Hostinger)

```
Type    Host            Value               TTL
A       api             <YOUR_VPS_IP>       3600
A       grafana         <YOUR_VPS_IP>       3600
A       prometheus      <YOUR_VPS_IP>       3600
A       loki            <YOUR_VPS_IP>       3600
```

---

## 🚀 Deploy Application

```bash
# Clone repo
cd ~/apps && git clone <REPO_URL> backend && cd backend

# Configure environment
cp env.production.template .env && nano .env

# Deploy
chmod +x deploy.sh && ./deploy.sh
```

---

## 🔒 Get SSL Certificates

```bash
sudo certbot --nginx -d apitest.vikalpshorthand.com
sudo certbot --nginx -d grafana.vikalpshorthand.com
sudo certbot --nginx -d prometheus.vikalpshorthand.com
sudo certbot --nginx -d loki.vikalpshorthand.com
```

---

## 🔄 Update Application

```bash
cd ~/apps/backend && git pull && ./deploy.sh
```

---

## 📊 Container Management

```bash
# Start all
docker-compose -f docker-compose.prod.yml up -d

# Stop all
docker-compose -f docker-compose.prod.yml down

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View backend logs only
docker-compose -f docker-compose.prod.yml logs -f backend

# Check status
docker-compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats
```

---

## 🔍 Debugging

```bash
# Check if backend is responding
curl http://localhost:3000/

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx

# View Nginx logs
sudo tail -f /var/log/nginx/api-error.log
sudo tail -f /var/log/nginx/grafana-error.log

# Check SSL certificates
sudo certbot certificates

# Renew SSL manually
sudo certbot renew

# Check container logs
docker-compose -f docker-compose.prod.yml logs backend

# Get inside container
docker exec -it shorthnd-backend /bin/sh
```

---

## 🧹 Cleanup

```bash
# Clean Docker resources
docker system prune -a

# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

---

## 💾 Backup

```bash
# Backup Grafana data
docker run --rm -v grafana-storage:/data -v ~/backups:/backup alpine tar czf /backup/grafana-$(date +%Y%m%d).tar.gz -C /data .

# Backup Prometheus data
docker run --rm -v prometheus-data:/data -v ~/backups:/backup alpine tar czf /backup/prometheus-$(date +%Y%m%d).tar.gz -C /data .

# Backup Loki data
docker run --rm -v loki-data:/data -v ~/backups:/backup alpine tar czf /backup/loki-$(date +%Y%m%d).tar.gz -C /data .

# Backup .env
cp ~/apps/backend/.env ~/backups/.env-$(date +%Y%m%d)
```

---

## 🔐 Security

```bash
# Generate strong secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Create HTTP auth (for Prometheus/Loki)
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Check firewall status
sudo ufw status

# Install Fail2Ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📈 Monitoring URLs

- **API**: https://apitest.vikalpshorthand.com
- **Grafana**: https://grafana.vikalpshorthand.com
- **Prometheus**: https://prometheus.vikalpshorthand.com
- **Loki**: https://loki.vikalpshorthand.com

---

## 🆘 Common Issues

### 502 Bad Gateway
```bash
curl http://localhost:3000/  # Check backend
sudo systemctl restart nginx  # Restart Nginx
```

### Container Won't Start
```bash
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Out of Disk Space
```bash
df -h  # Check disk usage
docker system prune -a  # Clean Docker
```

### High Memory
```bash
docker stats  # Check usage
docker-compose -f docker-compose.prod.yml restart [service]
```

### MongoDB Timeout
- Check MongoDB Atlas IP whitelist
- Verify MONGO_URI in .env

---

## 📁 Important Files

```
/home/deploy/apps/backend/
├── .env                          # Environment variables
├── docker-compose.prod.yml       # Production config
├── prometheus.yml                # Prometheus config
├── deploy.sh                     # Deployment script
└── monitoring/
    └── grafana/
        └── provisioning/         # Grafana configs
```

```
/etc/nginx/sites-available/
├── apitest.vikalpshorthand.com
├── grafana.vikalpshorthand.com
├── prometheus.vikalpshorthand.com
└── loki.vikalpshorthand.com
```

---

## 🔄 Nginx Config Template

```nginx
server {
    listen 80;
    server_name apitest.vikalpshorthand.com;
    
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

---

## 🎯 Health Check Script

```bash
#!/bin/bash
echo "=== Health Check ==="
curl -s -o /dev/null -w "API: %{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "Grafana: %{http_code}\n" http://localhost:3001/api/health
curl -s -o /dev/null -w "Prometheus: %{http_code}\n" http://localhost:9090/-/healthy
curl -s -o /dev/null -w "Loki: %{http_code}\n" http://localhost:3100/ready
df -h / | tail -1
free -m | grep Mem
```

---

## 📋 Environment Variables Checklist

```bash
# Required in .env
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://...
SESSION_SECRET=<strong-secret>
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FRONTEND_URL=https://vikalpshorthand.com
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<strong-password>
LOKI_URL=http://loki:3100
ENABLE_LOKI_LOGS=true
```

---

## 🔗 Quick Links

- **Full Guide**: [Docs/PRODUCTION_DEPLOYMENT_GUIDE.md](./Docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- **Quick Start**: [Docs/DEPLOYMENT_QUICKSTART.md](./Docs/DEPLOYMENT_QUICKSTART.md)
- **Overview**: [DEPLOYMENT_README.md](./DEPLOYMENT_README.md)

---

**Print this and keep it handy! 📄**

