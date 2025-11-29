/**
 * Unit tests for Refactored Student Service
 * Demonstrates testing with mocked dependencies
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import StudentServiceRefactored from '../../../src/services/refactored/StudentServiceRefactored.js';
import { MockStudentRepository, MockResultRepository } from '../../utils/mocks.js';
import { createTestStudent } from '../../utils/testHelpers.js';

describe('StudentServiceRefactored', () => {
  let service;
  let mockStudentRepository;
  let mockResultRepository;
  let mockBatchRepository;
  let mockTestRepository;

  beforeEach(() => {
    // Create mock repositories
    mockStudentRepository = new MockStudentRepository();
    mockResultRepository = new MockResultRepository();
    mockBatchRepository = { find: jest.fn() };
    mockTestRepository = { find: jest.fn() };

    // Create service with injected dependencies
    service = new StudentServiceRefactored({
      studentRepository: mockStudentRepository,
      batchRepository: mockBatchRepository,
      resultRepository: mockResultRepository,
      testRepository: mockTestRepository,
    });
  });

  describe('getProfile', () => {
    it('should return student profile with statistics', async () => {
      const testStudent = createTestStudent({
        _id: 'student-123',
        name: 'Test Student',
        email: 'test@example.com',
      });

      const testStats = [{
        totalTests: 10,
        averageWpm: 50.5,
        averageAccuracy: 95.5,
        bestWpm: 60.0,
        bestAccuracy: 100.0,
        totalTimeSpent: 1200,
      }];

      // Seed mock repository
      mockStudentRepository.seed([testStudent]);
      mockResultRepository.getStudentStatistics = jest.fn().mockResolvedValue(testStats);

      const result = await service.getProfile('student-123');

      expect(result).toMatchObject({
        _id: 'student-123',
        name: 'Test Student',
        email: 'test@example.com',
        statistics: testStats[0],
      });
    });

    it('should throw error if student not found', async () => {
      mockStudentRepository.reset();

      await expect(service.getProfile('nonexistent')).rejects.toThrow('Student not found');
    });

    it('should return default statistics if no results', async () => {
      const testStudent = createTestStudent({ _id: 'student-123' });
      mockStudentRepository.seed([testStudent]);
      mockResultRepository.getStudentStatistics = jest.fn().mockResolvedValue([]);

      const result = await service.getProfile('student-123');

      expect(result.statistics).toEqual({
        totalTests: 0,
        averageWpm: 0,
        averageAccuracy: 0,
        bestWpm: 0,
        bestAccuracy: 0,
        totalTimeSpent: 0,
      });
    });
  });

  describe('updateProfile', () => {
    it('should update student profile with allowed fields', async () => {
      const testStudent = createTestStudent({
        _id: 'student-123',
        name: 'Old Name',
      });

      mockStudentRepository.seed([testStudent]);

      const updatedStudent = {
        ...testStudent,
        name: 'New Name',
        updatedAt: new Date(),
      };

      mockStudentRepository.updateById = jest.fn().mockResolvedValue(updatedStudent);

      const result = await service.updateProfile('student-123', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(mockStudentRepository.updateById).toHaveBeenCalledWith(
        'student-123',
        { name: 'New Name' },
        { new: true, runValidators: true }
      );
    });

    it('should ignore disallowed fields', async () => {
      const testStudent = createTestStudent({ _id: 'student-123' });
      mockStudentRepository.seed([testStudent]);

      const updatedStudent = { ...testStudent, updatedAt: new Date() };
      mockStudentRepository.updateById = jest.fn().mockResolvedValue(updatedStudent);

      await service.updateProfile('student-123', {
        name: 'New Name',
        email: 'hacked@example.com', // Should be ignored
        isApproved: true, // Should be ignored
      });

      expect(mockStudentRepository.updateById).toHaveBeenCalledWith(
        'student-123',
        { name: 'New Name' }, // Only allowed field
        { new: true, runValidators: true }
      );
    });

    it('should throw error if student not found', async () => {
      mockStudentRepository.reset();
      mockStudentRepository.updateById = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent', { name: 'New Name' })
      ).rejects.toThrow('Student not found');
    });
  });

  describe('handleLogin', () => {
    it('should return existing student and update last login', async () => {
      const testStudent = createTestStudent({
        email: 'test@example.com',
        firebaseUid: 'existing-uid',
      });

      mockStudentRepository.seed([testStudent]);
      mockStudentRepository.updateLastLogin = jest.fn().mockResolvedValue({
        ...testStudent,
        lastLogin: new Date(),
      });

      const result = await service.handleLogin('test@example.com', 'Test User', 'existing-uid');

      expect(mockStudentRepository.updateLastLogin).toHaveBeenCalled();
      expect(result.email).toBe('test@example.com');
    });

    it('should create new student if not exists', async () => {
      mockStudentRepository.reset();
      mockStudentRepository.findByEmail = jest.fn().mockResolvedValue(null);

      const newStudent = createTestStudent({
        email: 'new@example.com',
        name: 'New User',
        firebaseUid: 'new-uid',
      });

      mockStudentRepository.create = jest.fn().mockResolvedValue(newStudent);

      const result = await service.handleLogin('new@example.com', 'New User', 'new-uid');

      expect(mockStudentRepository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'New User',
        firebaseUid: 'new-uid',
        lastLogin: expect.any(Date),
      });
      expect(result).toEqual(newStudent);
    });
  });
});

