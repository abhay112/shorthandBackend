// src/controllers/authController.js
import authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendResponse } from '../utils/sendResponse.js';

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase ID token
 *               role:
 *                 type: string
 *                 enum: [student, admin, super_admin]
 *                 description: User role (optional, defaults to student)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 */
/**
 * Register user
 */
export const register = asyncHandler(async (req, res) => {
  const { token, role } = req.body;

  if (!token) throw new AppError('Firebase ID token is required', 400);

  const decodedToken = await authService.verifyFirebaseToken(token);

  const existingUser = await authService.findUserByFirebaseUid(decodedToken.uid);
  if (existingUser) throw new AppError('User already exists', 400);

  const newUser = role === 'admin' || role === 'super_admin'
      ? await authService.createAdmin(decodedToken, role)
      : await authService.createStudent(decodedToken);

  // set cookie
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return sendResponse(
    res,
    201,
    true,
    'Registration successful',
    {
      id: newUser._id,
      firebaseUid: newUser.firebaseUid,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
    { userId: newUser._id, email: newUser.email, role: newUser.role }
  );
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase ID token
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 */
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