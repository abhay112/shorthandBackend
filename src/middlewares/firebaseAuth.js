import { auth } from '../config/firebase.js';
import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

// Firebase Authentication Middleware
export const authenticateFirebase = async (req, res, next) => {
  try {
    const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      logger.warn('Authentication attempt without token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token provided' 
      });
    }

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email.split('@')[0]
    };

    // Check if user exists in our database
    let user = await Student.findOne({ firebaseUid: decodedToken.uid });
    let userRole = 'student';
    
    if (!user) {
      user = await Admin.findOne({ firebaseUid: decodedToken.uid });
      userRole = 'admin';
    }

    if (!user) {
      logger.warn('User not found in database', {
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false, 
        message: 'User not found in database' 
      });
    }

    // Add user info to request
    req.user.id = user._id;
    req.user.role = userRole;
    req.user.isApproved = user.isApproved || false;
    req.user.isBlocked = user.isBlocked || false;
    req.user.isActive = user.isActive !== undefined ? user.isActive : true;

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info('User authenticated successfully', {
      userId: user._id,
      email: user.email,
      role: userRole,
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.error('Firebase authentication error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      url: req.originalUrl
    });
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid authentication token' 
    });
  }
};

// Role-based authorization middleware
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Check if user is approved (for students)
export const requireApproval = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  if (req.user.role === 'student' && !req.user.isApproved) {
    return res.status(403).json({ 
      success: false, 
      message: 'Account not approved yet' 
    });
  }

  if (req.user.isBlocked) {
    return res.status(403).json({ 
      success: false, 
      message: 'Account is blocked' 
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({ 
      success: false, 
      message: 'Account is inactive' 
    });
  }

  next();
};

// Super admin only middleware
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const user = req.user;
  if (user.role !== 'super_admin') {
    logger.warn('Super admin access denied', {
      userId: user.id,
      userRole: user.role,
      ip: req.ip,
      url: req.originalUrl
    });
    return res.status(403).json({ 
      success: false, 
      message: 'Super admin access required' 
    });
  }

  next();
};

// Admin or Super Admin middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const user = req.user;
  if (!['admin', 'super_admin'].includes(user.role)) {
    logger.warn('Admin access denied', {
      userId: user.id,
      userRole: user.role,
      ip: req.ip,
      url: req.originalUrl
    });
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }

  next();
};
