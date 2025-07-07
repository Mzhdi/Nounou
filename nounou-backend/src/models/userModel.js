const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Profile Schema
const userProfileSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  password_hash: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Don't include by default
  },
  
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  phone: {
    type: String,
    trim: true,
    sparse: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true; // Optional field
        const now = new Date();
        const age = now.getFullYear() - date.getFullYear();
        return age >= 13 && age <= 120;
      },
      message: 'Age must be between 13 and 120 years'
    }
  },
  
  gender: {
    type: String,
    enum: {
      values: ['M', 'F', 'Other'],
      message: '{VALUE} is not a valid gender'
    }
  },
  
  height: {
    type: Number,
    min: [100, 'Height must be at least 100cm'],
    max: [250, 'Height cannot exceed 250cm']
  },
  
  weight: {
    type: Number,
    min: [30, 'Weight must be at least 30kg'],
    max: [300, 'Weight cannot exceed 300kg']
  },
  
  activityLevel: {
    type: String,
    enum: {
      values: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
      message: '{VALUE} is not a valid activity level'
    },
    default: 'moderate'
  },
  
  dietaryPreferences: [{
    type: String,
    trim: true
  }],
  
  allergies: [{
    type: String,
    trim: true
  }],
  
  healthConditions: [{
    type: String,
    trim: true
  }],
  
  subscriptionType: {
    type: String,
    enum: {
      values: ['free', 'premium', 'pro'],
      message: '{VALUE} is not a valid subscription type'
    },
    default: 'free'
  },
  
  subscriptionExpiresAt: {
    type: Date,
    index: true
  },
  
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  
  profileCompletion: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Preferences and settings
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true }
    },
    privacy: {
      profileVisible: { type: Boolean, default: false },
      shareProgress: { type: Boolean, default: false }
    },
    units: {
      weight: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
      height: { type: String, enum: ['cm', 'ft'], default: 'cm' },
      temperature: { type: String, enum: ['celsius', 'fahrenheit'], default: 'celsius' }
    },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' }
  },
  
  // Metadata
  metadata: {
    registrationSource: { type: String, default: 'web' },
    referralCode: String,
    marketingConsent: { type: Boolean, default: false },
    termsAcceptedAt: Date,
    privacyPolicyAcceptedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password_hash;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// User Session Schema
const userSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  refreshToken: {
    type: String,
    required: true,
    index: true
  },
  
  deviceId: {
    type: String,
    required: true
  },
  
  deviceType: {
    type: String,
    enum: ['mobile', 'tablet', 'web', 'desktop'],
    default: 'mobile'
  },
  
  deviceInfo: {
    platform: String,
    version: String,
    model: String,
    userAgent: String
  },
  
  ipAddress: {
    type: String,
    required: true
  },
  
  location: {
    country: String,
    city: String,
    timezone: String
  },
  
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// User Goals Schema
const userGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  goalType: {
    type: String,
    enum: ['weight_loss', 'weight_gain', 'maintain', 'muscle_gain', 'health_improvement'],
    required: true
  },
  
  targetWeight: Number,
  targetDate: Date,
  
  dailyCaloriesTarget: Number,
  dailyProteinTarget: Number,
  dailyCarbsTarget: Number,
  dailyFatTarget: Number,
  dailyFiberTarget: Number,
  dailyWaterTarget: Number,
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  progress: {
    currentWeight: Number,
    weightChange: Number,
    daysCompleted: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastUpdated: Date
  }
}, {
  timestamps: true
});

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  action: {
    type: String,
    required: true
  },
  
  resource: String,
  method: String,
  
  ipAddress: String,
  userAgent: String,
  
  metadata: mongoose.Schema.Types.Mixed,
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Indexes
userProfileSchema.index({ email: 1 }, { unique: true });
userProfileSchema.index({ subscriptionType: 1, isActive: 1 });
userProfileSchema.index({ subscriptionExpiresAt: 1 }, { sparse: true });
userProfileSchema.index({ lastActiveAt: -1 });
userProfileSchema.index({ createdAt: -1 });

userSessionSchema.index({ userId: 1, expiresAt: 1 });
userSessionSchema.index({ deviceId: 1 });
userSessionSchema.index({ token: 1 }, { unique: true });

userGoalSchema.index({ userId: 1, isActive: 1 });
userGoalSchema.index({ goalType: 1 });

activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1 });

// Virtual properties
userProfileSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userProfileSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

userProfileSchema.virtual('bmi').get(function() {
  if (!this.weight || !this.height) return null;
  return (this.weight / Math.pow(this.height / 100, 2)).toFixed(1);
});

// Instance methods
userProfileSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

userProfileSchema.methods.calculateProfileCompletion = function() {
  const requiredFields = ['firstName', 'lastName', 'email', 'dateOfBirth', 'gender', 'height', 'weight', 'activityLevel'];
  const optionalFields = ['phone', 'dietaryPreferences', 'healthConditions'];
  
  let completion = 0;
  const fieldWeight = 100 / (requiredFields.length + optionalFields.length * 0.5);
  
  requiredFields.forEach(field => {
    if (this[field]) completion += fieldWeight;
  });
  
  optionalFields.forEach(field => {
    if (this[field] && (Array.isArray(this[field]) ? this[field].length > 0 : true)) {
      completion += fieldWeight * 0.5;
    }
  });
  
  return Math.round(completion);
};

userProfileSchema.methods.isSubscriptionActive = function() {
  if (this.subscriptionType === 'free') return true;
  if (!this.subscriptionExpiresAt) return false;
  return new Date() < this.subscriptionExpiresAt;
};

userProfileSchema.methods.sanitize = function() {
  const user = this.toObject();
  delete user.password_hash;
  delete user.__v;
  return user;
};

// Static methods
userProfileSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(), 
    isActive: true 
  }).select('+password_hash');
};

userProfileSchema.statics.findActiveUsers = function(filters = {}) {
  return this.find({ 
    isActive: true,
    ...filters
  });
};

userProfileSchema.statics.getSubscriptionStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$subscriptionType',
        count: { $sum: 1 },
        avgProfileCompletion: { $avg: '$profileCompletion' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

userProfileSchema.statics.getUserRetentionStats = function() {
  const now = new Date();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $gte: ['$lastActiveAt', dayAgo] }, then: 'active_today' },
              { case: { $gte: ['$lastActiveAt', weekAgo] }, then: 'active_week' },
              { case: { $gte: ['$lastActiveAt', monthAgo] }, then: 'active_month' }
            ],
            default: 'inactive'
          }
        },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Middleware
userProfileSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password_hash') && !this.password_hash.startsWith('$2')) {
    this.password_hash = await bcrypt.hash(this.password_hash, 12);
  }
  
  // Update profile completion
  this.profileCompletion = this.calculateProfileCompletion();
  
  // Update lastActiveAt
  if (this.isModified() && !this.isNew) {
    this.lastActiveAt = new Date();
  }
  
  next();
});

userProfileSchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastActiveAt: new Date() });
  next();
});

// Create models
const User = mongoose.model('User', userProfileSchema);
const UserSession = mongoose.model('UserSession', userSessionSchema);
const UserGoal = mongoose.model('UserGoal', userGoalSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// UserModel class for backward compatibility and service layer
class UserModel {
  // User CRUD operations
  async create(userData) {
    const user = new User(userData);
    return user.save();
  }

  async findByEmail(email) {
    return User.findByEmail(email);
  }

  async findById(id) {
    return User.findById(id).where({ isActive: true });
  }

  async update(id, updateData) {
    return User.findByIdAndUpdate(
      id, 
      { ...updateData, lastActiveAt: new Date() },
      { new: true, runValidators: true }
    ).where({ isActive: true });
  }

  async updatePassword(id, newPasswordHash) {
    return User.findByIdAndUpdate(
      id,
      { password_hash: newPasswordHash, lastActiveAt: new Date() },
      { new: true }
    ).where({ isActive: true });
  }

  async deactivate(id) {
    return User.findByIdAndUpdate(
      id,
      { isActive: false, lastActiveAt: new Date() },
      { new: true }
    );
  }

  async updateLastActive(id) {
    return User.findByIdAndUpdate(
      id,
      { lastActiveAt: new Date() },
      { new: true }
    );
  }

  // Session management
  async createSession(sessionData) {
    const session = new UserSession(sessionData);
    return session.save();
  }

  async findSessionByToken(token) {
    return UserSession.findOne({ 
      token, 
      expiresAt: { $gt: new Date() },
      isActive: true 
    }).populate('userId', 'email isActive role subscriptionType');
  }

  async updateSessionActivity(sessionId, updateData) {
    return UserSession.findByIdAndUpdate(
      sessionId,
      { ...updateData, lastUsedAt: new Date() },
      { new: true }
    );
  }

  async validateSession(userId, sessionId) {
    const session = await UserSession.findOne({
      _id: sessionId,
      userId,
      expiresAt: { $gt: new Date() },
      isActive: true
    });
    return !!session;
  }

  async validateRefreshToken(userId, refreshToken) {
    const session = await UserSession.findOne({
      userId,
      refreshToken,
      expiresAt: { $gt: new Date() },
      isActive: true
    });
    return !!session;
  }

  async updateSessionTokens(sessionId, tokenPair) {
    return UserSession.findByIdAndUpdate(
      sessionId,
      { 
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        lastUsedAt: new Date()
      },
      { new: true }
    );
  }

  async deleteSession(token) {
    return UserSession.findOneAndDelete({ token });
  }

  async deleteAllUserSessions(userId) {
    const result = await UserSession.deleteMany({ userId });
    return result.deletedCount;
  }

  async deleteExpiredSessions() {
    const result = await UserSession.deleteMany({ 
      expiresAt: { $lte: new Date() } 
    });
    return result.deletedCount;
  }

  // Goals management
  async createGoal(goalData) {
    const goal = new UserGoal(goalData);
    return goal.save();
  }

  async getUserGoals(userId) {
    return UserGoal.find({ userId, isActive: true }).sort({ createdAt: -1 });
  }

  async updateGoal(goalId, updateData) {
    return UserGoal.findByIdAndUpdate(
      goalId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async deleteGoal(goalId) {
    return UserGoal.findByIdAndUpdate(
      goalId,
      { isActive: false },
      { new: true }
    );
  }

  // Activity logging
  async logActivity(userId, activityData) {
    const log = new ActivityLog({
      userId,
      ...activityData
    });
    return log.save();
  }

  async getUserActivity(userId, options = {}) {
    const { limit = 50, skip = 0, action } = options;
    const filter = { userId };
    if (action) filter.action = action;

    return ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);
  }

  // Statistics
  async countActiveUsers() {
    return User.countDocuments({ isActive: true });
  }

  async getSubscriptionStats() {
    return User.getSubscriptionStats();
  }

  async getUserRetentionStats() {
    return User.getUserRetentionStats();
  }

  async getUserRegistrationStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          registrations: { $sum: 1 },
          premiumRegistrations: {
            $sum: { $cond: [{ $ne: ['$subscriptionType', 'free'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);
  }

  // Search users (admin functionality)
  async searchUsers(options = {}) {
    const { query, page = 1, limit = 20, status, subscriptionType } = options;
    const filter = {};

    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (subscriptionType) filter.subscriptionType = subscriptionType;

    if (query) {
      filter.$or = [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password_hash')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }
}

module.exports = {
  UserModel: new UserModel(),
  User,
  UserSession,
  UserGoal,
  ActivityLog
};