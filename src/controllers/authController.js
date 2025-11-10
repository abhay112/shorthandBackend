// src/controllers/authController.js
import authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';

/**
 * Login user
 */
export const login = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) throw new AppError('Firebase ID token is required', 400);

  const loginResult = await authService.loginUser(token);

  // set cookie
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return sendResponse(
    res,
    200,
    true,
    loginResult.isNewUser
      ? 'User created and logged in successfully'
      : 'Login successful',
    { user: loginResult.user },
    { userId: loginResult.user.id, email: loginResult.user.email }
  );
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('authToken');
  return sendResponse(
    res,
    200,
    true,
    'Logout successful',
    {},
    { userId: req.user?.id, email: req.user?.email, ip: req.ip }
  );
});

/**
 * Get current user profile
 */
export const me = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const userProfile = await authService.getUserProfile(req.user.uid);

  return sendResponse(res, 200, true, 'User profile fetched', { user: userProfile });
});

/**
 * Verify token validity
 */
export const verifyToken = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  return sendResponse(res, 200, true, 'Token is valid', {
    user: { id: req.user.id, email: req.user.email, role: req.user.role },
  });
});


export const verifyEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new AppError('Email is required', 400);

  const exists = await authService.isEmailRegistered(email);

  return sendResponse(res, 200, true, 'Email verification successful', { exists });
});