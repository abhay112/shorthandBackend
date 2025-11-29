#!/bin/bash

# ================================================
# CI/CD Demo Script
# ================================================
# This script demonstrates the CI/CD pipeline
# Usage: ./scripts/demo-cicd.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         CI/CD Pipeline with Monitoring Integration        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Show what was implemented
echo -e "${BLUE}📋 What Was Implemented:${NC}"
echo ""
echo -e "  ${GREEN}✓${NC} GitHub Actions CI/CD workflow (.github/workflows/ci-cd.yml)"
echo -e "  ${GREEN}✓${NC} Health check endpoints (/health, /health/ready, /health/live)"
echo -e "  ${GREEN}✓${NC} Monitoring validation script (scripts/validate-monitoring.js)"
echo -e "  ${GREEN}✓${NC} Local CI/CD testing script (scripts/test-ci-local.sh)"
echo -e "  ${GREEN}✓${NC} Simple CI/CD test script (scripts/test-ci-simple.sh)"
echo ""

# Show CI/CD Flow
echo -e "${BLUE}🔄 CI/CD Pipeline Flow:${NC}"
echo ""
echo -e "  ${YELLOW}1.${NC} ${CYAN}Code Quality${NC} → ESLint, Security Audit"
echo -e "  ${YELLOW}2.${NC} ${CYAN}Build & Test${NC} → Install deps, Run tests, Build Docker image"
echo -e "  ${YELLOW}3.${NC} ${CYAN}Monitoring Validation${NC} → Check health/metrics endpoints"
echo -e "  ${YELLOW}4.${NC} ${CYAN}Deploy${NC} → Staging (develop) or Production (main)"
echo -e "  ${YELLOW}5.${NC} ${CYAN}Post-Deploy${NC} → Health checks, Monitoring validation"
echo ""

# Show Health Endpoints
echo -e "${BLUE}🏥 Health Check Endpoints:${NC}"
echo ""
echo -e "  ${GREEN}GET /health${NC}        → Basic health check"
echo -e "  ${GREEN}GET /health/ready${NC}  → Readiness probe (checks DB)"
echo -e "  ${GREEN}GET /health/live${NC}    → Liveness probe"
echo -e "  ${GREEN}GET /metrics${NC}       → Prometheus metrics"
echo ""

# Show how to test
echo -e "${BLUE}🧪 How to Test Locally:${NC}"
echo ""
echo -e "  ${YELLOW}1.${NC} Start the application:"
echo -e "     ${CYAN}npm run dev${NC}"
echo ""
echo -e "  ${YELLOW}2.${NC} Test health endpoints:"
echo -e "     ${CYAN}curl http://localhost:3000/health${NC}"
echo -e "     ${CYAN}curl http://localhost:3000/health/ready${NC}"
echo -e "     ${CYAN}curl http://localhost:3000/health/live${NC}"
echo -e "     ${CYAN}curl http://localhost:3000/metrics${NC}"
echo ""
echo -e "  ${YELLOW}3.${NC} Run monitoring validation:"
echo -e "     ${CYAN}BASE_URL=http://localhost:3000 node scripts/validate-monitoring.js${NC}"
echo ""
echo -e "  ${YELLOW}4.${NC} Run simple CI/CD test:"
echo -e "     ${CYAN}./scripts/test-ci-simple.sh${NC}"
echo ""
echo -e "  ${YELLOW}5.${NC} Run full CI/CD test (requires Docker):"
echo -e "     ${CYAN}./scripts/test-ci-local.sh${NC}"
echo ""

# Show GitHub Actions
echo -e "${BLUE}🚀 GitHub Actions Workflow:${NC}"
echo ""
echo -e "  The workflow (${CYAN}.github/workflows/ci-cd.yml${NC}) runs on:"
echo -e "    • Push to ${YELLOW}main${NC}, ${YELLOW}develop${NC}, ${YELLOW}merge-new-db-and-monitoring-code${NC}"
echo -e "    • Pull requests to ${YELLOW}main${NC} or ${YELLOW}develop${NC}"
echo ""
echo -e "  Jobs included:"
echo -e "    ${GREEN}✓${NC} ci - Code quality & tests"
echo -e "    ${GREEN}✓${NC} build - Docker image build"
echo -e "    ${GREEN}✓${NC} validate-monitoring - Monitoring validation"
echo -e "    ${GREEN}✓${NC} deploy-staging - Deploy to staging (develop branch)"
echo -e "    ${GREEN}✓${NC} deploy-production - Deploy to production (main branch)"
echo ""

# Show file structure
echo -e "${BLUE}📁 Files Created/Modified:${NC}"
echo ""
echo -e "  ${CYAN}.github/workflows/ci-cd.yml${NC}"
echo -e "  ${CYAN}src/routes/healthRoutes.js${NC} (new)"
echo -e "  ${CYAN}src/app.js${NC} (modified - added health routes)"
echo -e "  ${CYAN}scripts/validate-monitoring.js${NC} (new)"
echo -e "  ${CYAN}scripts/test-ci-local.sh${NC} (new)"
echo -e "  ${CYAN}scripts/test-ci-simple.sh${NC} (new)"
echo ""

echo -e "${GREEN}✅ CI/CD Pipeline Implementation Complete!${NC}"
echo ""

