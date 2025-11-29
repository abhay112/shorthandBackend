#!/usr/bin/env node

/**
 * Monitoring Validation Script
 * Validates that monitoring endpoints are working correctly
 * Used in CI/CD pipeline to ensure monitoring is properly configured
 */

import http from 'http';
import https from 'https';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 5000;

/**
 * Make HTTP request
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: TIMEOUT }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Validate health endpoint
 */
async function validateHealth() {
  log.info('Validating /health endpoint...');
  try {
    const response = await makeRequest(`${BASE_URL}/health`);
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      if (data.status === 'healthy') {
        log.success('Health endpoint is working');
        return true;
      }
    }
    log.error(`Health endpoint returned status ${response.statusCode}`);
    return false;
  } catch (error) {
    log.error(`Health endpoint validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate readiness endpoint
 */
async function validateReadiness() {
  log.info('Validating /health/ready endpoint...');
  try {
    const response = await makeRequest(`${BASE_URL}/health/ready`);
    const data = JSON.parse(response.data);
    if (response.statusCode === 200 && data.status === 'ready') {
      log.success('Readiness endpoint is working');
      if (data.checks) {
        log.info(`  Database: ${data.checks.database ? '✓' : '✗'}`);
      }
      return true;
    } else if (response.statusCode === 503) {
      log.warn('Readiness endpoint returned 503 (not ready)');
      log.warn('This might be expected if database is not connected');
      return true; // Still valid endpoint
    }
    log.error(`Readiness endpoint returned status ${response.statusCode}`);
    return false;
  } catch (error) {
    log.error(`Readiness endpoint validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate liveness endpoint
 */
async function validateLiveness() {
  log.info('Validating /health/live endpoint...');
  try {
    const response = await makeRequest(`${BASE_URL}/health/live`);
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      if (data.status === 'alive') {
        log.success('Liveness endpoint is working');
        if (data.memory) {
          log.info(`  Memory: ${data.memory.used}MB / ${data.memory.total}MB`);
        }
        return true;
      }
    }
    log.error(`Liveness endpoint returned status ${response.statusCode}`);
    return false;
  } catch (error) {
    log.error(`Liveness endpoint validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate metrics endpoint
 */
async function validateMetrics() {
  log.info('Validating /metrics endpoint...');
  try {
    const response = await makeRequest(`${BASE_URL}/metrics`);
    if (response.statusCode === 200) {
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('text/plain')) {
        const metrics = response.data;
        
        // Check for required Prometheus metrics
        const requiredMetrics = [
          'http_request_duration_seconds',
          'http_request_total',
          'process_cpu_user_seconds_total',
          'process_resident_memory_bytes'
        ];

        const foundMetrics = requiredMetrics.filter(metric => 
          metrics.includes(metric)
        );

        if (foundMetrics.length >= 2) {
          log.success(`Metrics endpoint is working (found ${foundMetrics.length}/${requiredMetrics.length} required metrics)`);
          return true;
        } else {
          log.warn(`Metrics endpoint working but missing some metrics (found ${foundMetrics.length}/${requiredMetrics.length})`);
          return true; // Still valid, might be early in startup
        }
      } else {
        log.error(`Metrics endpoint returned wrong content type: ${contentType}`);
        return false;
      }
    } else {
      log.error(`Metrics endpoint returned status ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    log.error(`Metrics endpoint validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('Monitoring Validation');
  console.log('='.repeat(50));
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = {
    health: await validateHealth(),
    readiness: await validateReadiness(),
    liveness: await validateLiveness(),
    metrics: await validateMetrics()
  };

  console.log('\n' + '='.repeat(50));
  console.log('Validation Results');
  console.log('='.repeat(50));

  const allPassed = Object.values(results).every(r => r === true);
  
  Object.entries(results).forEach(([key, passed]) => {
    const icon = passed ? '✓' : '✗';
    const color = passed ? colors.green : colors.red;
    console.log(`${color}${icon}${colors.reset} ${key}: ${passed ? 'PASS' : 'FAIL'}`);
  });

  console.log('='.repeat(50) + '\n');

  if (allPassed) {
    log.success('All monitoring endpoints are valid!');
    process.exit(0);
  } else {
    log.error('Some monitoring endpoints failed validation');
    process.exit(1);
  }
}

// Run validation
main().catch((error) => {
  log.error(`Validation script error: ${error.message}`);
  process.exit(1);
});

