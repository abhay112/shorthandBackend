# Docker Build & Testing Guide

## Prerequisites

Before starting, ensure that **Docker Desktop** is installed and running on your machine.
- **On Mac**: Open "Docker Desktop" from your Applications folder. You should see a whale icon in your menu bar.
- **Verify**: Run `docker version` in your terminal. If it returns version info, Docker is ready.

## 1. Build the Docker Image

Run the following command in the root of the repository:

```bash
docker build -t shorthand-backend:latest .
```

## 2. Run the Container

Start the container. Note that the app requires environment variables (like MongoDB URI). You can use an `.env` file.

```bash
docker run -d \
  --name app-container \
  -p 5001:5001 \
  --env-file .env \
  shorthand-backend:latest
```

*Note: The app runs on port 5001 by default.*

## 3. Verify the Deployment

### A. Health Check
The application should expose a standard health endpoint.

```bash
curl http://localhost:5001/health
```
**Expected Output:**
```json
{
  "status": "ok",
  "uptime": 12.34,
  "version": "1.0.0"
}
```

### B. Prometheus Metrics
Verify that metrics are being exported for the monitoring stack to scrape.

```bash
curl http://localhost:5001/metrics
```
**Expected Output:** A list of Prometheus metrics including `http_request_total`, `process_cpu_seconds_total`, etc.

### C. Structured Logs
Verify that the application is writing JSON logs to the mandatory filesystem path.

```bash
# Check standard application logs
docker exec app-container cat /opt/apps/shorthand-backend/logs/app.log

# Check error logs
docker exec app-container cat /opt/apps/shorthand-backend/logs/error.log
```
**Expected Output:** JSON lines containing `timestamp`, `level`, `message`, and `requestId`.

## 4. Troubleshooting

### ⚠️ Error: "Cannot connect to the Docker daemon"
If you see an error like `ERROR: Cannot connect to the Docker daemon...`, it means Docker is either not installed or not running.
- **Solution**: Open the Docker Desktop application and wait for the status to show "Running".

### ⚠️ Logs not visible?
Ensure the directory `/opt/apps/shorthand-backend/logs` exists and has proper permissions (handled automatically in the Dockerfile).

### ⚠️ Health check failing?
Check `docker logs app-container` to see if the application failed to start (e.g., due to missing database connection or environment variables).

