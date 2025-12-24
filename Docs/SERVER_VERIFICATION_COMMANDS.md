# Server Verification Commands

Quick reference guide for verifying your deployment on the production server.

## Quick Verification Script

Run the automated verification script:

```bash
bash scripts/verify-server-deployment.sh
```

This will check:
- ✅ Docker containers status
- ✅ Service health (localhost)
- ✅ Nginx configuration
- ✅ SSL certificates
- ✅ External access (domains)
- ✅ Port availability
- ✅ System resources
- ✅ Recent errors

---

## Manual Verification Commands

### 1. Check Docker Containers

```bash
# Check all containers status
docker-compose -f docker-compose.prod.yml ps

# Or using docker directly
docker ps | grep shorthnd

# Check specific container
docker ps | grep shorthnd-backend
docker ps | grep shorthnd-grafana
docker ps | grep shorthnd-prometheus
docker ps | grep shorthnd-loki
```

**Expected Output**: All containers should show "Up" status

---

### 2. Check Service Health (Localhost)

```bash
# Backend API (port 5001)
curl -I http://127.0.0.1:5001/
curl http://127.0.0.1:5001/

# Grafana (port 3001)
curl -I http://127.0.0.1:3001/api/health
curl http://127.0.0.1:3001/api/health

# Prometheus (port 9090)
curl -I http://127.0.0.1:9090/-/healthy
curl http://127.0.0.1:9090/-/healthy

# Loki (port 3100)
curl -I http://127.0.0.1:3100/ready
curl http://127.0.0.1:3100/ready
```

**Expected Output**: HTTP 200 OK responses

---

### 3. Check Nginx Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check enabled sites
ls -la /etc/nginx/sites-enabled/

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

**Expected Output**: 
- `nginx -t` should show "syntax is ok" and "test is successful"
- Nginx service should be "active (running)"
- All 4 domain configs should be in sites-enabled

---

### 4. Check SSL Certificates

```bash
# List all certificates
sudo certbot certificates

# Check certificate for specific domain
sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/api.vikalpshorthand.com/cert.pem

# Check certificate expiry for all domains
for domain in api.vikalpshorthand.com grafana.vikalpshorthand.com prometheus.vikalpshorthand.com loki.vikalpshorthand.com; do
    echo "=== $domain ==="
    sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/$domain/cert.pem 2>/dev/null || echo "Certificate not found"
done
```

**Expected Output**: Certificates should exist and not be expired

---

### 5. Check External Access (Domains)

```bash
# Test Backend API
curl -I https://api.vikalpshorthand.com
curl https://api.vikalpshorthand.com

# Test Grafana
curl -I https://grafana.vikalpshorthand.com
curl https://grafana.vikalpshorthand.com

# Test Prometheus
curl -I https://prometheus.vikalpshorthand.com
curl https://prometheus.vikalpshorthand.com

# Test Loki
curl -I https://loki.vikalpshorthand.com
curl https://loki.vikalpshorthand.com
```

**Expected Output**: HTTP 200 OK responses (or redirects for HTTPS)

---

### 6. Check Port Availability

```bash
# Check if ports are in use
sudo lsof -i :5001  # Backend
sudo lsof -i :3001  # Grafana
sudo lsof -i :9090  # Prometheus
sudo lsof -i :3100  # Loki

# Or using netstat
sudo netstat -tlnp | grep :5001
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :9090
sudo netstat -tlnp | grep :3100
```

**Expected Output**: Ports should be in use by Docker containers

---

### 7. Check Service Logs

```bash
# View all service logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f grafana
docker-compose -f docker-compose.prod.yml logs -f prometheus
docker-compose -f docker-compose.prod.yml logs -f loki

# View last 50 lines
docker-compose -f docker-compose.prod.yml logs --tail=50

# View logs with timestamps
docker-compose -f docker-compose.prod.yml logs -f --timestamps
```

---

### 8. Check System Resources

```bash
# Disk space
df -h

# Docker disk usage
docker system df

# Memory usage
free -h

# CPU and memory by container
docker stats
```

---

### 9. Test from Browser

Open these URLs in your browser:

- **Backend API**: https://api.vikalpshorthand.com
- **Grafana**: https://grafana.vikalpshorthand.com
  - Username: `admin`
  - Password: (from your `.env` file)
- **Prometheus**: https://prometheus.vikalpshorthand.com
- **Loki**: https://loki.vikalpshorthand.com

**Expected**: All should load without SSL errors

---

### 10. Quick Health Check (One Command)

```bash
# Quick check - all services
echo "=== Docker Containers ===" && \
docker-compose -f docker-compose.prod.yml ps && \
echo "" && \
echo "=== Service Health ===" && \
echo "Backend:" && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/ && echo "" && \
echo "Grafana:" && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health && echo "" && \
echo "Prometheus:" && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9090/-/healthy && echo "" && \
echo "Loki:" && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/ready && echo "" && \
echo "=== Nginx ===" && \
sudo nginx -t 2>&1 | grep -q "successful" && echo "Nginx config: OK" || echo "Nginx config: ERROR"
```

---

## Troubleshooting Commands

### If Services Are Not Running

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# View error logs
docker-compose -f docker-compose.prod.yml logs --tail=50 | grep -i error
```

### If Nginx Is Not Working

```bash
# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx error log
sudo tail -50 /var/log/nginx/error.log

# Test configuration
sudo nginx -t
```

### If SSL Certificates Are Missing

```bash
# Install certificate for a domain
sudo certbot --nginx -d api.vikalpshorthand.com

# Renew all certificates
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### If Ports Are Not Accessible

```bash
# Check firewall
sudo ufw status

# Allow ports if needed
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check if services are listening
sudo netstat -tlnp | grep -E ":(80|443|5001|3001|9090|3100)"
```

---

## Summary Checklist

Run through this checklist to verify everything:

- [ ] All Docker containers are running (`docker-compose ps`)
- [ ] Backend API responds on localhost:5001
- [ ] Grafana responds on localhost:3001
- [ ] Prometheus responds on localhost:9090
- [ ] Loki responds on localhost:3100
- [ ] Nginx configuration is valid (`nginx -t`)
- [ ] Nginx service is running (`systemctl status nginx`)
- [ ] SSL certificates exist for all domains
- [ ] All domains are accessible via HTTPS
- [ ] No errors in Docker logs
- [ ] No errors in Nginx logs
- [ ] Sufficient disk space available
- [ ] Services accessible from browser

---

## Quick Reference

**Most Important Commands:**

```bash
# Status check
docker-compose -f docker-compose.prod.yml ps

# Health check
curl http://127.0.0.1:5001/ && curl http://127.0.0.1:3001/api/health

# Nginx check
sudo nginx -t && sudo systemctl status nginx

# Full verification
bash scripts/verify-server-deployment.sh
```

---

For detailed troubleshooting, see:
- `Docs/ONE_CLICK_DEPLOYMENT_GUIDE.md` - Deployment guide
- `Docs/NGINX_MONITORING_SETUP.md` - Nginx setup guide

