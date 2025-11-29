# Jenkins CI/CD Setup Guide

This guide will help you set up Jenkins for CI/CD on your local Ubuntu machine and then deploy to Hostinger VPS.

## 📋 Table of Contents

1. [Local Setup (Ubuntu)](#local-setup-ubuntu)
2. [Testing Locally](#testing-locally)
3. [Hostinger VPS Setup](#hostinger-vps-setup)
4. [Jenkins Job Configuration](#jenkins-job-configuration)
5. [Troubleshooting](#troubleshooting)

---

## 🖥️ Local Setup (Ubuntu)

### Quick Setup

```bash
# Make scripts executable
chmod +x scripts/setup-jenkins-local.sh
chmod +x scripts/test-jenkins-local.sh

# Run setup script (requires sudo)
sudo ./scripts/setup-jenkins-local.sh
```

### Manual Setup Steps

1. **Install Java 17**
   ```bash
   sudo apt update
   sudo apt install openjdk-17-jdk -y
   ```

2. **Add Jenkins Repository**
   ```bash
   curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
     /usr/share/keyrings/jenkins-keyring.asc > /dev/null
   
   echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
     https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
     /etc/apt/sources.list.d/jenkins.list > /dev/null
   
   sudo apt update
   ```

3. **Install Jenkins**
   ```bash
   sudo apt install jenkins -y
   sudo systemctl start jenkins
   sudo systemctl enable jenkins
   ```

4. **Get Initial Admin Password**
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```

5. **Access Jenkins**
   - Open browser: `http://localhost:8080`
   - Enter the password from step 4
   - Install suggested plugins
   - Create admin user

6. **Install Required Plugins**
   - Go to: Manage Jenkins → Plugins → Available
   - Install:
     - Docker Pipeline
     - Docker
     - Git
     - Pipeline

7. **Configure Docker Access**
   ```bash
   # Install Docker (if not installed)
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Add Jenkins user to docker group
   sudo usermod -aG docker jenkins
   sudo systemctl restart jenkins
   
   # Verify
   sudo -u jenkins docker ps
   ```

8. **Start MongoDB for Tests**
   ```bash
   docker run -d --name test-mongodb -p 27017:27017 mongo:7
   ```

---

## 🧪 Testing Locally

### Run Test Script

```bash
./scripts/test-jenkins-local.sh
```

### Create Jenkins Job

1. **Open Jenkins**: `http://localhost:8080`

2. **Create New Pipeline Job**:
   - Click "New Item"
   - Enter name: `shorthnd-backend-local`
   - Select "Pipeline"
   - Click OK

3. **Configure Pipeline**:
   - **Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: 
     - Local: `/path/to/your/repo` or
     - GitHub: `https://github.com/abhay112/shorthandBackend.git`
   - **Branches**: `*/main` or `*/merge-new-db-and-monitoring-code`
   - **Script Path**: `Jenkinsfile`

4. **Set Environment Variables** (Optional):
   - Go to: Configure → Build Environment
   - Add environment variable:
     - Name: `DEPLOY_PATH`
     - Value: Your deployment path (or leave default to use WORKSPACE)

5. **Run Pipeline**:
   - Click "Build Now"
   - Watch console output

### Verify Deployment

```bash
# Check services
docker-compose -f docker-compose.prod.yml ps

# Test health endpoints
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/metrics

# Check monitoring
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3100/ready     # Loki
curl http://localhost:3001/api/health # Grafana
```

---

## 🌐 Hostinger VPS Setup

### Quick Setup

```bash
# Upload setup script to Hostinger
scp scripts/setup-jenkins-hostinger.sh user@your-hostinger-ip:/tmp/

# SSH to Hostinger
ssh user@your-hostinger-ip

# Run setup
sudo bash /tmp/setup-jenkins-hostinger.sh
```

### Manual Setup Steps

1. **SSH to Hostinger VPS**
   ```bash
   ssh user@your-hostinger-ip
   ```

2. **Run Setup Script**
   ```bash
   sudo ./scripts/setup-jenkins-hostinger.sh
   ```

3. **Access Jenkins**
   - URL: `http://your-server-ip:8080` or `http://your-domain.com:8080`
   - Get password: `sudo cat /var/lib/jenkins/secrets/initialAdminPassword`

4. **Configure Firewall** (if needed)
   ```bash
   sudo ufw allow 8080/tcp
   ```

5. **Set Up Jenkins Job** (same as local, but update DEPLOY_PATH)

---

## ⚙️ Jenkins Job Configuration

### For Local Testing

- **DEPLOY_PATH**: Leave empty or set to `WORKSPACE`
- **DOCKER_REGISTRY**: Leave empty (build locally)

### For Hostinger VPS

1. **Set Environment Variables**:
   - Go to: Configure → Build Environment → Use secret text(s) or file(s)
   - Or add in Jenkinsfile environment section:
     ```groovy
     DEPLOY_PATH = '/home/your-user/domains/yourdomain.com/public_html/backend'
     ```

2. **Configure Git Repository**:
   - Repository URL: Your GitHub repo
   - Credentials: Add if private repo
   - Branch: `*/main`

3. **Docker Hub (Optional)**:
   - If using Docker Hub, add credentials:
     - Manage Jenkins → Credentials → Add
     - Kind: Username with password
     - ID: `dockerhub-credentials`
     - Username: Your Docker Hub username
     - Password: Your Docker Hub password/token

---

## 🔧 Troubleshooting

### Jenkins can't access Docker

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
sudo -u jenkins docker ps  # Verify
```

### Tests fail - MongoDB not found

```bash
# Start MongoDB
docker run -d --name test-mongodb -p 27017:27017 mongo:7

# Or use docker-compose
docker-compose -f docker-compose.yml up -d mongodb
```

### Permission denied errors

```bash
# Fix workspace permissions
sudo chown -R jenkins:jenkins /var/lib/jenkins/workspace

# Fix deployment path permissions
sudo chown -R jenkins:jenkins /path/to/deployment
```

### Jenkins not starting

```bash
# Check status
sudo systemctl status jenkins

# Check logs
sudo journalctl -u jenkins -f

# Restart
sudo systemctl restart jenkins
```

### Port 8080 already in use

```bash
# Change Jenkins port
sudo nano /etc/default/jenkins
# Change HTTP_PORT=8080 to HTTP_PORT=8081
sudo systemctl restart jenkins
```

### Docker Compose not found

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

## 📝 Jenkinsfile Overview

The `Jenkinsfile` includes these stages:

1. **Checkout** - Get code from repository
2. **Install Dependencies** - Run `npm ci`
3. **Code Quality** - Run ESLint
4. **Security Audit** - Run npm audit
5. **Run Tests** - Execute test suite
6. **Build Docker Image** - Build application image
7. **Push to Docker Hub** - (Optional, if DOCKER_REGISTRY is set)
8. **Deploy with Docker Compose** - Deploy services
9. **Post-Deployment Validation** - Health checks

---

## 🚀 Quick Start Commands

### Local
```bash
# Setup
sudo ./scripts/setup-jenkins-local.sh

# Test
./scripts/test-jenkins-local.sh

# Access
http://localhost:8080
```

### Hostinger
```bash
# Setup
sudo ./scripts/setup-jenkins-hostinger.sh

# Access
http://your-server-ip:8080
```

---

## ✅ Checklist

### Local Setup
- [ ] Jenkins installed and running
- [ ] Jenkins accessible on port 8080
- [ ] Jenkins user can use Docker
- [ ] Required plugins installed
- [ ] MongoDB running for tests
- [ ] Jenkinsfile exists
- [ ] Jenkins job created
- [ ] Pipeline runs successfully

### Hostinger VPS
- [ ] Jenkins installed on VPS
- [ ] Docker and Docker Compose installed
- [ ] Jenkins user has Docker access
- [ ] DEPLOY_PATH configured
- [ ] .env file exists on VPS
- [ ] Firewall configured (if needed)
- [ ] Jenkins job created
- [ ] Pipeline runs successfully

---

## 📚 Additional Resources

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Docker Pipeline Plugin](https://plugins.jenkins.io/docker-workflow/)
- [Jenkinsfile Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)

---

## 🆘 Need Help?

If you encounter issues:
1. Check Jenkins logs: `sudo journalctl -u jenkins -f`
2. Check pipeline console output in Jenkins
3. Verify Docker access: `sudo -u jenkins docker ps`
4. Check service status: `docker-compose -f docker-compose.prod.yml ps`

