#!/bin/bash

# Quick test of health endpoints
# Make sure the app is running on port 3000 first

BASE_URL="${1:-http://localhost:3000}"

echo "Testing health endpoints at: $BASE_URL"
echo ""

echo "1. Testing /health:"
curl -s "$BASE_URL/health" | jq '.' || curl -s "$BASE_URL/health"
echo ""
echo ""

echo "2. Testing /health/ready:"
curl -s "$BASE_URL/health/ready" | jq '.' || curl -s "$BASE_URL/health/ready"
echo ""
echo ""

echo "3. Testing /health/live:"
curl -s "$BASE_URL/health/live" | jq '.' || curl -s "$BASE_URL/health/live"
echo ""
echo ""

echo "4. Testing /metrics (first 10 lines):"
curl -s "$BASE_URL/metrics" | head -10
echo ""

