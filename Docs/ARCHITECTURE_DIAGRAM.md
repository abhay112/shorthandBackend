# 🏗️ Production Architecture Diagram

Complete visual representation of your deployment architecture.

---

## 🌐 High-Level Architecture

```
                        ┌─────────────────────────────────┐
                        │         INTERNET                │
                        │     (Your Users/Clients)        │
                        └────────────┬────────────────────┘
                                     │
                                     │ HTTPS Requests
                                     │
                        ┌────────────▼────────────────────┐
                        │      DNS (Hostinger)            │
                        │  vikalpshorthand.com            │
                        │                                 │
                        │  ┌─────────────────────────┐    │
                        │  │ A Records:              │    │
                        │  │ • api → VPS IP          │    │
                        │  │ • grafana → VPS IP      │    │
                        │  │ • prometheus → VPS IP   │    │
                        │  │ • loki → VPS IP         │    │
                        │  └─────────────────────────┘    │
                        └────────────┬────────────────────┘
                                     │
                        ┌────────────▼────────────────────┐
                        │   VPS (Hostinger)               │
                        │   Ubuntu 20.04+                 │
                        │   IP: <YOUR_VPS_IP>             │
                        │                                 │
                        │   ┌─────────────────────────┐   │
                        │   │   Firewall (UFW)        │   │
                        │   │   Allowed Ports:        │   │
                        │   │   • 22 (SSH)            │   │
                        │   │   • 80 (HTTP)           │   │
                        │   │   • 443 (HTTPS)         │   │
                        │   └─────────┬───────────────┘   │
                        │             │                   │
                        │   ┌─────────▼───────────────┐   │
                        │   │   Nginx Reverse Proxy   │   │
                        │   │   + Let's Encrypt SSL   │   │
                        │   └─────────┬───────────────┘   │
                        │             │                   │
                        └─────────────┼───────────────────┘
                                      │
                 ┌────────────────────┼─────────────────────┐
                 │                    │                     │
                 │         Docker Network (monitoring)      │
                 │                                          │
                 │  Port Mapping (Internal → External)      │
                 │  • 3000 → 127.0.0.1:3000                 │
                 │  • 3001 → 127.0.0.1:3001                 │
                 │  • 9090 → 127.0.0.1:9090                 │
                 │  • 3100 → 127.0.0.1:3100                 │
                 │                                          │
                 └──────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### 1. User Makes API Request

```
User (Browser/App)
    │
    │ HTTPS Request
    │ https://apitest.vikalpshorthand.com/api/v1/students
    ▼
DNS Lookup
    │
    │ Returns: VPS IP (e.g., 203.0.113.50)
    ▼
VPS Firewall (Port 443 allowed)
    │
    ▼
Nginx (Port 443)
    │
    │ 1. SSL Termination (decrypts HTTPS)
    │ 2. Checks server_name: apitest.vikalpshorthand.com
    │ 3. Forwards to proxy_pass: http://127.0.0.1:3000
    ▼
Backend Container (Node.js)
    │
    │ 1. Express receives request
    │ 2. metricsMiddleware records metrics
    │ 3. Authentication middleware checks token
    │ 4. Route handler processes request
    │ 5. Queries MongoDB
    │ 6. Returns response
    │
    │ Metrics sent to → Prometheus
    │ Logs sent to → Loki
    ▼
Response travels back up the chain
    │
    ▼
User receives JSON response
```

---

## 🐳 Docker Container Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Docker Host (VPS)                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Docker Network: monitoring                    │ │
│  │                                                         │ │
│  │  ┌────────────────────────────────────────────────┐    │ │
│  │  │  Backend Container                             │    │ │
│  │  │  (shorthnd-backend)                            │    │ │
│  │  │                                                │    │ │
│  │  │  ┌──────────────────────────────────┐         │    │ │
│  │  │  │  Node.js Process                 │         │    │ │
│  │  │  │                                  │         │    │ │
│  │  │  │  • Express App (app.js)          │         │    │ │
│  │  │  │  • Metrics (metrics.js)          │         │    │ │
│  │  │  │  • Logger (logger.js)            │         │    │ │
│  │  │  │  • Routes + Controllers          │         │    │ │
│  │  │  │  • Middleware                    │         │    │ │
│  │  │  └──────────────────────────────────┘         │    │ │
│  │  │                                                │    │ │
│  │  │  Exposed Port: 3000                           │    │ │
│  │  │  Endpoints:                                   │    │ │
│  │  │    • / (API root)                             │    │ │
│  │  │    • /api/v1/* (API routes)                   │    │ │
│  │  │    • /metrics (Prometheus scrape)             │    │ │
│  │  │                                                │    │ │
│  │  │  Connects to:                                 │    │ │
│  │  │    → MongoDB (Atlas or Local)                 │    │ │
│  │  │    → Loki (logs)                              │    │ │
│  │  │                                                │    │ │
│  │  └─────────────┬──────────────────────────────────    │ │
│  │                │                                       │ │
│  │  ┌─────────────▼──────────────────────────────┐      │ │
│  │  │  Prometheus Container                      │      │ │
│  │  │  (shorthnd-prometheus)                     │      │ │
│  │  │                                            │      │ │
│  │  │  • Scrapes backend:3000/metrics            │      │ │
│  │  │  • Stores time-series metrics              │      │ │
│  │  │  • Retention: 30 days                      │      │ │
│  │  │                                            │      │ │
│  │  │  Exposed Port: 9090                        │      │ │
│  │  │  Volume: prometheus-data                   │      │ │
│  │  │                                            │      │ │
│  │  └──────────────────────────────────────────────      │ │
│  │                                                       │ │
│  │  ┌────────────────────────────────────────────┐      │ │
│  │  │  Loki Container                            │      │ │
│  │  │  (shorthnd-loki)                           │      │ │
│  │  │                                            │      │ │
│  │  │  • Receives logs from winston-loki         │      │ │
│  │  │  • Stores logs                             │      │ │
│  │  │  • Queryable via LogQL                     │      │ │
│  │  │                                            │      │ │
│  │  │  Exposed Port: 3100                        │      │ │
│  │  │  Volume: loki-data                         │      │ │
│  │  │                                            │      │ │
│  │  └────────────────────────────────────────────       │ │
│  │                │                │                     │ │
│  │  ┌─────────────▼────────────────▼────────────┐       │ │
│  │  │  Grafana Container                        │       │ │
│  │  │  (shorthnd-grafana)                       │       │ │
│  │  │                                           │       │ │
│  │  │  • Queries Prometheus for metrics         │       │ │
│  │  │  • Queries Loki for logs                  │       │ │
│  │  │  • Pre-configured dashboards              │       │ │
│  │  │  • Alerting (optional)                    │       │ │
│  │  │                                           │       │ │
│  │  │  Exposed Port: 3001 (internal 3000)       │       │ │
│  │  │  Volume: grafana-storage                  │       │ │
│  │  │                                           │       │ │
│  │  └─────────────────────────────────────────────      │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🔀 Data Flow Diagram

### Metrics Flow (Prometheus)

```
Backend Container
    │
    │ HTTP Requests hit metricsMiddleware
    │
    ▼
Metrics Recorded (prom-client)
    │
    │ • http_request_duration_seconds
    │ • http_request_total
    │ • process_cpu_user_seconds_total
    │ • nodejs_heap_size_used_bytes
    │ • ... (more metrics)
    │
    │ Exposed at /metrics endpoint
    │
    ▼
Prometheus (scrapes every 15s)
    │
    │ GET http://backend:3000/metrics
    │
    ▼
Metrics Stored in Prometheus
    │
    │ Time-series database
    │
    ▼
Grafana Queries Prometheus
    │
    │ PromQL: rate(http_request_total[5m])
    │
    ▼
Dashboard Displays Metrics
    │
    ▼
User Views Dashboard
```

### Logs Flow (Loki)

```
Backend Container
    │
    │ Application logs something
    │ logger.error() / logger.info() / logger.warn()
    │
    ▼
Winston Logger
    │
    │ • Console Transport (local dev)
    │ • File Transport (error.log, combined.log)
    │ • Loki Transport (production)
    │
    ▼
winston-loki Plugin
    │
    │ Batches logs and sends to Loki
    │ POST http://loki:3100/loki/api/v1/push
    │
    ▼
Loki Container
    │
    │ Receives and stores logs
    │ Indexed by labels: {service="shorthnd-backend"}
    │
    ▼
Grafana Queries Loki
    │
    │ LogQL: {service="shorthnd-backend"} | json | statusCode >= 400
    │
    ▼
Dashboard/Logs Panel Displays Logs
    │
    ▼
User Views Logs
```

---

## 🔐 Security Layers

```
┌──────────────────────────────────────────────┐
│  Layer 1: Network Security                  │
│  • DNS (Cloudflare DDoS protection)         │
│  • VPS Firewall (UFW)                       │
│    - Only 22, 80, 443 open                  │
└────────────┬─────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────┐
│  Layer 2: SSL/TLS Encryption                │
│  • Let's Encrypt certificates               │
│  • Auto-renewal                             │
│  • HTTPS only (HTTP redirects)              │
└────────────┬─────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────┐
│  Layer 3: Nginx Reverse Proxy               │
│  • Hides internal ports                     │
│  • Request filtering                        │
│  • Rate limiting                            │
│  • Security headers                         │
└────────────┬─────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────┐
│  Layer 4: Docker Network Isolation          │
│  • Containers in private network            │
│  • Only 127.0.0.1 bindings                  │
│  • No direct external access                │
└────────────┬─────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────┐
│  Layer 5: Application Security              │
│  • JWT/Firebase authentication              │
│  • Role-based access control (RBAC)         │
│  • CORS restrictions                        │
│  • Helmet.js security headers               │
│  • Input validation                         │
│  • Rate limiting per IP                     │
└────────────┬─────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────┐
│  Layer 6: Data Security                     │
│  • MongoDB authentication                   │
│  • Environment variables (.env)             │
│  • Secrets not in code                      │
│  • Password hashing (Firebase)              │
└──────────────────────────────────────────────┘
```

---

## 📊 Monitoring Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Your Application                      │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  1. HTTP Request arrives                      │    │
│  │     ↓                                          │    │
│  │  2. metricsMiddleware starts timer            │    │
│  │     ↓                                          │    │
│  │  3. Request processed by route handler        │    │
│  │     ↓                                          │    │
│  │  4. Response sent to client                   │    │
│  │     ↓                                          │    │
│  │  5. res.on('finish') callback executes        │    │
│  │     ↓                                          │    │
│  │  ┌─────────────────────────────────────────┐  │    │
│  │  │ If statusCode >= 400:                   │  │    │
│  │  │   • logger.error() or logger.warn()     │  │    │
│  │  │   • Log includes:                        │  │    │
│  │  │     - statusCode, method, route         │  │    │
│  │  │     - request body, query, params       │  │    │
│  │  │     - response time                     │  │    │
│  │  │     - user info                         │  │    │
│  │  │                                         │  │    │
│  │  │   ┌─────────────────────────────────┐   │  │    │
│  │  │   │ winston-loki sends to Loki      │   │  │    │
│  │  │   └─────────────────────────────────┘   │  │    │
│  │  └─────────────────────────────────────────┘  │    │
│  │     ↓                                          │    │
│  │  6. Metrics recorded:                         │    │
│  │     • http_request_duration_seconds           │    │
│  │     • http_request_total                      │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴──────────────────┐
        │                                    │
        ▼                                    ▼
┌───────────────────┐              ┌─────────────────┐
│   Prometheus      │              │      Loki       │
│                   │              │                 │
│ Scrapes metrics   │              │ Receives logs   │
│ every 15s         │              │ batched every   │
│                   │              │ 5 seconds       │
└─────────┬─────────┘              └────────┬────────┘
          │                                 │
          └─────────────┬───────────────────┘
                        │
                        ▼
               ┌────────────────┐
               │    Grafana     │
               │                │
               │ • Queries both │
               │ • Visualizes   │
               │ • Alerts       │
               └────────────────┘
```

---

## 🗄️ Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Backend Container (Node.js)                │
│                                                         │
│  ┌────────────────────────────────────────────┐        │
│  │  Mongoose ODM                              │        │
│  │                                            │        │
│  │  • Connection pooling                      │        │
│  │  • Query building                          │        │
│  │  • Schema validation                       │        │
│  └─────────────────┬──────────────────────────┘        │
│                    │                                   │
└────────────────────┼───────────────────────────────────┘
                     │
                     │ mongoose.connect(MONGO_URI)
                     │
    ┌────────────────┴─────────────────┐
    │                                  │
    ▼ (Option A)                      ▼ (Option B)
┌─────────────────────┐      ┌───────────────────────┐
│  MongoDB Atlas      │      │  Local MongoDB        │
│  (Recommended)      │      │  (VPS)                │
│                     │      │                       │
│  • Managed service  │      │  • Self-hosted        │
│  • Auto backups     │      │  • Manual backups     │
│  • Scalable         │      │  • You manage         │
│  • Secure           │      │  • Lower cost         │
│  • Free tier        │      │  • More control       │
│                     │      │                       │
│  Collections:       │      │  Collections:         │
│  • students         │      │  • students           │
│  • lessons          │      │  • lessons            │
│  • typing_tests     │      │  • typing_tests       │
│  • results          │      │  • results            │
│  • ... etc          │      │  • ... etc            │
└─────────────────────┘      └───────────────────────┘
```

---

## 🔄 Deployment Flow

```
Developer Machine                     VPS (Production)
┌────────────────┐                   ┌──────────────────┐
│                │                   │                  │
│  1. Code       │                   │                  │
│     Changes    │                   │                  │
│       ↓        │                   │                  │
│  2. git add    │                   │                  │
│     git commit │                   │                  │
│       ↓        │                   │                  │
│  3. git push   │ ─────────────────>│  4. git pull     │
│                │                   │       ↓          │
└────────────────┘                   │  5. ./deploy.sh  │
                                     │       ↓          │
                                     │  ┌──────────────┐│
                                     │  │ Script runs: ││
                                     │  │              ││
                                     │  │ • Stops      ││
                                     │  │   containers ││
                                     │  │              ││
                                     │  │ • Builds     ││
                                     │  │   images     ││
                                     │  │              ││
                                     │  │ • Starts     ││
                                     │  │   containers ││
                                     │  │              ││
                                     │  │ • Health     ││
                                     │  │   checks     ││
                                     │  │              ││
                                     │  └──────────────┘│
                                     │       ↓          │
                                     │  6. ✅ Deployed! │
                                     │                  │
                                     └──────────────────┘
```

---

## 🌍 User Access Flow

```
User's Browser
    │
    │ Types: grafana.vikalpshorthand.com
    ▼
DNS Resolution
    │
    │ Returns: VPS IP
    ▼
Browser → HTTPS Request → VPS:443
    │
    ▼
Nginx SSL Termination
    │
    │ Checks: server_name grafana.vikalpshorthand.com
    │ Proxies to: http://127.0.0.1:3001
    ▼
Grafana Container
    │
    │ Serves login page
    ▼
User Authenticates
    │
    │ Username: admin (from .env)
    │ Password: <strong-password> (from .env)
    ▼
Grafana Dashboard
    │
    ├─> Queries Prometheus
    │     • PromQL: rate(http_request_total[5m])
    │     • Gets metrics
    │
    └─> Queries Loki
          • LogQL: {service="shorthnd-backend"} | json
          • Gets logs
    │
    ▼
User Views Monitoring Data
```

---

## 🎯 File System Layout on VPS

```
/home/deploy/                           # User home
├── apps/
│   └── backend/                        # Your application
│       ├── .env                        # Environment variables (SECRET!)
│       ├── docker-compose.prod.yml     # Production config
│       ├── deploy.sh                   # Deployment script
│       ├── prometheus.yml              # Prometheus config
│       ├── Dockerfile                  # Backend container definition
│       ├── src/                        # Application code
│       │   ├── app.js
│       │   ├── monitoring/
│       │   │   └── metrics.js
│       │   └── utils/
│       │       └── logger.js
│       └── monitoring/
│           └── grafana/
│               └── provisioning/       # Auto-config for Grafana
│
├── backups/                            # Automated backups
│   ├── grafana-20251115.tar.gz
│   ├── prometheus-20251115.tar.gz
│   ├── loki-20251115.tar.gz
│   └── .env-20251115
│
└── logs/                               # Application logs
    └── backup.log

/etc/nginx/                             # Nginx configuration
├── sites-available/
│   ├── apitest.vikalpshorthand.com
│   ├── grafana.vikalpshorthand.com
│   ├── prometheus.vikalpshorthand.com
│   └── loki.vikalpshorthand.com
│
└── sites-enabled/                      # Symlinks to sites-available
    ├── apitest.vikalpshorthand.com -> ../sites-available/apitest.vikalpshorthand.com
    ├── grafana.vikalpshorthand.com -> ...
    ├── prometheus.vikalpshorthand.com -> ...
    └── loki.vikalpshorthand.com -> ...

/etc/letsencrypt/                       # SSL certificates
├── live/
│   ├── apitest.vikalpshorthand.com/
│   │   ├── fullchain.pem
│   │   └── privkey.pem
│   ├── grafana.vikalpshorthand.com/
│   ├── prometheus.vikalpshorthand.com/
│   └── loki.vikalpshorthand.com/
│
└── renewal/                            # Auto-renewal configs
    ├── apitest.vikalpshorthand.com.conf
    ├── grafana.vikalpshorthand.com.conf
    ├── prometheus.vikalpshorthand.com.conf
    └── loki.vikalpshorthand.com.conf

/var/lib/docker/volumes/                # Docker volumes (data persistence)
├── grafana-storage/
├── prometheus-data/
└── loki-data/
```

---

## 📈 Scaling Architecture (Future)

```
When you need to scale, this architecture supports:

┌────────────────────────────────────────────────────┐
│  Load Balancer (Nginx or Cloud LB)                │
└──────────┬─────────────────────────────────────────┘
           │
    ┌──────┴──────┬──────────┬──────────┐
    │             │          │          │
    ▼             ▼          ▼          ▼
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│Backend │  │Backend │  │Backend │  │Backend │
│  #1    │  │  #2    │  │  #3    │  │  #4    │
└────────┘  └────────┘  └────────┘  └────────┘
    │             │          │          │
    └──────┬──────┴──────────┴──────────┘
           │
           ▼
┌─────────────────────────────────┐
│     Centralized Services        │
│                                 │
│  • MongoDB (Replica Set)        │
│  • Prometheus (Federation)      │
│  • Loki (Multiple instances)    │
│  • Grafana (Cloud or HA)        │
└─────────────────────────────────┘
```

---

## ✅ Verification Checklist

After deployment, verify each layer:

**Layer 1: DNS**
```bash
nslookup apitest.vikalpshorthand.com
nslookup grafana.vikalpshorthand.com
```

**Layer 2: Firewall**
```bash
sudo ufw status
```

**Layer 3: Docker Containers**
```bash
docker-compose -f docker-compose.prod.yml ps
```

**Layer 4: Nginx**
```bash
sudo nginx -t
sudo systemctl status nginx
```

**Layer 5: SSL Certificates**
```bash
sudo certbot certificates
```

**Layer 6: Application Health**
```bash
curl http://localhost:3000/
curl http://localhost:9090/-/healthy
curl http://localhost:3100/ready
curl http://localhost:3001/api/health
```

**Layer 7: External Access**
```bash
# From your local machine
curl https://apitest.vikalpshorthand.com
# Should return API welcome message
```

---

**All diagrams represent your production-ready architecture! 🚀**

For implementation details, see:
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md)

