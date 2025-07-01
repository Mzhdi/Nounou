const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { REGEX } = require('../config/constants');

class PasswordUtils {
  static async hash(password) {
    try {
      const salt = await bcrypt.genSalt(config.security.bcryptRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  static async compare(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error('Password comparison failed');
    }
  }

  static validate(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password && password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    if (!REGEX.PASSWORD.test(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static generateTemporaryPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
    let result = '';
    
    // Ensure at least one of each required character type
    result += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
    result += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
    result += '0123456789'[Math.floor(Math.random() * 10)]; // Number
    result += '@#$%'[Math.floor(Math.random() * 4)]; // Special char
    
    // Fill remaining characters
    for (let i = 4; i < 12; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the result
    return result.split('').sort(() => Math.random() - 0.5).join('');
  }
}

module.exports = PasswordUtils;