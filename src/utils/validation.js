import { AppError } from './AppError.js';
import mongoose from 'mongoose';

/**
 * Validate if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {AppError} If ID is invalid
 * @returns {boolean} True if valid
 */
export const validateObjectId = (id, fieldName = 'ID') => {
  // Check for common invalid values
  if (!id || id === '[object Object]' || id === 'undefined' || id === 'null') {
    throw new AppError(`Invalid ${fieldName} provided`, 400, 'INVALID_ID');
  }
  
  // Check if it's a valid MongoDB ObjectId format (24 hex characters)
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new AppError(
      `Invalid ${fieldName} format. Please provide a valid ${fieldName}.`, 
      400, 
      'INVALID_ID_FORMAT'
    );
  }
  
  return true;
};

/**
 * Validate multiple ObjectIds at once
 * @param {Object} ids - Object with key-value pairs of field names and IDs
 * @throws {AppError} If any ID is invalid
 * @returns {boolean} True if all valid
 */
export const validateObjectIds = (ids) => {
  for (const [fieldName, id] of Object.entries(ids)) {
    validateObjectId(id, fieldName);
  }
  return true;
};

/**
 * Check if a value is a valid MongoDB ObjectId (without throwing)
 * @param {string} id - The ID to check
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  if (id === '[object Object]' || id === 'undefined' || id === 'null') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @throws {AppError} If email is invalid
 * @returns {boolean} True if valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
  }
  
  return true;
};

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Validated pagination params
 */
export const validatePagination = (page = 1, limit = 20) => {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    skip: (validatedPage - 1) * validatedLimit
  };
};

/**
 * Validate required fields in request body
 * @param {Object} data - Request body
 * @param {Array<string>} requiredFields - List of required field names
 * @throws {AppError} If any required field is missing
 * @returns {boolean} True if all required fields present
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
  
  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required fields: ${missingFields.join(', ')}`,
      400,
      'MISSING_REQUIRED_FIELDS',
      { missingFields }
    );
  }
  
  return true;
};

/**
 * Sanitize string input (basic XSS prevention)
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};

/**
 * Validate date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @throws {AppError} If date range is invalid
 * @returns {Object} Validated date range
 */
export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) {
    throw new AppError('Invalid start date', 400, 'INVALID_START_DATE');
  }
  
  if (isNaN(end.getTime())) {
    throw new AppError('Invalid end date', 400, 'INVALID_END_DATE');
  }
  
  if (start > end) {
    throw new AppError('Start date must be before end date', 400, 'INVALID_DATE_RANGE');
  }
  
  return { startDate: start, endDate: end };
};

export default {
  validateObjectId,
  validateObjectIds,
  isValidObjectId,
  validateEmail,
  validatePagination,
  validateRequiredFields,
  sanitizeString,
  validateDateRange
};

