# Flow Diagram for Monitoring Setup

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER / FRONTEND                                │
│                         (Browser, Mobile App, etc.)                          │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │
                                    │ HTTP Requests (GET, POST, PUT, DELETE)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOCKER CONTAINER NETWORK                             │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                      BACKEND SERVICE                                    │ │
│  │                   (Node.js API - Port 3000)                             │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │              Express Application                                 │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │         Metrics Middleware (prom-client)                  │  │  │ │
│  │  │  │  • Intercepts every request                               │  │  │ │
│  │  │  │  • Measures request duration                              │  │  │ │
│  │  │  │  • Counts requests by method/route/status                 │  │  │ │
│  │  │  │  • Exposes /metrics endpoint                              │  │  │ │
│  │  │  │  • Logs errors (4xx, 5xx) to Loki                         │  │  │ │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │         Winston Logger                                     │  │  │ │
│  │  │  │  • Formats logs as JSON                                     │  │  │ │
│  │  │  │  • Console output (development)                             │  │  │ │
│  │  │  │  • File output (error.log, combined.log)                   │  │  │ │
│  │  │  │  • Loki transport (winston-loki)                           │  │  │ │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │         Route Handlers                                     │  │  │ │
│  │  │  │  • Process business logic                                  │  │  │ │
│  │  │  │  • Return responses                                        │  │  │ │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                       │
│                    │               │               │                       │
│                    ▼               ▼               ▼                       │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │   PROMETHEUS        │  │      LOKI        │  │     GRAFANA       │    │
│  │   Port: 9090        │  │   Port: 3100     │  │   Port: 3001      │    │
│  │                     │  │                  │  │                   │    │
│  │  • Scrapes /metrics │  │  • Receives logs │  │  • Queries        │    │
│  │    every 15s        │  │    via winston-  │  │    Prometheus     │    │
│  │  • Stores metrics   │  │    loki every 5s │  │  • Queries Loki   │    │
│  │  • Queryable with   │  │  • Stores logs  │  │  • Displays        │    │
│  │    PromQL           │  │  • Queryable with │  │    dashboards     │    │
│  │                     │  │    LogQL          │  │  • Auto-refresh   │    │
│  └─────────────────────┘  └──────────────────┘  │    every 10s      │    │
│                                                    │                   │    │
│                                                    │  ┌─────────────┐ │    │
│                                                    │  │  Dashboard  │ │    │
│                                                    │  │  JSON       │ │    │
│                                                    │  │  (Auto-     │ │    │
│                                                    │  │   loaded)   │ │    │
│                                                    │  └─────────────┘ │    │
│                                                    └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Request Flow (Step by Step)

```
STEP 1: User makes API request
        │
        ▼
┌───────────────────────┐
│  Frontend sends       │
│  POST /api/v1/admin/  │
│  students/123/block   │
└───────────┬────────────┘
            │
            ▼
STEP 2: Request reaches Backend
        │
        ▼
┌─────────────────────────────────────┐
│  Metrics Middleware starts          │
│  • Records start time               │
│  • Captures: method, route, URL     │
└───────────┬─────────────────────────┘
            │
            ▼
STEP 3: Request processed
        │
        ▼
┌─────────────────────────────────────┐
│  Route Handler executes             │
│  • Validates request                │
│  • Processes business logic          │
│  • Generates response               │
└───────────┬─────────────────────────┘
            │
            ▼
STEP 4: Response sent
        │
        ▼
┌─────────────────────────────────────┐
│  Response sent to client            │
│  Status: 200, 400, 500, etc.        │
└───────────┬─────────────────────────┘
            │
            ▼
STEP 5: Finish event fires
        │
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
┌──────────────────┐        ┌──────────────────────┐
│  Metrics         │        │  Error Logging       │
│  • Calculate     │        │  (if status >= 400)  │
│    duration      │        │  • Collect context   │
│  • Increment     │        │  • Log to Loki       │
│    counter       │        │  • Include details    │
│  • Update        │        └──────────────────────┘
│    histogram     │
└────────┬─────────┘
         │
         ▼
STEP 6: Metrics exposed
        │
        ▼
┌─────────────────────────────────────┐
│  /metrics endpoint returns:         │
│  http_request_total{...} 150        │
│  http_request_duration_seconds{...}│
│  process_cpu_user_seconds_total ...  │
└───────────┬─────────────────────────┘
            │
            ▼
STEP 7: Prometheus scrapes
        │
        ▼
┌─────────────────────────────────────┐
│  Prometheus calls /metrics          │
│  • Stores metrics with timestamp    │
│  • Makes queryable with PromQL      │
└───────────┬─────────────────────────┘
            │
            ▼
STEP 8: Grafana queries
        │
        ▼
┌─────────────────────────────────────┐
│  Grafana dashboard queries:        │
│  • Prometheus for metrics           │
│  • Loki for logs                    │
│  • Updates panels every 10s         │
└─────────────────────────────────────┘
```

## Error Logging Flow

```
┌─────────────────────────────────────┐
│  API Request fails                  │
│  (Status: 400, 401, 404, 500, etc.) │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│  Metrics Middleware detects error    │
│  (res.statusCode >= 400)            │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│  Collect error context:             │
│  • statusCode: 400                  │
│  • method: POST                     │
│  • route: /api/v1/admin             │
│  • url: /api/v1/admin/students/... │
│  • body: {reason: "..."}            │
│  • responseTime: 247ms               │
│  • user: {id: "...", role: "admin"} │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│  Winston Logger formats as JSON:    │
│  {                                  │
│    "type": "http_error",            │
│    "statusCode": 400,               │
│    "method": "POST",                │
│    "route": "/api/v1/admin",        │
│    "body": {...},                   │
│    "responseTime": 247,             │
│    "user": {...},                   │
│    "timestamp": "2025-11-15T..."    │
│  }                                  │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│  winston-loki sends to Loki         │
│  • Batches logs (every 5s)         │
│  • Adds labels: service, env        │
│  • Sends via HTTP POST              │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│  Loki stores log                    │
│  • Indexed by labels                │
│  • Queryable with LogQL             │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│  Grafana queries Loki:              │
│  {service="shorthnd-backend"}       │
│  | json | statusCode >= 400         │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│  Error appears in dashboard:        │
│  • Recent Error Logs panel          │
│  • Error Details Table              │
└─────────────────────────────────────┘
```

## Metrics Collection Flow

```
┌─────────────────────────────────────┐
│  Node.js Application Running         │
│  • Handles requests                 │
│  • Uses CPU, memory                 │
│  • Event loop processing            │
└───────────┬─────────────────────────┘
            │
            ├──────────────────────────────┐
            │                              │
            ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│  Default Metrics     │      │  Custom HTTP Metrics  │
│  (prom-client)       │      │  (our middleware)     │
│  • CPU usage         │      │  • Request duration   │
│  • Memory usage      │      │  • Request count     │
│  • Event loop lag    │      │  • By route/method   │
│  • HTTP server       │      │  • By status code    │
└──────────┬───────────┘      └──────────┬───────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
                          ▼
           ┌──────────────────────────────┐
           │  /metrics endpoint           │
           │  Returns Prometheus format:   │
           │  # HELP http_request_total   │
           │  # TYPE http_request_total   │
           │  http_request_total{...} 150 │
           └──────────┬───────────────────┘
                     │
                     ▼
           ┌──────────────────────────────┐
           │  Prometheus scrapes          │
           │  • Calls /metrics every 15s │
           │  • Parses Prometheus format │
           │  • Stores with timestamp    │
           └──────────┬───────────────────┘
                     │
                     ▼
           ┌──────────────────────────────┐
           │  Grafana queries Prometheus   │
           │  • Uses PromQL queries       │
           │  • rate(http_request_total   │
           │    [5m])                     │
           │  • Displays in panels        │
           └──────────────────────────────┘
```

## Docker Network Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
│                                                              │
│  Creates:                                                    │
│  • Network: monitoring (bridge)                              │
│  • Services: backend, prometheus, loki, grafana            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                            │
│                    (monitoring)                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   backend    │  │  prometheus  │  │     loki     │     │
│  │   :3000      │  │    :9090     │  │    :3100     │     │
│  │              │  │              │  │              │     │
│  │ Can reach:   │  │ Can reach:   │  │ Can reach:   │     │
│  │ • loki:3100  │  │ • backend:   │  │ • (none)    │     │
│  │              │  │   3000       │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                          ▼                                  │
│                  ┌──────────────┐                          │
│                  │   grafana   │                          │
│                  │    :3001     │                          │
│                  │              │                          │
│                  │ Can reach:   │                          │
│                  │ • prometheus │                          │
│                  │   :9090      │                          │
│                  │ • loki:3100  │                          │
│                  └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

```
┌─────────────┐
│   REQUEST   │
└──────┬──────┘
       │
       ├─────────────────────────────────────────────┐
       │                                             │
       ▼                                             ▼
┌──────────────┐                            ┌──────────────┐
│   METRICS    │                            │    LOGS     │
│              │                            │              │
│ • Duration   │                            │ • Errors     │
│ • Count      │                            │ • Context    │
│ • Labels     │                            │ • Timestamp  │
└──────┬───────┘                            └──────┬───────┘
       │                                            │
       ▼                                            ▼
┌──────────────┐                            ┌──────────────┐
│ PROMETHEUS   │                            │     LOKI     │
│              │                            │              │
│ • Scrapes    │                            │ • Receives   │
│ • Stores     │                            │ • Stores     │
│ • Queryable  │                            │ • Queryable  │
└──────┬───────┘                            └──────┬───────┘
       │                                            │
       └──────────────┬──────────────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   GRAFANA   │
              │             │
              │ • Queries   │
              │ • Visualizes│
              │ • Dashboard │
              └─────────────┘
```

