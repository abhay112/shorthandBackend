# 🏗️ Architecture Evolution - Current vs Proposed

## 📊 Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                        │
│              Firebase Auth Integration                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Nginx Reverse Proxy                        │
│              SSL/TLS Termination                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Main Backend (Express.js)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Students │  │  Tests   │  │ Batches  │  │ Results │   │
│  │  Routes  │  │  Routes   │  │  Routes  │  │ Routes  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Auth    │  │  Audit   │  │ Ranking  │                 │
│  │ Service  │  │ Service  │  │ Service  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  MongoDB    │  │ Prometheus  │  │    Loki     │
│  Database   │  │  Metrics    │  │    Logs     │
└─────────────┘  └─────────────┘  └─────────────┘
                        │               │
                        └───────┬───────┘
                                ▼
                        ┌─────────────┐
                        │   Grafana   │
                        │  Dashboards  │
                        └─────────────┘
```

---

## 🚀 Proposed Microservices Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                        │
│              Firebase Auth Integration                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Nginx Reverse Proxy                        │
│              SSL/TLS Termination                            │
│         ┌──────────────┐  ┌──────────────┐                 │
│         │  api.*       │  │  grafana.*   │                 │
│         └──────────────┘  └──────────────┘                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Main Backend │  │ Email Service│  │Notification │
│  (Express)   │  │  (Express)   │  │   Service   │
│              │  │              │  │  (Express)   │
│ Port: 3000   │  │ Port: 3001   │  │ Port: 3002  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │ HTTP            │                 │
       │                 │                 │
       └─────────┬───────┘                 │
                 │                         │
                 ▼                         ▼
        ┌────────────────┐        ┌────────────────┐
        │   Redis        │        │   MongoDB      │
        │  (Queues/      │        │   (Database)   │
        │   Cache)       │        │                │
        └────────────────┘        └────────────────┘
                 │                         │
                 │                         │
                 └───────────┬─────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │   Prometheus   │
                    │   Grafana      │
                    │   Loki         │
                    └────────────────┘
```

---

## 🔄 Request Flow Examples

### **Current: Student Registration**
```
Frontend → Nginx → Main Backend → MongoDB
                              ↓
                         (No Email)
```

### **Proposed: Student Registration with Email**
```
Frontend → Nginx → Main Backend → MongoDB
                              │
                              ├─→ Create Student
                              │
                              └─→ HTTP POST → Email Service
                                            │
                                            ├─→ Queue Email (Redis)
                                            │
                                            └─→ Send Email (SendGrid)
                                                      │
                                                      └─→ Track (MongoDB)
```

### **Proposed: Test Assignment Notification**
```
Admin Action → Main Backend → MongoDB
                    │
                    ├─→ Assign Test to Batch
                    │
                    └─→ HTTP POST → Notification Service
                                  │
                                  ├─→ Check Preferences
                                  │
                                  ├─→ Email (via Email Service)
                                  ├─→ SMS (via Twilio)
                                  ├─→ Push (via FCM)
                                  └─→ In-App (WebSocket)
```

---

## 📦 Service Responsibilities

### **Main Backend Service**
- **Responsibilities:**
  - Student management
  - Test management
  - Batch management
  - Results processing
  - Authentication/Authorization
  - Audit logging
  - Ranking calculations

- **Endpoints:** `/api/v1/*`
- **Port:** 3000
- **Database:** MongoDB (primary)

### **Email Service**
- **Responsibilities:**
  - Email template management
  - Email sending (SendGrid/SES)
  - Email tracking (open, click, bounce)
  - Email queue management
  - Email statistics

- **Endpoints:** `/api/v1/email/*`
- **Port:** 3001
- **Database:** MongoDB (email logs)
- **Queue:** Redis (BullMQ)

### **Notification Service**
- **Responsibilities:**
  - Notification routing
  - Notification preferences
  - Multi-channel notifications
  - Real-time notifications (WebSocket)
  - Notification history

- **Endpoints:** `/api/v1/notifications/*`
- **Port:** 3002
- **Database:** MongoDB (notifications)
- **Queue:** Redis (BullMQ)
- **WebSocket:** `/ws/notifications`

---

## 🔌 Inter-Service Communication

### **Synchronous (HTTP)**
- Main Backend → Email Service (send email)
- Main Backend → Notification Service (send notification)
- Frontend → All Services (API calls)

### **Asynchronous (Queue)**
- Email Service → Email Queue (Redis/BullMQ)
- Notification Service → Notification Queue (Redis/BullMQ)
- Background job processing

### **Real-time (WebSocket)**
- Notification Service → Frontend (live notifications)
- Main Backend → Frontend (test progress updates)

---

## 🗄️ Database Architecture

### **MongoDB Collections**

#### **Main Backend Database**
- `students`
- `tests`
- `batches`
- `results`
- `auditlogs`
- `studentrankings`
- `admins`
- `testsessions`

#### **Email Service Database**
- `emaillogs`
- `emailtemplates`
- `emailstats`

#### **Notification Service Database**
- `notifications`
- `notificationpreferences`
- `notificationchannels`

---

## 🔐 Security Architecture

### **Authentication Flow**
```
Frontend → Firebase Auth → JWT Token
                              │
                              ▼
                    Main Backend (Verify Token)
                              │
                              ├─→ Validate User
                              └─→ Set Session Cookie
```

### **Inter-Service Authentication**
- API Keys for service-to-service communication
- JWT tokens for user requests
- Rate limiting per service

---

## 📊 Monitoring Architecture

### **Metrics Collection**
```
All Services → Prometheus (Metrics)
                    │
                    └─→ Grafana (Visualization)
```

### **Log Collection**
```
All Services → Winston → Loki (Logs)
                              │
                              └─→ Grafana (Log Viewer)
```

### **CI/CD Monitoring**
```
GitHub Actions → Webhook → Main Backend
                              │
                              ├─→ Log Deployment
                              └─→ Send Metrics to Prometheus
```

---

## 🚀 Deployment Architecture

### **Docker Compose Structure**
```yaml
services:
  backend:
    image: shorthnd-backend:latest
    ports: ["3000:3000"]
  
  email-service:
    image: shorthnd-email-service:latest
    ports: ["3001:3001"]
  
  notification-service:
    image: shorthnd-notification-service:latest
    ports: ["3002:3002"]
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
  
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
  
  loki:
    image: grafana/loki:latest
    ports: ["3100:3100"]
  
  grafana:
    image: grafana/grafana:latest
    ports: ["3001:3000"]
```

### **Nginx Configuration**
```nginx
# Main Backend
location /api/v1/ {
    proxy_pass http://backend:3000;
}

# Email Service
location /api/v1/email/ {
    proxy_pass http://email-service:3001;
}

# Notification Service
location /api/v1/notifications/ {
    proxy_pass http://notification-service:3002;
}

# WebSocket
location /ws/ {
    proxy_pass http://notification-service:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## 🔄 CI/CD Pipeline Flow

```
Developer Push → GitHub
                    │
                    ▼
            GitHub Actions Trigger
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Run Tests   Build Image   Security Scan
        │           │           │
        └───────────┼───────────┘
                    │
                    ▼
            Push to Registry
                    │
                    ▼
            Deploy to VPS
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Health Check  Rollback?   Monitor
        │           │           │
        └───────────┼───────────┘
                    │
                    ▼
            Update Deployment Log
                    │
                    ▼
            Send Notification
```

---

## 📈 Scalability Considerations

### **Horizontal Scaling**
- Each service can be scaled independently
- Load balancer in front of each service
- Stateless services for easy scaling

### **Database Scaling**
- MongoDB replica sets
- Read replicas for analytics
- Sharding if needed (future)

### **Queue Scaling**
- Redis cluster for high availability
- Multiple workers for queue processing
- Priority queues for critical jobs

---

## 🎯 Migration Strategy

### **Phase 1: Email Service**
1. Create email service
2. Deploy alongside main backend
3. Migrate email logic gradually
4. Monitor and optimize

### **Phase 2: Notification Service**
1. Create notification service
2. Integrate with email service
3. Add SMS and push notifications
4. Implement WebSocket

### **Phase 3: CI/CD**
1. Set up GitHub Actions
2. Configure deployment pipeline
3. Add monitoring and tracking
4. Document procedures

---

**Last Updated:** 2025-01-15

