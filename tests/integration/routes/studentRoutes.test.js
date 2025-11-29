/**
 * Integration tests for Student Routes
 * Tests the full request/response cycle
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { setupTestDB, cleanTestDB, closeTestDB } from '../../utils/testHelpers.js';

// This is a template - you'll need to import your actual app
// For now, we'll create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock route for testing
  app.get('/api/v1/user/profile', (req, res) => {
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: req.user?.id || 'test-id',
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    });
  });

  return app;
};

describe('Student Routes Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await setupTestDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await cleanTestDB();
  });

  describe('GET /api/v1/user/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            email: expect.any(String),
          }),
        },
      });
    });
  });
});

