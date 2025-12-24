# Nginx Configuration for Monitoring Services (Grafana, Prometheus, Loki)

This guide provides step-by-step instructions for setting up Nginx reverse proxy configurations for Grafana, Prometheus, and Loki monitoring services.

## Quick Start: Automated Setup

**For automated setup, use the provided script:**

```bash
# Make script executable
chmod +x scripts/setup-nginx-monitoring.sh

# Run as root
sudo bash scripts/setup-nginx-monitoring.sh
```

**For complete one-click deployment (including Docker, monitoring stack, and Nginx):**

```bash
# See Docs/ONE_CLICK_DEPLOYMENT_GUIDE.md for full instructions
sudo bash scripts/setup-full-stack.sh
```

The script will:
- ✅ Install all required dependencies (Nginx, Certbot, etc.)
- ✅ Detect backend port automatically
- ✅ Create all Nginx configuration files
- ✅ Enable sites and test configuration
- ✅ Optionally set up SSL certificates
- ✅ Safe to run multiple times (idempotent)

**What you need:**
- Just the `setup-nginx-monitoring.sh` script and `package.json` in your project directory
- DNS records configured (optional for SSL setup)
- Services running (or script will warn you)

**Manual setup instructions are below if you prefer step-by-step control.**

---

## Overview

The monitoring stack consists of:
- **Backend API**: Main application (runs on port 3000 or 5001)
- **Grafana**: Visualization and dashboards (runs on port 3001)
- **Prometheus**: Metrics collection and storage (runs on port 9090)
- **Loki**: Log aggregation (runs on port 3100)

All services are accessible via subdomains with SSL certificates:
- `api.vikalpshorthand.com` (Backend API)
- `grafana.vikalpshorthand.com`
- `prometheus.vikalpshorthand.com`
- `loki.vikalpshorthand.com`

---

## Prerequisites

1. **Nginx installed** on your server
2. **Certbot installed** for SSL certificates
3. **Docker and Docker Compose** running the monitoring services
4. **DNS records** configured for the subdomains:
   - `grafana.vikalpshorthand.com` → Your server IP
   - `prometheus.vikalpshorthand.com` → Your server IP
   - `loki.vikalpshorthand.com` → Your server IP

---

## Step 1: Verify Monitoring Services are Running

First, ensure your monitoring services are running and accessible on localhost:

```bash
# Check if services are running
docker ps | grep -E "grafana|prometheus|loki"

# Test local connectivity
curl http://127.0.0.1:3001/api/health  # Grafana
curl http://127.0.0.1:9090/-/healthy   # Prometheus
curl http://127.0.0.1:3100/ready      # Loki
```

Expected output:
- Grafana should return a health status
- Prometheus should return "Prometheus is Healthy"
- Loki should return "ready"

---

## Step 2: Create Nginx Configuration Files

The automated script (`scripts/setup-nginx-monitoring.sh`) will create these files automatically. If you're setting up manually, the script will generate the configurations for you.

**Note**: The nginx configuration files are now generated automatically by the setup script. You don't need to copy them manually.

---

## Step 3: Enable Nginx Sites

Create symbolic links to enable the sites:

```bash
# Enable Grafana
sudo ln -s /etc/nginx/sites-available/grafana.vikalpshorthand.com /etc/nginx/sites-enabled/

# Enable Prometheus
sudo ln -s /etc/nginx/sites-available/prometheus.vikalpshorthand.com /etc/nginx/sites-enabled/

# Enable Loki
sudo ln -s /etc/nginx/sites-available/loki.vikalpshorthand.com /etc/nginx/sites-enabled/
```

---

## Step 4: Test Nginx Configuration

Before proceeding, test your Nginx configuration for syntax errors:

```bash
# Test Nginx configuration
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

If there are errors, fix them before proceeding.

---

## Step 5: Obtain SSL Certificates with Certbot

Obtain SSL certificates for each subdomain:

### 5.1 Grafana SSL Certificate

```bash
sudo certbot --nginx -d grafana.vikalpshorthand.com
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 5.2 Prometheus SSL Certificate

```bash
sudo certbot --nginx -d prometheus.vikalpshorthand.com
```

### 5.3 Loki SSL Certificate

```bash
sudo certbot --nginx -d loki.vikalpshorthand.com
```

**Note:** Certbot will automatically modify your Nginx configuration files to include SSL settings.

---

## Step 6: Reload Nginx

After obtaining SSL certificates, reload Nginx to apply changes:

```bash
# Reload Nginx configuration
sudo systemctl reload nginx

# Or restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

---

## Step 7: Verify Access

Test access to each service:

### 7.1 Test Grafana

```bash
# Test HTTP redirect
curl -I http://grafana.vikalpshorthand.com

# Test HTTPS access
curl -I https://grafana.vikalpshorthand.com
```

Open in browser: `https://grafana.vikalpshorthand.com`

### 7.2 Test Prometheus

```bash
# Test HTTP redirect
curl -I http://prometheus.vikalpshorthand.com

# Test HTTPS access
curl -I https://prometheus.vikalpshorthand.com
```

Open in browser: `https://prometheus.vikalpshorthand.com`

### 7.3 Test Loki

```bash
# Test HTTP redirect
curl -I http://loki.vikalpshorthand.com

# Test HTTPS access
curl -I https://loki.vikalpshorthand.com
```

Open in browser: `https://loki.vikalpshorthand.com`

---

## Step 8: Configure Grafana Root URL (Important)

Update your `docker-compose.prod.yml` to set Grafana's root URL:

```yaml
grafana:
  environment:
    GF_SERVER_ROOT_URL: https://grafana.vikalpshorthand.com
    GF_SERVER_DOMAIN: grafana.vikalpshorthand.com
```

Then restart Grafana:

```bash
docker-compose -f docker-compose.prod.yml restart grafana
```

---

## Step 9: Set Up Basic Authentication (Optional but Recommended)

For additional security, especially for Prometheus and Loki, you can add basic authentication.

### 9.1 Install Apache2 Utils

```bash
sudo apt-get update
sudo apt-get install apache2-utils
```

### 9.2 Create Password File for Prometheus

```bash
sudo htpasswd -c /etc/nginx/.htpasswd-prometheus admin
```

Enter a strong password when prompted.

### 9.3 Create Password File for Loki

```bash
sudo htpasswd -c /etc/nginx/.htpasswd-loki admin
```

### 9.4 Update Nginx Configurations

Add authentication to Prometheus config:

```bash
# Edit the Prometheus nginx config
sudo nano /etc/nginx/sites-available/prometheus.vikalpshorthand.com
```

Add inside the `location /` block:
```nginx
auth_basic "Prometheus Access";
auth_basic_user_file /etc/nginx/.htpasswd-prometheus;
```

Add authentication to Loki config:

```bash
# Edit the Loki nginx config
sudo nano /etc/nginx/sites-available/loki.vikalpshorthand.com
```

Add inside the `location /` block:
```nginx
auth_basic "Loki Access";
auth_basic_user_file /etc/nginx/.htpasswd-loki;
```

Reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 10: Configure Auto-Renewal for SSL Certificates

Certbot certificates expire after 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot should already have a cron job, but verify:
sudo systemctl status certbot.timer
```

If the timer is not active:

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Configuration Details

### Port Mappings

Based on `docker-compose.prod.yml`:
- **Grafana**: Container port 3000 → Host port 3001
- **Prometheus**: Container port 9090 → Host port 9090
- **Loki**: Container port 3100 → Host port 3100

### Nginx Proxy Settings

All configurations include:
- **WebSocket support** for real-time updates
- **Proper headers** for X-Forwarded-For, X-Real-IP, etc.
- **SSL/TLS** with Let's Encrypt certificates
- **HTTP to HTTPS redirect** for security

### Security Considerations

1. **Firewall**: Ensure ports 80 and 443 are open
2. **Access Control**: Consider IP whitelisting for Prometheus and Loki
3. **Rate Limiting**: Add rate limiting if needed
4. **Basic Auth**: Implemented for Prometheus and Loki (optional)

---

## Troubleshooting

### Issue: 502 Bad Gateway

**Solution:**
```bash
# Check if services are running
docker ps

# Check service logs
docker logs shorthnd-grafana
docker logs shorthnd-prometheus
docker logs shorthnd-loki

# Verify ports are accessible
netstat -tlnp | grep -E "3001|9090|3100"
```

### Issue: SSL Certificate Errors

**Solution:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: DNS Not Resolving

**Solution:**
```bash
# Test DNS resolution
nslookup grafana.vikalpshorthand.com
dig grafana.vikalpshorthand.com

# Verify DNS records point to your server IP
```

### Issue: Nginx Configuration Errors

**Solution:**
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Verify file permissions
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
```

---

## Maintenance

### Regular Tasks

1. **Monitor SSL Certificate Expiry:**
   ```bash
   sudo certbot certificates
   ```

2. **Check Service Health:**
   ```bash
   curl https://grafana.vikalpshorthand.com/api/health
   curl https://prometheus.vikalpshorthand.com/-/healthy
   curl https://loki.vikalpshorthand.com/ready
   ```

3. **Review Nginx Access Logs:**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```

4. **Update Services:**
   ```bash
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

---

## Summary

After completing these steps, you should have:

✅ Nginx reverse proxy configured for all three monitoring services  
✅ SSL certificates installed and auto-renewing  
✅ Services accessible via HTTPS subdomains  
✅ Proper security headers and WebSocket support  
✅ Health check endpoints configured  

**Access URLs:**
- Grafana: `https://grafana.vikalpshorthand.com`
- Prometheus: `https://prometheus.vikalpshorthand.com`
- Loki: `https://loki.vikalpshorthand.com`

---

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/latest/)

