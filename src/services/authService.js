// src/services/authService.js
import { auth } from '../config/firebase.js';
import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import { AppError } from '../utils/AppError.js';

class AuthService {
  /**
   * Verify Firebase token
   * @param {string} idToken
   * @returns {Object} decoded Firebase token
   */
  async verifyFirebaseToken(idToken) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new AppError('Invalid Firebase token', 401);
    }
  }

  /**
   * Find user by Firebase UID
   * @param {string} firebaseUid
   * @returns {Object|null} user and role
   */
  async findUserByFirebaseUid(firebaseUid) {
    let user = await Student.findOne({ firebaseUid });
    if (user) return { user, role: 'student' };

    user = await Admin.findOne({ firebaseUid });
    if (user) return { user, role: 'admin' };

    return null;
  }

  /**
   * Create new student
   * @param {Object} userData
   * @returns {Object} student
   */
  async createStudent({ uid, email, name }) {
    const student = new Student({
      firebaseUid: uid,
      email,
      name: name || email.split('@')[0],
      role: 'student',
      lastLogin: new Date(),
    });

    await student.save();
    return student;
  }

  /**
   * Create new admin
   * @param {Object} userData
   * @param {string} role
   * @returns {Object} admin
   */
  async createAdmin({ uid, email, name }, role = 'admin') {
    const admin = new Admin({
      firebaseUid: uid,
      email,
      name: name || email.split('@')[0],
      role,
      lastLogin: new Date(),
    });

    await admin.save();
    return admin;
  }

  /**
   * Update user's last login time
   * @param {Object} user
   * @returns {Object} updated user
   */
  async updateLastLogin(user) {
    user.lastLogin = new Date();
    await user.save();
    return user;
  }

  /**
   * Login or create user
   * @param {string} idToken
   * @returns {Object} { user, isNewUser }
   */
  async loginUser(idToken) {
    const decodedToken = await this.verifyFirebaseToken(idToken);
    const { uid } = decodedToken;

    let userResult = await this.findUserByFirebaseUid(uid);
    let user = userResult?.user;
    let role = userResult?.role;
    let isNewUser = false;

    if (!user) {
      // Create new student by default
      user = await this.createStudent(decodedToken);
      role = 'student';
      isNewUser = true;
    } else {
      await this.updateLastLogin(user);
    }

    return {
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        role,
        isApproved: user.isApproved || false,
        isBlocked: user.isBlocked || false,
        isActive: user.isActive !== undefined ? user.isActive : true,
      },
      isNewUser,
    };
  }

  /**
   * Get user profile by Firebase UID
   * @param {string} firebaseUid
   * @returns {Object} user profile
   */
  async getUserProfile(firebaseUid) {
    const userResult = await this.findUserByFirebaseUid(firebaseUid);
    if (!userResult) throw new AppError('User not found', 404);

    const { user, role } = userResult;

    return {
      id: user._id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      role,
      isApproved: user.isApproved || false,
      isBlocked: user.isBlocked || false,
      isActive: user.isActive !== undefined ? user.isActive : true,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  }

   async isEmailRegistered(email) {
    const student = await Student.findOne({ email });
    if (student) return true;

    const admin = await Admin.findOne({ email });
    if (admin) return true;

    return false;
  }
}

export default new AuthService();
