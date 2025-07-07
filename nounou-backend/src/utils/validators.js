const Joi = require('joi');
const { USER, REGEX } = require('../config/constants');

// Custom Joi validation for MongoDB ObjectId
const objectId = () => Joi.string().pattern(REGEX.OBJECT_ID).messages({
  'string.pattern.base': 'Invalid ObjectId format'
});

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
      .items(Joi.string().trim())
      .optional(),
    
    allergies: Joi.array()
      .items(Joi.string().trim())
      .optional(),
    
    healthConditions: Joi.array()
      .items(Joi.string().trim())
      .optional(),

    // Device info for registration
    deviceId: Joi.string()
      .optional(),
    
    deviceType: Joi.string()
      .valid(...USER.SESSION.DEVICE_TYPES)
      .default('mobile')
      .optional(),

    // Marketing and privacy preferences
    marketingConsent: Joi.boolean()
      .default(false)
      .optional(),

    termsAccepted: Joi.boolean()
      .valid(true)
      .required()
      .messages({
        'any.only': 'You must accept the terms and conditions'
      }),

    privacyPolicyAccepted: Joi.boolean()
      .valid(true)
      .required()
      .messages({
        'any.only': 'You must accept the privacy policy'
      })
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
      .optional(),
    
    deviceType: Joi.string()
      .valid(...USER.SESSION.DEVICE_TYPES)
      .default('mobile')
      .optional(),

    rememberMe: Joi.boolean()
      .default(false)
      .optional()
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
      .items(Joi.string().trim())
      .optional(),
    
    allergies: Joi.array()
      .items(Joi.string().trim())
      .optional(),
    
    healthConditions: Joi.array()
      .items(Joi.string().trim())
      .optional(),

    // Profile image
    profileImageUrl: Joi.string()
      .uri()
      .optional(),

    // Bio/description
    bio: Joi.string()
      .max(500)
      .optional()
      .allow('')
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
      }),

    logoutOtherDevices: Joi.boolean()
      .default(false)
      .optional()
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
      .messages({
        'number.min': 'Daily water target must be at least 1000ml',
        'number.max': 'Daily water target must not exceed 5000ml'
      })
  });

  // Schema pour les paramètres utilisateur
  static settingsSchema = Joi.object({
    notifications: Joi.object({
      email: Joi.boolean().optional(),
      push: Joi.boolean().optional(),
      reminders: Joi.boolean().optional()
    }).optional(),
    
    privacy: Joi.object({
      profileVisible: Joi.boolean().optional(),
      shareProgress: Joi.boolean().optional()
    }).optional(),
    
    units: Joi.object({
      weight: Joi.string().valid('kg', 'lbs').optional(),
      height: Joi.string().valid('cm', 'ft').optional(),
      temperature: Joi.string().valid('celsius', 'fahrenheit').optional()
    }).optional(),
    
    language: Joi.string()
      .valid('en', 'fr', 'es', 'ar')
      .optional(),
    
    timezone: Joi.string()
      .optional()
  });

  // Schema pour l'email de validation
  static emailSchema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      })
  });

  // Schema pour la réinitialisation de mot de passe
  static passwordResetSchema = Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required'
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

  // Schema pour la suppression de compte
  static accountDeletionSchema = Joi.object({
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required to delete account'
      }),
    
    reason: Joi.string()
      .valid('privacy', 'not_useful', 'too_complex', 'found_alternative', 'other')
      .optional(),
    
    feedback: Joi.string()
      .max(1000)
      .optional()
  });

  // Schema pour l'export de données
  static exportFormatSchema = Joi.object({
    format: Joi.string()
      .valid('json', 'csv', 'xlsx')
      .default('json')
      .optional()
  });

  // Schema pour la demande de suppression de données (GDPR)
  static dataDeletionRequestSchema = Joi.object({
    reason: Joi.string()
      .required()
      .messages({
        'any.required': 'Reason for deletion is required'
      }),
    
    confirmEmail: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email confirmation is required'
      })
  });

  // Schema pour l'upgrade d'abonnement
  static subscriptionUpgradeSchema = Joi.object({
    subscriptionType: Joi.string()
      .valid(...USER.SUBSCRIPTION_TYPES.filter(type => type !== 'free'))
      .required()
      .messages({
        'any.only': 'Invalid subscription type',
        'any.required': 'Subscription type is required'
      }),
    
    paymentMethod: Joi.string()
      .required()
      .messages({
        'any.required': 'Payment method is required'
      }),
    
    billingCycle: Joi.string()
      .valid('monthly', 'yearly')
      .default('monthly')
      .optional()
  });

  // Schema pour les requêtes AI
  static aiCoachRequestSchema = Joi.object({
    query: Joi.string()
      .min(10)
      .max(500)
      .required()
      .messages({
        'string.min': 'Query must be at least 10 characters',
        'string.max': 'Query must not exceed 500 characters',
        'any.required': 'Query is required'
      }),
    
    context: Joi.object({
      currentGoals: Joi.array().items(objectId()).optional(),
      recentMeals: Joi.array().items(objectId()).optional(),
      healthConditions: Joi.array().items(Joi.string()).optional()
    }).optional()
  });

  // Schema pour la validation d'images
  static imageUploadSchema = Joi.object({
    image: Joi.string()
      .required()
      .messages({
        'any.required': 'Image data is required'
      }),
    
    mealType: Joi.string()
      .valid('breakfast', 'lunch', 'dinner', 'snack', 'other')
      .optional(),
    
    timestamp: Joi.date()
      .optional()
  });

  // Schema pour la validation de codes-barres
  static barcodeDataSchema = Joi.object({
    barcode: Joi.string()
      .min(8)
      .max(18)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.min': 'Barcode must be at least 8 digits',
        'string.max': 'Barcode must not exceed 18 digits',
        'string.pattern.base': 'Barcode must contain only numbers',
        'any.required': 'Barcode is required'
      }),
    
    quantity: Joi.number()
      .positive()
      .optional(),
    
    mealType: Joi.string()
      .valid('breakfast', 'lunch', 'dinner', 'snack', 'other')
      .optional()
  });

  // Schema pour la validation de données vocales
  static voiceDataSchema = Joi.object({
    audioData: Joi.string()
      .required()
      .messages({
        'any.required': 'Audio data is required'
      }),
    
    duration: Joi.number()
      .positive()
      .max(60)
      .optional()
      .messages({
        'number.positive': 'Duration must be positive',
        'number.max': 'Audio duration must not exceed 60 seconds'
      }),
    
    language: Joi.string()
      .valid('en', 'fr', 'es', 'ar')
      .default('en')
      .optional()
  });

  // Schema pour les actions en lot
  static bulkUserActionSchema = Joi.object({
    action: Joi.string()
      .valid('activate', 'deactivate', 'upgrade', 'downgrade', 'delete')
      .required()
      .messages({
        'any.only': 'Invalid bulk action',
        'any.required': 'Action is required'
      }),
    
    reason: Joi.string()
      .optional(),
    
    metadata: Joi.object()
      .optional()
  });

  // Schema pour la mise à jour du statut utilisateur
  static userStatusUpdateSchema = Joi.object({
    status: Joi.string()
      .valid('active', 'inactive', 'suspended', 'pending')
      .required()
      .messages({
        'any.only': 'Invalid user status',
        'any.required': 'Status is required'
      }),
    
    reason: Joi.string()
      .required()
      .messages({
        'any.required': 'Reason is required'
      })
  });

  // Schema pour les options de nettoyage de données
  static dataCleanupOptionsSchema = Joi.object({
    olderThan: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'Age must be positive',
        'any.required': 'Age threshold is required'
      }),
    
    unit: Joi.string()
      .valid('days', 'months', 'years')
      .default('days')
      .optional(),
    
    dryRun: Joi.boolean()
      .default(true)
      .optional()
  });

  // Schema pour les options de partage
  static sharingOptionsSchema = Joi.object({
    visibility: Joi.string()
      .valid('public', 'friends', 'private')
      .default('friends')
      .optional(),
    
    includeNutrition: Joi.boolean()
      .default(true)
      .optional(),
    
    message: Joi.string()
      .max(280)
      .optional()
  });

  // Schema pour le progrès des objectifs
  static goalProgressSchema = Joi.object({
    goalId: objectId().required(),
    
    currentWeight: Joi.number()
      .min(USER.MIN_WEIGHT)
      .max(USER.MAX_WEIGHT)
      .optional(),
    
    notes: Joi.string()
      .max(500)
      .optional()
  });

  // Validation helper
  static validate(schema, data) {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      return { isValid: false, errors, data: null };
    }

    return { isValid: true, errors: null, data: value };
  }

  // Validate ObjectId format
  static validateObjectId(id) {
    return REGEX.OBJECT_ID.test(id);
  }

  // Validate multiple ObjectIds
  static validateObjectIds(ids) {
    if (!Array.isArray(ids)) return false;
    return ids.every(id => this.validateObjectId(id));
  }

  // Custom validation for conditional required fields
  static validateConditional(schema, data, conditions) {
    // First validate with base schema
    const baseValidation = this.validate(schema, data);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Apply conditional validations
    const conditionalErrors = [];
    
    conditions.forEach(condition => {
      if (condition.when(data) && !condition.validate(data)) {
        conditionalErrors.push({
          field: condition.field,
          message: condition.message
        });
      }
    });

    if (conditionalErrors.length > 0) {
      return { 
        isValid: false, 
        errors: conditionalErrors, 
        data: null 
      };
    }

    return baseValidation;
  }
}

module.exports = Validators;