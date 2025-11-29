# Complete Monitoring Implementation Guide

## Overview
This guide explains the complete monitoring setup using Grafana, Loki, and Prometheus for a Node.js API application, all deployed using Docker.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Step-by-Step Implementation](#step-by-step-implementation)
3. [How It Works](#how-it-works)
4. [Flow Diagram](#flow-diagram)
5. [Key Components Explained](#key-components-explained)

---

## Architecture Overview

```
┌─────────────┐
│   Frontend  │
│  (Browser)  │
└──────┬──────┘
       │ HTTP Requests
       ▼
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Backend    │──────▶│  Prometheus  │                │
│  │  (Node.js)   │◀──────│   :9090      │                │
│  │   :3000      │       └──────────────┘                │
│  └──────┬───────┘                                       │
│         │                                                │
│         │ Logs (winston-loki)                            │
│         ▼                                                │
│  ┌──────────────┐      ┌──────────────┐                │
│  │     Loki     │◀─────│   Grafana    │                │
│  │    :3100     │      │    :3001     │                │
│  └──────────────┘      └──────────────┘                │
└─────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

**What we need:**
- `prom-client` - For Prometheus metrics
- `winston` - For logging
- `winston-loki` - To send logs to Loki

**Command:**
```bash
npm install prom-client winston winston-loki
```

**Why:**
- `prom-client` collects metrics from your Node.js app
- `winston` handles structured logging
- `winston-loki` sends logs to Loki service

---

### Step 2: Create Metrics Middleware

**File:** `src/monitoring/metrics.js`

**What it does:**
1. Collects default Node.js metrics (CPU, memory, event loop)
2. Creates custom HTTP metrics:
   - Request duration (how long each request takes)
   - Request counter (total number of requests)
3. Logs errors (4xx, 5xx) with context to Loki

**Key Code:**
```javascript
// Collect default metrics
client.collectDefaultMetrics({ register });

// Custom HTTP metrics
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestCounter = new client.Counter({
  name: 'http_request_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
```

**How it works:**
- Middleware runs on every request
- Measures how long request takes
- Counts total requests
- Categorizes by method, route, status code
- Exposes `/metrics` endpoint for Prometheus to scrape

---

### Step 3: Configure Winston Logger

**File:** `src/utils/logger.js`

**What it does:**
1. Sets up Winston with multiple transports:
   - Console (for development)
   - File (error.log, combined.log)
   - Loki (for centralized logging)

**Key Configuration:**
```javascript
new LokiTransport({
  host: 'http://loki:3100',
  labels: {
    service: 'shorthnd-backend',
    environment: 'production',
  },
  json: true,
  interval: 5, // Batch logs every 5 seconds
});
```

**How it works:**
- Logs are formatted as JSON
- Sent to Loki in batches (every 5 seconds)
- Tagged with service name and environment
- Can be queried using LogQL

---

### Step 4: Set Up Error Logging

**File:** `src/monitoring/metrics.js` (in finish event)

**What it logs for errors:**
```javascript
{
  type: 'http_error',
  statusCode: 400,
  method: 'POST',
  route: '/api/v1/admin',
  url: '/api/v1/admin/students/123/block',
  query: {...},
  params: {...},
  body: {...}, // Request body
  responseTime: 247,
  user: { id: '...', role: 'admin' },
  timestamp: '2025-11-15T...'
}
```

**Why:**
- Helps debug issues quickly
- Shows what request caused the error
- Includes user context
- Tracks response time

---

### Step 5: Create Docker Compose Setup

**File:** `docker-compose.yml`

**Services:**
1. **Backend** - Your Node.js API
2. **Prometheus** - Metrics collection and storage
3. **Loki** - Log aggregation
4. **Grafana** - Visualization dashboard

**Key Configuration:**
```yaml
services:
  backend:
    build: .
    ports:
      - '3000:3000'
    environment:
      LOKI_URL: http://loki:3100
      ENABLE_LOKI_LOGS: "true"
    networks:
      - monitoring

  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - monitoring

  loki:
    image: grafana/loki:3.1.1
    ports:
      - '3100:3100'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana-oss:latest
    ports:
      - '3001:3000'
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - monitoring
```

**Why Docker:**
- All services run in isolated containers
- Easy to start/stop everything together
- Consistent environment
- Easy to scale

---

### Step 6: Configure Prometheus

**File:** `prometheus.yml`

**What it does:**
- Tells Prometheus where to scrape metrics from
- Scrapes every 15 seconds
- Collects from backend `/metrics` endpoint

**Configuration:**
```yaml
scrape_configs:
  - job_name: 'shorthnd-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['backend:3000']
```

**How it works:**
1. Prometheus calls `http://backend:3000/metrics`
2. Gets all metrics in Prometheus format
3. Stores them with timestamps
4. Makes them queryable with PromQL

---

### Step 7: Configure Grafana Datasources

**File:** `monitoring/grafana/provisioning/datasources/datasources.yml`

**What it does:**
- Automatically configures Prometheus and Loki datasources
- No manual setup needed

**Configuration:**
```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    url: http://loki:3100
```

---

### Step 8: Create Grafana Dashboard

**File:** `monitoring/grafana/provisioning/dashboards/nodejs-api-dashboard.json`

**What it shows:**
1. **Summary Panels:**
   - Total requests
   - Requests per second
   - Success rate %
   - Error rate %

2. **Visualizations:**
   - Request rate over time (graph)
   - Error rate over time (graph)
   - Status code breakdown (pie chart)
   - Top endpoints by volume (bar chart)

3. **Error Logs:**
   - Recent error logs panel
   - Error details table

**Key PromQL Queries:**
```promql
# Total requests
sum(rate(http_request_total[5m]))

# Success rate
sum(rate(http_request_total{status_code=~"2.."}[5m])) / sum(rate(http_request_total[5m])) * 100

# Error rate
sum(rate(http_request_total{status_code=~"[45].."}[5m])) / sum(rate(http_request_total[5m])) * 100
```

---

## How It Works - Complete Flow

### 1. Request Flow
```
User → Frontend → Backend API
                    │
                    ├─→ Metrics Middleware (measures time, counts request)
                    ├─→ Route Handler (processes request)
                    └─→ Response sent
```

### 2. Metrics Collection Flow
```
Backend API
    │
    ├─→ /metrics endpoint (exposes Prometheus format)
    │
    └─→ Prometheus (scrapes every 15s)
            │
            └─→ Stores metrics with timestamps
                    │
                    └─→ Grafana queries Prometheus
                            │
                            └─→ Displays in dashboard
```

### 3. Logging Flow
```
Backend API
    │
    ├─→ Winston Logger (formats log as JSON)
    │
    └─→ winston-loki Transport
            │
            └─→ Sends to Loki (batched every 5s)
                    │
                    └─→ Grafana queries Loki with LogQL
                            │
                            └─→ Displays logs in dashboard
```

### 4. Error Logging Flow
```
Request fails (4xx/5xx)
    │
    └─→ Metrics Middleware detects error
            │
            ├─→ Collects error context:
            │   - Request method, URL, body
            │   - Response status code
            │   - User info
            │   - Response time
            │
            └─→ Logs to Loki via Winston
                    │
                    └─→ Appears in Grafana error panels
```

---

## Flow Diagram (Eraser-style)

### Architecture Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER / FRONTEND                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP Requests
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DOCKER CONTAINER NETWORK                        │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    BACKEND (Node.js API)                      │  │
│  │                    Port: 3000                                  │  │
│  │                                                               │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │         Metrics Middleware (prom-client)               │  │  │
│  │  │  • Measures request duration                           │  │  │
│  │  │  • Counts requests                                     │  │  │
│  │  │  • Logs errors (4xx, 5xx)                             │  │  │
│  │  │  • Exposes /metrics endpoint                           │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │         Winston Logger                                  │  │  │
│  │  │  • Console transport                                   │  │  │
│  │  │  • File transport (error.log, combined.log)            │  │  │
│  │  │  • Loki transport (winston-loki)                       │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                        │
│                             │                                        │
│        ┌────────────────────┼────────────────────┐                  │
│        │                    │                    │                  │
│        ▼                    ▼                    ▼                  │
│  ┌──────────┐        ┌──────────────┐    ┌──────────────┐          │
│  │Prometheus│        │     Loki     │    │   Grafana    │          │
│  │  :9090   │        │    :3100     │    │    :3001     │          │
│  └────┬─────┘        └──────┬───────┘    └──────┬───────┘          │
│       │                      │                    │                  │
│       │ Scrapes              │ Receives           │ Queries          │
│       │ /metrics             │ logs via           │ Prometheus       │
│       │ every 15s            │ winston-loki       │ & Loki           │
│       │                      │ every 5s           │                  │
│       │                      │                    │                  │
│       └──────────────────────┴────────────────────┘                  │
│                                    │                                  │
│                                    ▼                                  │
│                          ┌─────────────────┐                        │
│                          │  Dashboard JSON  │                        │
│                          │  (Provisioned)  │                        │
│                          └─────────────────┘                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌──────────────┐
│ API Request  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────┐
│  1. Metrics Middleware              │
│     • Start timer                   │
│     • Capture request details       │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  2. Route Handler                   │
│     • Process request                │
│     • Generate response              │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  3. Response Sent                   │
│     • Finish event fires             │
└──────┬──────────────────────────────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌──────────────────┐          ┌──────────────────┐
│  4a. Metrics     │          │  4b. Error Logs   │
│  • Record        │          │  • If status >=   │
│    duration      │          │    400            │
│  • Increment     │          │  • Log to Loki   │
│    counter       │          │  • Include       │
│  • Expose to     │          │    context       │
│    /metrics      │          └──────────────────┘
└────────┬─────────┘                    │
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  5a. Prometheus  │          │  5b. Loki        │
│  • Scrapes       │          │  • Receives     │
│    /metrics      │          │    logs         │
│  • Stores        │          │  • Stores      │
│    metrics       │          │    logs         │
└────────┬─────────┘          └────────┬────────┘
         │                              │
         └──────────┬───────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  6. Grafana      │
         │  • Queries       │
         │    Prometheus    │
         │  • Queries Loki  │
         │  • Displays in   │
         │    dashboard     │
         └──────────────────┘
```

---

## Key Components Explained

### 1. Prometheus Metrics

**What are metrics?**
- Numerical measurements over time
- Examples: request count, response time, CPU usage

**Types we use:**
- **Counter**: Always increases (total requests)
- **Histogram**: Measures distribution (response times)
- **Gauge**: Can go up or down (memory usage)

**Example:**
```
http_request_total{method="POST", route="/api/v1/admin", status_code="200"} 150
```
This means: 150 POST requests to `/api/v1/admin` returned 200 status

---

### 2. Loki Logs

**What are logs?**
- Text/JSON records of events
- Examples: error messages, request details

**How we query:**
```logql
{service="shorthnd-backend"} | json | statusCode >= 400
```
This finds all logs from our backend where statusCode is 400 or higher

---

### 3. Grafana Dashboard

**What it does:**
- Visualizes metrics and logs
- Creates graphs, tables, panels
- Auto-refreshes every 10 seconds

**Panel Types:**
- **Stat**: Shows single number (total requests)
- **Graph**: Shows trends over time
- **Table**: Shows detailed data
- **Logs**: Shows log entries

---

## Step-by-Step: How to Use

### Starting Everything
```bash
docker compose up -d
```

This starts:
- Backend on http://localhost:3000
- Prometheus on http://localhost:9090
- Loki on http://localhost:3100
- Grafana on http://localhost:3001

### Accessing Grafana
1. Go to http://localhost:3001
2. Login: admin / admin
3. Dashboard appears automatically: "Node.js API - Detailed Monitoring"

### Making API Calls
- Every API call is automatically tracked
- Metrics update in real-time
- Errors appear in error panels

### Viewing Metrics
- Prometheus: http://localhost:9090
- Query: `http_request_total`
- See all metrics in Prometheus format

### Viewing Logs
- Grafana Explore → Select Loki
- Query: `{service="shorthnd-backend"}`
- See all logs from backend

---

## Common PromQL Queries

```promql
# Total requests per second
sum(rate(http_request_total[5m]))

# Success rate percentage
sum(rate(http_request_total{status_code=~"2.."}[5m])) / sum(rate(http_request_total[5m])) * 100

# Error rate percentage
sum(rate(http_request_total{status_code=~"[45].."}[5m])) / sum(rate(http_request_total[5m])) * 100

# Requests by endpoint
sum by (route) (rate(http_request_total[5m]))

# Average response time
sum(rate(http_request_duration_seconds_sum[5m])) / sum(rate(http_request_duration_seconds_count[5m]))
```

---

## Common LogQL Queries

```logql
# All errors
{service="shorthnd-backend"} | json | statusCode >= 400

# Errors by route
{service="shorthnd-backend"} | json | statusCode >= 400 | line_format "{{route}} - {{statusCode}}"

# Recent errors with details
{service="shorthnd-backend"} | json | statusCode >= 400
```

---

## Troubleshooting

### Metrics not showing?
1. Check Prometheus targets: http://localhost:9090/targets
2. Verify backend `/metrics` endpoint works
3. Check Prometheus config in `prometheus.yml`

### Logs not appearing?
1. Check `ENABLE_LOKI_LOGS=true` in docker-compose.yml
2. Verify Loki is running: http://localhost:3100/ready
3. Check backend logs for Loki connection errors

### Dashboard not loading?
1. Check Grafana logs: `docker logs shorthnd-grafana`
2. Verify datasources are configured
3. Check dashboard JSON is valid

---

## Summary

**What we built:**
1. ✅ Metrics collection with Prometheus
2. ✅ Centralized logging with Loki
3. ✅ Visualization dashboard with Grafana
4. ✅ All deployed on Docker
5. ✅ Automatic error tracking
6. ✅ Real-time monitoring

**Benefits:**
- See API performance in real-time
- Debug errors quickly
- Track system health
- Perfect for microservices
- Production-ready setup

---

## Next Steps

1. **Add Alerts**: Configure Grafana alerts for high error rates
2. **Add More Metrics**: Track database query times, cache hits, etc.
3. **Add More Dashboards**: Create dashboards for specific features
4. **Scale**: Add more backend instances, Prometheus will track all

---

## Resources

- Prometheus Docs: https://prometheus.io/docs/
- Loki Docs: https://grafana.com/docs/loki/
- Grafana Docs: https://grafana.com/docs/grafana/
- Piyush Garg Tutorial: [YouTube Link]

