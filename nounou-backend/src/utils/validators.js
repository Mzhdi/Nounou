const Joi = require('joi');
const { USER, REGEX } = require('../config/constants');

class Validators {
  // Schema pour l'inscription
  static registerSchema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(USER.MIN_PASSWORD_LENGTH)
      .max(USER.MAX_PASSWORD_LENGTH)
      .pattern(REGEX.PASSWORD)
      .required()
      .messages({
        'string.min': `Password must be at least ${USER.MIN_PASSWORD_LENGTH} characters`,
        'string.max': `Password must not exceed ${USER.MAX_PASSWORD_LENGTH} characters`,
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
        'any.required': 'Password is required'
      }),
    
    firstName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name must not exceed 50 characters',
        'any.required': 'First name is required'
      }),
    
    lastName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Last name must be at least 2 characters',
        'string.max': 'Last name must not exceed 50 characters',
        'any.required': 'Last name is required'
      }),
    
    phone: Joi.string()
      .pattern(REGEX.PHONE)
      .optional()
      .messages({
        'string.pattern.base': 'Please enter a valid phone number'
      }),
    
    dateOfBirth: Joi.date()
      .max('now')
      .min(new Date(Date.now() - USER.MAX_AGE * 365.25 * 24 * 60 * 60 * 1000))
      .optional()
      .messages({
        'date.max': 'Date of birth cannot be in the future',
        'date.min': `Age cannot exceed ${USER.MAX_AGE} years`
      }),
    
    gender: Joi.string()
      .valid(...USER.GENDERS)
      .optional()
      .messages({
        'any.only': `Gender must be one of: ${USER.GENDERS.join(', ')}`
      }),
    
    height: Joi.number()
      .min(USER.MIN_HEIGHT)
      .max(USER.MAX_HEIGHT)
      .optional()
      .messages({
        'number.min': `Height must be at least ${USER.MIN_HEIGHT}cm`,
        'number.max': `Height must not exceed ${USER.MAX_HEIGHT}cm`
      }),
    
    weight: Joi.number()
      .min(USER.MIN_WEIGHT)
      .max(USER.MAX_WEIGHT)
      .optional()
      .messages({
        'number.min': `Weight must be at least ${USER.MIN_WEIGHT}kg`,
        'number.max': `Weight must not exceed ${USER.MAX_WEIGHT}kg`
      }),
    
    activityLevel: Joi.string()
      .valid(...USER.ACTIVITY_LEVELS)
      .optional()
      .messages({
        'any.only': `Activity level must be one of: ${USER.ACTIVITY_LEVELS.join(', ')}`
      }),
    
    dietaryPreferences: Joi.array()
      .items(Joi.string())
      .optional(),
    
    allergies: Joi.array()
      .items(Joi.string())
      .optional(),
    
    healthConditions: Joi.array()
      .items(Joi.string())
      .optional()
  });

  // Schema pour la connexion
  static loginSchema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      }),
    
    deviceId: Joi.string()
      .uuid()
      .optional(),
    
    deviceType: Joi.string()
      .valid(...USER.SESSION.DEVICE_TYPES)  // 👈 CORRIGÉ ICI
      .default('mobile')
  });

  // Schema pour mise à jour profil
  static updateProfileSchema = Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .optional(),
    
    lastName: Joi.string()
      .min(2)
      .max(50)
      .optional(),
    
    phone: Joi.string()
      .pattern(REGEX.PHONE)
      .optional()
      .allow(''),
    
    dateOfBirth: Joi.date()
      .max('now')
      .min(new Date(Date.now() - USER.MAX_AGE * 365.25 * 24 * 60 * 60 * 1000))
      .optional(),
    
    gender: Joi.string()
      .valid(...USER.GENDERS)
      .optional(),
    
    height: Joi.number()
      .min(USER.MIN_HEIGHT)
      .max(USER.MAX_HEIGHT)
      .optional(),
    
    weight: Joi.number()
      .min(USER.MIN_WEIGHT)
      .max(USER.MAX_WEIGHT)
      .optional(),
    
    activityLevel: Joi.string()
      .valid(...USER.ACTIVITY_LEVELS)
      .optional(),
    
    dietaryPreferences: Joi.array()
      .items(Joi.string())
      .optional(),
    
    allergies: Joi.array()
      .items(Joi.string())
      .optional(),
    
    healthConditions: Joi.array()
      .items(Joi.string())
      .optional()
  });

  // Schema pour changement de mot de passe
  static changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    
    newPassword: Joi.string()
      .min(USER.MIN_PASSWORD_LENGTH)
      .max(USER.MAX_PASSWORD_LENGTH)
      .pattern(REGEX.PASSWORD)
      .required()
      .messages({
        'string.min': `Password must be at least ${USER.MIN_PASSWORD_LENGTH} characters`,
        'string.max': `Password must not exceed ${USER.MAX_PASSWORD_LENGTH} characters`,
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
        'any.required': 'New password is required'
      })
  });

  // Schema pour les objectifs utilisateur
  static goalSchema = Joi.object({
    goalType: Joi.string()
      .valid(...USER.GOAL_TYPES)
      .required()
      .messages({
        'any.only': `Goal type must be one of: ${USER.GOAL_TYPES.join(', ')}`,
        'any.required': 'Goal type is required'
      }),
    
    targetWeight: Joi.number()
      .min(USER.MIN_WEIGHT)
      .max(USER.MAX_WEIGHT)
      .optional(),
    
    targetDate: Joi.date()
      .min('now')
      .optional()
      .messages({
        'date.min': 'Target date cannot be in the past'
      }),
    
    dailyCaloriesTarget: Joi.number()
      .min(800)
      .max(5000)
      .optional()
      .messages({
        'number.min': 'Daily calories target must be at least 800',
        'number.max': 'Daily calories target must not exceed 5000'
      }),
    
    dailyProteinTarget: Joi.number()
      .min(10)
      .max(300)
      .optional(),
    
    dailyFatTarget: Joi.number()
      .min(10)
      .max(200)
      .optional(),
    
    dailyCarbsTarget: Joi.number()
      .min(50)
      .max(500)
      .optional(),
    
    dailyFiberTarget: Joi.number()
      .min(10)
      .max(100)
      .optional(),
    
    dailyWaterTarget: Joi.number()
      .min(1000)
      .max(5000)
      .optional()
  });

  // Validation helper
  static validate(schema, data) {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return { isValid: false, errors, data: null };
    }

    return { isValid: true, errors: null, data: value };
  }
}

module.exports = Validators;