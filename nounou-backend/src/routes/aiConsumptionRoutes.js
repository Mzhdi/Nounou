// src/routes/aiConsumptionRoutes.js
const express = require('express');
const router = express.Router();

const AIConsumptionController = require('../controllers/aiConsumptionController');
const AIImageAnalysisService = require('../services/aiImageAnalysisService');

// Middleware for image upload validation
const validateImageUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No image file provided',
      message: 'Please upload an image file (JPEG, PNG, WebP supported)'
    });
  }

  // Check file size (10MB max)
  if (req.file.size > 10 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      error: 'File too large',
      message: 'Maximum file size is 10MB'
    });
  }

  // Check file type
  if (!req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: 'Only image files are allowed'
    });
  }

  next();
};

// Debug middleware for development
const debugRequest = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('=== DEBUG REQUEST ===');
    console.log('Body:', req.body);
    console.log('User:', req.user);
    console.log('Headers:', req.headers.authorization);
    console.log('=====================');
  }
  next();
};

// ========== AI IMAGE ANALYSIS ENDPOINTS ==========

router.post('/analyze-image',
  /* 
    #swagger.tags = ['AI Image Analysis']
    #swagger.summary = 'Analyze food image with AI'
    #swagger.description = 'Upload a food image and get AI-powered nutrition analysis without creating database entries'
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['foodImage'] = {
      in: 'formData',
      type: 'file',
      required: true,
      description: 'Food image file (JPEG, PNG, WebP, max 10MB)'
    }
    #swagger.parameters['confidence_threshold'] = {
      in: 'formData',
      type: 'integer',
      minimum: 1,
      maximum: 10,
      default: 5,
      description: 'Minimum confidence level required for analysis (1-10)'
    }
    #swagger.responses[200] = { 
      description: 'Image analyzed successfully',
      schema: { $ref: '#/definitions/AIAnalysisResult' }
    }
    #swagger.responses[400] = { 
      description: 'Invalid image or parameters',
      schema: { $ref: '#/definitions/FileUploadError' }
    }
    #swagger.responses[422] = { 
      description: 'Image analysis failed',
      schema: { $ref: '#/definitions/AIError' }
    }
    #swagger.responses[503] = { 
      description: 'AI service not configured',
      schema: { $ref: '#/definitions/AIConfigError' }
    }
  */
  AIImageAnalysisService.getUploadMiddleware(),
  validateImageUpload,
  AIConsumptionController.analyzeImage
);

router.post('/create-from-image',
  /* 
    #swagger.tags = ['AI Consumption']
    #swagger.summary = 'Create consumption entry from food image'
    #swagger.description = 'Upload a food image, analyze it with AI, and automatically create a consumption entry with food creation if needed'
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['foodImage'] = {
      in: 'formData',
      type: 'file',
      required: true,
      description: 'Food image file to analyze'
    }
    #swagger.parameters['userId'] = {
      in: 'formData',
      type: 'string',
      required: true,
      description: 'User ID for whom to create the entry',
      example: '64f7d1b2c8e5f1234567890a'
    }
    #swagger.parameters['mealType'] = {
      in: 'formData',
      type: 'string',
      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
      default: 'other',
      description: 'Type of meal'
    }
    #swagger.parameters['consumedAt'] = {
      in: 'formData',
      type: 'string',
      format: 'date-time',
      description: 'When the food was consumed (defaults to now)'
    }
    #swagger.parameters['confidence_threshold'] = {
      in: 'formData',
      type: 'integer',
      minimum: 1,
      maximum: 10,
      default: 5,
      description: 'Minimum confidence level required'
    }
    #swagger.parameters['create_food_if_new'] = {
      in: 'formData',
      type: 'string',
      enum: ['true', 'false'],
      default: 'true',
      description: 'Whether to create a new food item if not found in database'
    }
    #swagger.responses[201] = { 
      description: 'Consumption entry created successfully',
      schema: { $ref: '#/definitions/AICreateEntryResponse' }
    }
    #swagger.responses[200] = { 
      description: 'Analysis completed but requires manual entry',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          requiresManualEntry: { type: 'boolean', example: true },
          analysisData: { $ref: '#/definitions/FoodAnalysisData' },
          confidence: { type: 'integer', example: 4 },
          message: { type: 'string', example: 'Image analyzed successfully. Please create entry manually.' }
        }
      }
    }
    #swagger.responses[400] = { 
      description: 'Invalid request data',
      schema: { $ref: '#/definitions/FileUploadError' }
    }
    #swagger.responses[422] = { 
      description: 'Could not create food or consumption entry',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Could not create food entry from analysis' },
          analysisData: { $ref: '#/definitions/FoodAnalysisData' },
          suggestion: { type: 'string', example: 'Please create food manually and try again' }
        }
      }
    }
    #swagger.responses[503] = { 
      description: 'Service unavailable',
      schema: { $ref: '#/definitions/AIConfigError' }
    }
  */
  AIImageAnalysisService.getUploadMiddleware(),
  validateImageUpload,
  debugRequest,
  AIConsumptionController.createEntryFromImage
);

router.post('/analyze-multiple',
  /* 
    #swagger.tags = ['AI Image Analysis']
    #swagger.summary = 'Detect multiple foods in one image'
    #swagger.description = 'Upload an image containing multiple food items and get AI analysis for each detected item'
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['foodImage'] = {
      in: 'formData',
      type: 'file',
      required: true,
      description: 'Food image containing multiple food items'
    }
    #swagger.parameters['confidence_threshold'] = {
      in: 'formData',
      type: 'integer',
      minimum: 1,
      maximum: 10,
      default: 5,
      description: 'Minimum confidence level for each detected item'
    }
    #swagger.responses[200] = { 
      description: 'Multiple foods detected and analyzed',
      schema: { $ref: '#/definitions/MultipleFoodsAnalysis' }
    }
    #swagger.responses[400] = { 
      description: 'Invalid image file',
      schema: { $ref: '#/definitions/FileUploadError' }
    }
    #swagger.responses[422] = { 
      description: 'Could not detect multiple foods',
      schema: { $ref: '#/definitions/AIError' }
    }
    #swagger.responses[503] = { 
      description: 'AI service not available',
      schema: { $ref: '#/definitions/AIConfigError' }
    }
  */
  AIImageAnalysisService.getUploadMiddleware(),
  validateImageUpload,
  AIConsumptionController.analyzeMultipleFoods
);

router.post('/create-meal-from-image',
  /* 
    #swagger.tags = ['AI Consumption']
    #swagger.summary = 'Create complete meal from multi-food image'
    #swagger.description = 'Upload an image with multiple foods, detect each item with AI, and create individual consumption entries for each food detected'
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['foodImage'] = {
      in: 'formData',
      type: 'file',
      required: true,
      description: 'Food image containing multiple food items'
    }
    #swagger.parameters['userId'] = {
      in: 'formData',
      type: 'string',
      required: true,
      description: 'User ID',
      example: '64f7d1b2c8e5f1234567890a'
    }
    #swagger.parameters['mealType'] = {
      in: 'formData',
      type: 'string',
      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
      default: 'other',
      description: 'Type of meal for all detected items'
    }
    #swagger.parameters['consumedAt'] = {
      in: 'formData',
      type: 'string',
      format: 'date-time',
      description: 'When the meal was consumed (defaults to now)'
    }
    #swagger.parameters['mealName'] = {
      in: 'formData',
      type: 'string',
      default: 'AI Analyzed Meal',
      description: 'Name for the meal containing multiple items'
    }
    #swagger.responses[201] = { 
      description: 'Meal created with multiple items',
      schema: { $ref: '#/definitions/AIMealFromImageResponse' }
    }
    #swagger.responses[400] = { 
      description: 'Invalid request parameters',
      schema: { $ref: '#/definitions/FileUploadError' }
    }
    #swagger.responses[422] = { 
      description: 'Could not detect foods in image',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Could not detect foods in image' },
          details: { type: 'string' }
        }
      }
    }
    #swagger.responses[500] = { 
      description: 'Failed to create meal from image',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AIImageAnalysisService.getUploadMiddleware(),
  validateImageUpload,
  debugRequest,
  AIConsumptionController.createMealFromImage
);

router.post('/image-tips',
  /* 
    #swagger.tags = ['AI Image Analysis']
    #swagger.summary = 'Get image quality improvement tips'
    #swagger.description = 'Upload a food image and receive AI-powered suggestions for improving image quality and analysis accuracy'
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['foodImage'] = {
      in: 'formData',
      type: 'file',
      required: true,
      description: 'Food image to analyze for quality tips'
    }
    #swagger.responses[200] = { 
      description: 'Image tips and quality analysis',
      schema: { $ref: '#/definitions/ImageTipsResponse' }
    }
    #swagger.responses[400] = { 
      description: 'No image provided or invalid format',
      schema: { $ref: '#/definitions/FileUploadError' }
    }
    #swagger.responses[500] = { 
      description: 'Failed to analyze image for tips',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AIImageAnalysisService.getUploadMiddleware(),
  validateImageUpload,
  AIConsumptionController.getImageTips
);

// ========== AI SERVICE STATUS AND HEALTH ==========

router.get('/health',
  /* 
    #swagger.tags = ['AI Image Analysis']
    #swagger.summary = 'AI service health check'
    #swagger.description = 'Check the health and availability of the AI image analysis service'
    #swagger.responses[200] = { 
      description: 'AI service is operational',
      schema: { $ref: '#/definitions/AIHealthStatus' }
    }
    #swagger.responses[503] = { 
      description: 'AI service is unavailable',
      schema: { $ref: '#/definitions/AIConfigError' }
    }
  */
  (req, res) => {
    const hasGeminiKey = !!process.env.GOOGLE_API_KEY;
    
    res.status(hasGeminiKey ? 200 : 503).json({
      success: true,
      service: 'AI Image Analysis',
      status: hasGeminiKey ? 'operational' : 'service_unavailable',
      geminiConfigured: hasGeminiKey,
      supportedFormats: ['JPEG', 'PNG', 'WebP'],
      maxFileSize: '10MB',
      features: [
        'Single food analysis',
        'Multiple food detection',
        'Automatic entry creation',
        'Meal creation from images',
        'Image quality tips'
      ],
      ...(hasGeminiKey ? {} : {
        error: 'GOOGLE_API_KEY not configured',
        message: 'Set GOOGLE_API_KEY environment variable to enable AI features'
      })
    });
  }
);

router.get('/service-status',
  /* 
    #swagger.tags = ['AI Image Analysis']
    #swagger.summary = 'Get detailed service integration status'
    #swagger.description = 'Get comprehensive status of AI service integration with backend services including database connections and service method availability'
    #swagger.responses[200] = { 
      description: 'Service integration status',
      schema: { $ref: '#/definitions/AIServiceStatus' }
    }
    #swagger.responses[500] = { 
      description: 'Failed to get service status',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AIConsumptionController.getServiceStatus
);

router.get('/stats',
  /* 
    #swagger.tags = ['AI Image Analysis']
    #swagger.summary = 'Get AI service statistics'
    #swagger.description = 'Get operational statistics and performance metrics for the AI image analysis service'
    #swagger.responses[200] = { 
      description: 'AI service statistics',
      schema: { $ref: '#/definitions/AIStatsResponse' }
    }
    #swagger.responses[500] = { 
      description: 'Failed to get statistics',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  (req, res) => {
    res.status(200).json({
      success: true,
      stats: {
        serviceUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        aiModel: 'gemini-1.5-flash',
        analysisEndpoints: 5,
        lastUpdated: new Date(),
        endpoints: {
          analyze: '/analyze-image',
          createEntry: '/create-from-image',
          analyzeMultiple: '/analyze-multiple',
          createMeal: '/create-meal-from-image',
          imageTips: '/image-tips'
        }
      }
    });
  }
);

// ========== ERROR HANDLING ==========

// Handle unsupported routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'AI endpoint not found',
    message: `AI route ${req.method} ${req.originalUrl} not found`,
    suggestion: 'Check AI API documentation for available endpoints',
    availableEndpoints: {
      analysis: [
        'POST /analyze-image',
        'POST /analyze-multiple',
        'POST /image-tips'
      ],
      consumption: [
        'POST /create-from-image',
        'POST /create-meal-from-image'
      ],
      status: [
        'GET /health',
        'GET /service-status',
        'GET /stats'
      ]
    }
  });
});

module.exports = router;