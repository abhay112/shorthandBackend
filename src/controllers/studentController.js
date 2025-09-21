import studentService from '../services/studentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/AppError.js';

import logger from '../utils/logger.js';

export const getStudentProfile = asyncHandler(async (req, res) => {
  const studentId = req.user.id; // Get from authenticated user
  
  const profile = await studentService.getProfile(studentId);
  
  logger.info('Student profile fetched', {
    studentId: studentId,
    ip: req.ip
  });
  
  res.json({
    success: true,
    data: profile
  });
});

export const getCurrentTestForShift = asyncHandler(async (req, res) => {
  const studentId = req.user.id; // Get from authenticated user
  
  const test = await studentService.getTestForCurrentShift(studentId);
  
  logger.info('Current test fetched for student', {
    studentId: studentId,
    ip: req.ip
  });
  
  res.json({
    success: true,
    data: test
  });
});

export const submitTestResult = asyncHandler(async (req, res) => {
  const data = req.body;
  const studentId = req.user.id; // Get from authenticated user
  
  if (!data) {
    throw createError('Test result data is required', 400);
  }
  
  const result = await studentService.submitResult({ ...data, studentId });
  
  logger.info('Test result submitted', {
    studentId: studentId,
    testId: data.testId,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: 'Test result submitted successfully',
    data: result
  });
});

export const getStudentResults = asyncHandler(async (req, res) => {
  const studentId = req.user.id; // Get from authenticated user
  
  const results = await studentService.getStudentResults(studentId);
  
  logger.info('Student results fetched', {
    studentId: studentId,
    resultCount: results.length,
    ip: req.ip
  });
  
  res.json({
    success: true,
    data: results,
    count: results.length
  });
});

export const getStudentProgress = asyncHandler(async (req, res) => {
  const studentId = req.user.id; // Get from authenticated user
  
  const progress = await studentService.getStudentProgress(studentId);
  
  logger.info('Student progress fetched', {
    studentId: studentId,
    ip: req.ip
  });
  
  res.json({
    success: true,
    data: progress
  });
});
