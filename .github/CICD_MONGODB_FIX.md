# CI/CD MongoDB Connection Fix

## Problem
Tests were timing out in GitHub Actions because MongoDB wasn't available in the CI environment.

## Solution
Added MongoDB as a service container in the GitHub Actions workflow.

## Changes Made

### 1. Added MongoDB Service Container
In `.github/workflows/ci-cd.yml`, added:
```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - 27017:27017
    env:
      MONGO_INITDB_DATABASE: test_shorthand
```

### 2. Added MongoDB Wait Step
Added a step to wait for MongoDB to be ready before running tests:
```yaml
- name: Wait for MongoDB to be ready
  run: |
    echo "Waiting for MongoDB to be ready..."
    sudo apt-get update && sudo apt-get install -y netcat-openbsd || true
    timeout 60 bash -c 'until nc -z localhost 27017; do echo "Waiting for MongoDB..."; sleep 2; done'
    sleep 3
    echo "✅ MongoDB is ready!"
```

### 3. Set Environment Variables
Set MongoDB connection strings for tests:
```yaml
env:
  NODE_ENV: test
  TEST_MONGO_URI: mongodb://localhost:27017/test_shorthand
  MONGO_URI: mongodb://localhost:27017/test_shorthand
```

### 4. Improved Test Helper
Updated `tests/utils/testHelpers.js` to:
- Handle connection timeouts better (10 seconds)
- Use MONGO_URI if TEST_MONGO_URI is not set
- Provide better error messages

## How It Works

1. GitHub Actions starts a MongoDB 7 container
2. The container exposes port 27017
3. Tests wait for MongoDB to be ready
4. Tests connect using `mongodb://localhost:27017/test_shorthand`
5. Tests run with database connectivity

## Alternative: Using Your Own MongoDB

If you want to use your own MongoDB instance (e.g., MongoDB Atlas), you can:

1. Add a GitHub Secret named `MONGO_URI` with your connection string
2. Update the workflow to use the secret:
```yaml
env:
  NODE_ENV: test
  TEST_MONGO_URI: ${{ secrets.MONGO_URI }}
  MONGO_URI: ${{ secrets.MONGO_URI }}
```

## Testing Locally

To test with MongoDB locally:
```bash
# Start MongoDB (if using Docker)
docker run -d -p 27017:27017 --name test-mongo mongo:7

# Run tests
NODE_ENV=test TEST_MONGO_URI=mongodb://localhost:27017/test_shorthand npm test

# Cleanup
docker stop test-mongo && docker rm test-mongo
```

