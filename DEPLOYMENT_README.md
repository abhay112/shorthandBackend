# 🚀 Production Deployment Documentation

Complete guide for deploying your Node.js application with monitoring stack to production.

---

## 📚 Documentation Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[DEPLOYMENT_QUICKSTART.md](./Docs/DEPLOYMENT_QUICKSTART.md)** | Fast-track deployment steps | ⚡ Quick deployment (experienced users) |
| **[PRODUCTION_DEPLOYMENT_GUIDE.md](./Docs/PRODUCTION_DEPLOYMENT_GUIDE.md)** | Complete detailed guide | 📖 First-time deployment or detailed reference |
| **[MONITORING_IMPLEMENTATION_GUIDE.md](./Docs/MONITORING_IMPLEMENTATION_GUIDE.md)** | How monitoring works | 📊 Understanding the monitoring setup |
| **This File** | Overview and file reference | 🗺️ Navigation and understanding structure |

---

## 🎯 What You're Deploying

### Application Stack
```
┌─────────────────────────────────────────────────┐
│                   Internet                      │
│             (Your Domain + Subdomains)          │
└──────────────────┬──────────────────────────────┘
                   │
           ┌───────▼────────┐
           │  Nginx (SSL)   │  Port 80/443
           │ Reverse Proxy  │
           └───────┬────────┘
                   │
       ┌───────────┴────────────────┐
       │   Docker Network           │
       │   (monitoring)             │
       │                            │
       │  ┌──────────────────────┐  │
       │  │  Backend (Node.js)   │  │ Port 3000
       │  │  - Express API       │  │
       │  │  - Winston Logger    │  │
       │  │  - Prometheus Client │  │
       │  └──────┬───────────────┘  │
       │         │                   │
       │  ┌──────▼───────────────┐  │
       │  │  MongoDB             │  │ (Atlas or Local)
       │  │  - User data         │  │
       │  │  - Application data  │  │
       │  └──────────────────────┘  │
       │                            │
       │  ┌──────────────────────┐  │
       │  │  Prometheus          │  │ Port 9090
       │  │  - Scrapes /metrics  │  │
       │  │  - Stores metrics    │  │
       │  └──────────────────────┘  │
       │                            │
       │  ┌──────────────────────┐  │
       │  │  Loki                │  │ Port 3100
       │  │  - Receives logs     │  │
       │  │  - Stores logs       │  │
       │  └──────────────────────┘  │
       │                            │
       │  ┌──────────────────────┐  │
       │  │  Grafana             │  │ Port 3001
       │  │  - Dashboards        │  │
       │  │  - Queries Prom/Loki │  │
       │  └──────────────────────┘  │
       │                            │
       └────────────────────────────┘
```

### Subdomains
- **apitest.vikalpshorthand.com** → Node.js Backend API
- **grafana.vikalpshorthand.com** → Grafana Monitoring Dashboard
- **prometheus.vikalpshorthand.com** → Prometheus Metrics
- **loki.vikalpshorthand.com** → Loki Logs

---

## 📁 Important Files

### Configuration Files

| File | Purpose | Environment |
|------|---------|-------------|
| `docker-compose.yml` | Local development setup | Development |
| `docker-compose.prod.yml` | Production deployment | **Production** |
| `prometheus.yml` | Prometheus scrape configuration | Both |
| `.env` | Environment variables | Both (different values) |
| `env.production.template` | Production .env template | Production |
| `Dockerfile` | Backend container image | Both |

### Deployment Files

| File | Purpose | Usage |
|------|---------|-------|
| `deploy.sh` | Automated deployment script | Run on VPS |
| `Docs/PRODUCTION_DEPLOYMENT_GUIDE.md` | Complete step-by-step guide | Read before deploying |
| `Docs/DEPLOYMENT_QUICKSTART.md` | Quick reference guide | Quick deployment |

### Monitoring Files

| Path | Purpose |
|------|---------|
| `monitoring/grafana/provisioning/datasources/` | Auto-configure Prometheus & Loki |
| `monitoring/grafana/provisioning/dashboards/` | Auto-load dashboards |
| `src/monitoring/metrics.js` | Prometheus metrics collection |
| `src/utils/logger.js` | Winston + Loki logging |

---

## 🔧 Deployment Process Overview

### Phase 1: Pre-Deployment (On Your Computer)
1. ✅ Setup DNS records in Hostinger
2. ✅ Prepare MongoDB Atlas cluster (or plan local MongoDB)
3. ✅ Get Firebase service account credentials
4. ✅ Review and understand the deployment guide

### Phase 2: Server Setup (On VPS)
1. ✅ SSH into VPS
2. ✅ Install Docker & Docker Compose
3. ✅ Install Nginx
4. ✅ Install Certbot (SSL)
5. ✅ Configure firewall
6. ✅ Clone application repository

### Phase 3: Application Configuration (On VPS)
1. ✅ Create `.env` file from template
2. ✅ Configure all environment variables
3. ✅ Test Docker setup

### Phase 4: Nginx & SSL (On VPS)
1. ✅ Create Nginx configuration for each subdomain
2. ✅ Test Nginx configuration
3. ✅ Obtain SSL certificates with Certbot
4. ✅ Verify HTTPS access

### Phase 5: Deploy Application (On VPS)
1. ✅ Run `./deploy.sh` script
2. ✅ Verify all containers are running
3. ✅ Check application health
4. ✅ Test each service URL

### Phase 6: Post-Deployment (On VPS)
1. ✅ Change Grafana admin password
2. ✅ Setup monitoring alerts
3. ✅ Configure automated backups
4. ✅ Setup health monitoring
5. ✅ Document access credentials

---

## 🚦 Quick Start Commands

### First-Time Deployment

```bash
# 1. On your VPS
ssh root@<YOUR_VPS_IP>

# 2. Install prerequisites
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose nginx certbot python3-certbot-nginx

# 3. Clone and setup
mkdir -p ~/apps && cd ~/apps
git clone <YOUR_REPO_URL> backend
cd backend

# 4. Configure
cp env.production.template .env
nano .env  # Fill in your values

# 5. Deploy
chmod +x deploy.sh
./deploy.sh

# 6. Configure Nginx (see DEPLOYMENT_QUICKSTART.md for configs)
# 7. Get SSL certificates
sudo certbot --nginx -d apitest.vikalpshorthand.com
sudo certbot --nginx -d grafana.vikalpshorthand.com
```

### Updating Deployment

```bash
cd ~/apps/backend
git pull
./deploy.sh
```

### Common Operations

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart service
docker-compose -f docker-compose.prod.yml restart backend

# Check status
docker-compose -f docker-compose.prod.yml ps

# Stop all
docker-compose -f docker-compose.prod.yml down

# Start all
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔐 Security Checklist

Before going live, ensure:

- [ ] **Strong Passwords**: Changed all default passwords (Grafana, MongoDB, etc.)
- [ ] **Environment Variables**: `.env` has production values, not development
- [ ] **SSL Certificates**: All subdomains have valid HTTPS certificates
- [ ] **Firewall**: Only ports 22, 80, 443 are open
- [ ] **SSH Security**: Key-based authentication enabled, password auth disabled
- [ ] **Root Access**: Root login disabled, using sudo user
- [ ] **MongoDB**: Using MongoDB Atlas with IP whitelist OR local MongoDB with auth
- [ ] **Secrets**: SESSION_SECRET is strong and unique
- [ ] **CORS**: Only production domains are whitelisted
- [ ] **Fail2Ban**: Installed and configured to prevent brute force
- [ ] **Backups**: Automated backup script scheduled
- [ ] **Monitoring**: Grafana alerts configured for critical issues

---

## 🛠️ Troubleshooting Quick Reference

### Container Won't Start
```bash
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml restart backend
```

### 502 Bad Gateway
```bash
curl http://localhost:3000/  # Check if backend is up
sudo systemctl status nginx  # Check Nginx status
sudo tail -f /var/log/nginx/error.log  # Check logs
```

### MongoDB Connection Error
- Check MongoDB Atlas IP whitelist
- Verify MONGO_URI in `.env`
- Test connection string

### SSL Certificate Issues
```bash
sudo certbot certificates  # Check status
sudo certbot renew  # Renew manually
```

### High Memory Usage
```bash
docker stats  # Check which container
docker-compose -f docker-compose.prod.yml restart [service]
```

### DNS Not Resolving
```bash
nslookup apitest.vikalpshorthand.com  # Check DNS propagation
# Wait 5-30 minutes after DNS changes
```

---

## 📊 Monitoring Access

After deployment, access your monitoring tools:

1. **Grafana Dashboard**: https://grafana.vikalpshorthand.com
   - Login with credentials from `.env`
   - View pre-configured Node.js dashboard
   - Setup alerts for critical metrics

2. **Prometheus**: https://prometheus.vikalpshorthand.com
   - Check Status → Targets
   - Verify all targets are "UP"
   - Query metrics directly

3. **Loki**: https://loki.vikalpshorthand.com
   - Direct log access
   - Useful for debugging

---

## 🔄 Maintenance Tasks

### Daily
- Check Grafana dashboard for anomalies
- Review error logs if alerts trigger

### Weekly
- Review resource usage (CPU, memory, disk)
- Check for application updates
- Review access logs for suspicious activity

### Monthly
- Update system packages
- Review and test backups
- Check SSL certificate expiry dates
- Clean up old Docker images/volumes
- Review and update monitoring alerts

### Quarterly
- Rotate secrets and passwords
- Security audit
- Performance optimization review
- Update documentation

---

## 📞 Support Resources

### Documentation
- **Production Guide**: [PRODUCTION_DEPLOYMENT_GUIDE.md](./Docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- **Quick Start**: [DEPLOYMENT_QUICKSTART.md](./Docs/DEPLOYMENT_QUICKSTART.md)
- **Monitoring Guide**: [MONITORING_IMPLEMENTATION_GUIDE.md](./Docs/MONITORING_IMPLEMENTATION_GUIDE.md)
- **API Docs**: [COMPLETE_API_DOCUMENTATION.md](./Docs/COMPLETE_API_DOCUMENTATION.md)

### External Resources
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

## 🎓 Learning Path

### Beginner
1. Read [DEPLOYMENT_QUICKSTART.md](./Docs/DEPLOYMENT_QUICKSTART.md)
2. Follow step-by-step commands
3. Verify each step works before moving on

### Intermediate
1. Read [PRODUCTION_DEPLOYMENT_GUIDE.md](./Docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
2. Understand each component's role
3. Customize configurations for your needs

### Advanced
1. Read [MONITORING_IMPLEMENTATION_GUIDE.md](./Docs/MONITORING_IMPLEMENTATION_GUIDE.md)
2. Create custom Grafana dashboards
3. Setup advanced alerting rules
4. Optimize resource usage

---

## ✅ Deployment Completion Checklist

Copy this checklist and mark items as complete:

### Infrastructure
- [ ] VPS provisioned from Hostinger
- [ ] DNS records configured and propagated
- [ ] SSH access secured (key-based auth)
- [ ] Firewall configured

### Software Installation
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] Nginx installed and configured
- [ ] Certbot installed
- [ ] Git installed

### Application Setup
- [ ] Repository cloned to VPS
- [ ] `.env` file created with production values
- [ ] MongoDB connection configured
- [ ] Firebase credentials configured

### Services Configuration
- [ ] All Docker containers running
- [ ] Nginx configs created for all subdomains
- [ ] SSL certificates obtained for all subdomains
- [ ] HTTPS working for all subdomains

### Monitoring
- [ ] Grafana accessible and configured
- [ ] Prometheus collecting metrics
- [ ] Loki receiving logs
- [ ] Dashboards showing data

### Security
- [ ] Strong passwords set
- [ ] Secrets configured
- [ ] Firewall enabled
- [ ] SSH hardened
- [ ] Fail2Ban installed

### Operations
- [ ] Backup script created and scheduled
- [ ] Health check script created
- [ ] Monitoring alerts configured
- [ ] Documentation updated with credentials

---

## 🎉 Success!

Once all checklist items are complete, your application is production-ready!

**Access Your Services:**
- 🌐 API: https://apitest.vikalpshorthand.com
- 📊 Grafana: https://grafana.vikalpshorthand.com
- 📈 Prometheus: https://prometheus.vikalpshorthand.com
- 📝 Loki: https://loki.vikalpshorthand.com

**Keep in mind:**
- Regular monitoring via Grafana
- Automated backups running daily
- SSL certificates renewing automatically
- Application logs stored in Loki
- Metrics tracked in Prometheus

---

**Last Updated**: November 2025  
**Maintained By**: Vikalp Shorthnd Team

