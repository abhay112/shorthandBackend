import { AppError } from '../utils/AppError.js';

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    throw new AppError('Admin access required', 403);
  }

  next();
};

/**
 * Middleware to require student role
 */
export const requireStudent = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (req.user.role !== 'student') {
    throw new AppError('Student access required', 403);
  }

  next();
};

/**
 * Middleware to require super admin role
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (req.user.role !== 'super_admin') {
    throw new AppError('Super admin access required', 403);
  }

  next();
};
