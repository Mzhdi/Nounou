// src/controllers/aiConsumptionController.js
const AIImageAnalysisService = require('../services/aiImageAnalysisService');
const ConsumptionService = require('../services/consumptionService');
const FoodService = require('../services/foodService');
const fs = require('fs').promises;
const path = require('path');

class AIConsumptionController {
  /**
   * Analyze food image and return nutrition data
   * POST /api/consumption/ai/analyze-image
   */
  async analyzeImage(req, res) {
    let tempFilePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided',
          message: 'Please upload an image file'
        });
      }

      const { confidence_threshold = 5 } = req.body;
      tempFilePath = req.file.path;

      console.log('Analyzing image:', tempFilePath);

      // Analyze the image with AI
      const analysisResult = await AIImageAnalysisService.analyzeFoodImage(tempFilePath, {
        confidenceThreshold: parseInt(confidence_threshold)
      });

      // Clean up uploaded file
      await cleanupUploadedFile(tempFilePath);

      if (!analysisResult.success) {
        return res.status(422).json({
          success: false,
          error: 'Image analysis failed',
          details: analysisResult.error,
          suggestion: analysisResult.fallbackSuggestion
        });
      }

      // Check if confidence is above threshold
      if (analysisResult.confidence < parseInt(confidence_threshold)) {
        return res.status(200).json({
          success: true,
          data: analysisResult.data,
          warning: 'Low confidence analysis',
          confidence: analysisResult.confidence,
          suggestion: 'Consider taking a clearer image or manual entry'
        });
      }

      res.status(200).json({
        success: true,
        data: analysisResult.data,
        confidence: analysisResult.confidence,
        message: 'Image analyzed successfully'
      });

    } catch (error) {
      console.error('Image analysis error:', error);
      
      // Clean up file if it exists
      if (tempFilePath) {
        await cleanupUploadedFile(tempFilePath);
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error during image analysis',
        message: 'Please try again or use manual entry'
      });
    }
  }

  /**
   * Analyze image and create consumption entry automatically
   * POST /api/consumption/ai/create-from-image
   */
  async createEntryFromImage(req, res) {
    let tempFilePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required',
          message: 'Please provide userId in the request'
        });
      }

      const {
        mealType = 'other',
        consumedAt = new Date(),
        confidence_threshold = 5,
        create_food_if_new = true
      } = req.body;

      tempFilePath = req.file.path;

      // Step 1: Analyze the image
      console.log('Starting AI analysis for user:', userId);
      const analysisResult = await AIImageAnalysisService.analyzeFoodImage(tempFilePath, {
        confidenceThreshold: parseInt(confidence_threshold)
      });

      await cleanupUploadedFile(tempFilePath);

      if (!analysisResult.success) {
        return res.status(422).json({
          success: false,
          error: 'Image analysis failed',
          details: analysisResult.error
        });
      }

      const nutritionData = analysisResult.data;
      console.log('AI Analysis completed:', nutritionData.dishName);

      // Step 2: Try to find existing food using your actual service
      let foodId = null;
      let existingFood = null;

      try {
        // Use your actual searchFoods method (takes string, returns array)
        const searchResults = await FoodService.searchFoods(nutritionData.dishName, 3);
        
        if (searchResults && searchResults.length > 0) {
          // Find best match based on name similarity
          existingFood = findBestFoodMatch(searchResults, nutritionData);
          if (existingFood) {
            foodId = existingFood._id;
            console.log('Found existing food:', existingFood.name);
          }
        }
      } catch (searchError) {
        console.log('Food search failed, will create new:', searchError.message);
      }

      // Step 3: Create new food if not found and allowed
      if (!foodId && create_food_if_new === 'true') {
        try {
          const newFoodData = {
            food: {
              name: nutritionData.dishName || 'AI Analyzed Food',
              description: nutritionData.description || 'AI-analyzed food item',
              food_type: 'product',
              category_id: '686e9fa30054e2a44fa55d0c',
              serving_size_g: nutritionData.estimatedWeight || 150,
              
              brand: null,
              // ✅ GENERATE UNIQUE BARCODE for AI foods:
              barcode: `AI${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
              is_verified: false,
              is_public: false,
              is_deleted: false,
              created_by: userId,
              
              source: 'ai_image_analysis',
              preparation_method: 'unknown',
              storage_instructions: null,
              serving_unit: 'g',
              tags: ['ai-generated', 'image-analysis'],
              
              metadata: {
                ai_generated: true,
                confidence: nutritionData.confidence,
                analysis_method: 'gemini_image_analysis',
                cuisine_type: nutritionData.cuisineType,
                main_ingredients: nutritionData.mainIngredients,
                allergens_detected: nutritionData.allergens
              }
            },
            
            nutritional_values: {
              calories: Math.round((nutritionData.nutritionPerServing?.calories || 250) / (nutritionData.estimatedWeight || 150) * 100),
              protein: Math.round((nutritionData.nutritionPerServing?.protein || 15) / (nutritionData.estimatedWeight || 150) * 100 * 10) / 10,
              carbohydrates: Math.round((nutritionData.nutritionPerServing?.carbs || 20) / (nutritionData.estimatedWeight || 150) * 100 * 10) / 10,
              fat: Math.round((nutritionData.nutritionPerServing?.fat || 10) / (nutritionData.estimatedWeight || 150) * 100 * 10) / 10,
              fiber: Math.round((nutritionData.nutritionPerServing?.fiber || 3) / (nutritionData.estimatedWeight || 150) * 100 * 10) / 10,
              sugar: 5,
              sodium: Math.round((nutritionData.nutritionPerServing?.sodium || 300) / (nutritionData.estimatedWeight || 150) * 100),
              is_estimated: true,
              estimation_source: 'ai_image_analysis',
              confidence: nutritionData.confidence / 10,
              notes: `AI analysis with ${nutritionData.confidence}/10 confidence`
            },
            
            allergens: (nutritionData.allergens || []).slice(0, 3).map(allergen => ({
              allergen_name: allergen.toString().trim().toLowerCase().replace(/^allergens?:\s*/i, ''),
              severity: 'unknown',
              notes: 'Detected by AI'
            })),
            
            images: []
          };

          console.log('🤖 Creating food with FIXED data:', JSON.stringify(newFoodData, null, 2));
          
          const createdFood = await FoodService.createCompleteFood(newFoodData, userId);
          foodId = createdFood._id;
          existingFood = createdFood;
          console.log('✅ SUCCESS! Created food:', createdFood.name);

        } catch (createError) {
          console.error('❌ FOOD CREATION ERROR:', createError);
          return res.status(422).json({
            success: false,
            error: 'Could not create food entry from analysis',
            details: createError.message
          });
        }
      }  
      // Step 4: Create consumption entry using your actual service
      if (foodId) {
        try {
          const entryData = {
            itemType: 'food',
            itemId: foodId.toString(),
            quantity: nutritionData.estimatedWeight || 150,
            unit: 'g',
            mealType: mealType,
            consumedAt: new Date(consumedAt),
            entryMethod: 'image_analysis',
            notes: `AI-analyzed from image with ${nutritionData.confidence}/10 confidence`,
            tags: ['ai-generated'],
            
            // AI-specific metadata
            aiAnalysis: {
              originalAnalysis: nutritionData,
              confidence: analysisResult.confidence,
              analysisMethod: nutritionData.analysisMethod,
              analysisTimestamp: nutritionData.metadata?.analysisTimestamp,
              imageProcessed: true
            },
            
            context: {
              entrySource: 'ai_analysis',
              createdFoodFromImage: !existingFood || existingFood.source === 'ai_image_analysis'
            }
          };

          console.log('Creating consumption entry with data:', JSON.stringify(entryData, null, 2));
          
          // Use your actual createConsumptionEntry method
          const result = await ConsumptionService.createConsumptionEntry(userId, entryData);

          return res.status(201).json({
            success: true,
            data: {
              consumptionEntry: result.entry,
              food: existingFood,
              aiAnalysis: nutritionData,
              confidence: analysisResult.confidence,
              nutritionSummary: result.nutritionSummary
            },
            message: 'Consumption entry created from image analysis'
          });

        } catch (entryError) {
          console.error('Failed to create consumption entry:', entryError);
          
          return res.status(422).json({
            success: false,
            error: 'Could not create consumption entry',
            details: entryError.message,
            data: {
              food: existingFood,
              aiAnalysis: nutritionData
            },
            suggestion: 'Food was created successfully, but consumption entry failed. Please create entry manually.'
          });
        }
      } else {
        // Return analysis data for manual entry
        return res.status(200).json({
          success: true,
          requiresManualEntry: true,
          analysisData: nutritionData,
          confidence: analysisResult.confidence,
          message: 'Image analyzed successfully. Please create entry manually.'
        });
      }

    } catch (error) {
      console.error('Create entry from image error:', error);
      
      if (tempFilePath) {
        await cleanupUploadedFile(tempFilePath);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create consumption entry from image',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Analyze image with multiple food items
   * POST /api/consumption/ai/analyze-multiple
   */
  async analyzeMultipleFoods(req, res) {
    let tempFilePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      tempFilePath = req.file.path;

      const analysisResult = await AIImageAnalysisService.analyzeMultipleFoods(tempFilePath);
      
      await cleanupUploadedFile(tempFilePath);

      if (!analysisResult.success) {
        return res.status(422).json({
          success: false,
          error: 'Multiple foods analysis failed',
          details: analysisResult.error
        });
      }

      res.status(200).json({
        success: true,
        data: {
          itemCount: analysisResult.itemCount,
          detectedFoods: analysisResult.items,
          rawAnalysis: analysisResult.rawAnalysis
        },
        message: `Detected ${analysisResult.itemCount} food item(s) in image`
      });

    } catch (error) {
      console.error('Multiple foods analysis error:', error);
      
      if (tempFilePath) {
        await cleanupUploadedFile(tempFilePath);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to analyze multiple foods in image',
        message: error.message
      });
    }
  }

  /**
   * Create quick meal from image with multiple foods
   * POST /api/consumption/ai/create-meal-from-image
   */
  async createMealFromImage(req, res) {
    let tempFilePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User ID required'
        });
      }

      const {
        mealType = 'other',
        consumedAt = new Date(),
        mealName = 'AI Analyzed Meal'
      } = req.body;

      tempFilePath = req.file.path;

      // Analyze multiple foods in the image
      const analysisResult = await AIImageAnalysisService.analyzeMultipleFoods(tempFilePath);
      
      await cleanupUploadedFile(tempFilePath);

      if (!analysisResult.success || analysisResult.items.length === 0) {
        return res.status(422).json({
          success: false,
          error: 'Could not detect foods in image',
          details: analysisResult.error
        });
      }

      // Create foods and consumption entries for each detected item
      const createdEntries = [];
      const createdFoods = [];
      const errors = [];

      for (const [index, item] of analysisResult.items.entries()) {
        try {
          // Create food for each detected item
          const foodData = {
            food: {
              name: item.name,
              description: `AI-detected food from meal image: ${mealName}`,
              category_id: null,
              food_type: 'prepared_dish',
              is_verified: false,
              is_public: false,
              source: 'ai_meal_analysis',
              tags: ['ai-generated', 'meal-detected'],
              
              ai_metadata: {
                detected_in_meal: true,
                meal_name: mealName,
                detection_index: index,
                total_items_in_meal: analysisResult.items.length,
                original_portion_estimate: item.portionSize
              }
            },
            nutritional_values: {
              calories_per_100g: Math.round((item.calories / (parsePortionSize(item.portionSize) || 100)) * 100),
              protein_per_100g: Math.round((item.protein / (parsePortionSize(item.portionSize) || 100)) * 100),
              carbohydrates_per_100g: Math.round((item.carbs / (parsePortionSize(item.portionSize) || 100)) * 100),
              fat_per_100g: Math.round((item.fat / (parsePortionSize(item.portionSize) || 100)) * 100),
              fiber_per_100g: 2, // Default estimate
              sugar_per_100g: 5, // Default estimate
              sodium_per_100g: 100, // Default estimate
              is_estimated: true,
              estimation_source: 'ai_meal_analysis',
              confidence: 0.7
            },
            allergens: [],
            images: []
          };

          const createdFood = await FoodService.createCompleteFood(foodData, userId);
          createdFoods.push(createdFood);

          // Create consumption entry using the quick meal approach
          const entryData = {
            itemType: 'food',
            itemId: createdFood._id.toString(),
            quantity: parsePortionSize(item.portionSize) || 100,
            unit: 'g',
            mealType: mealType,
            consumedAt: new Date(consumedAt),
            entryMethod: 'image_analysis',
            notes: `Part of ${mealName} - detected by AI`,
            tags: ['ai-generated', 'meal-item'],
            
            context: {
              meal: {
                isPartOfLargerMeal: true,
                mealName: mealName,
                itemIndex: index,
                totalItems: analysisResult.items.length
              },
              detectedItem: item,
              entrySource: 'multi_food_ai_analysis'
            }
          };

          const result = await ConsumptionService.createConsumptionEntry(userId, entryData);
          createdEntries.push(result.entry);

        } catch (itemError) {
          console.error(`Failed to create entry for item ${index}:`, itemError);
          errors.push({
            index,
            item: item.name,
            error: itemError.message
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          mealName: mealName,
          totalItems: analysisResult.items.length,
          successfulEntries: createdEntries.length,
          failedEntries: errors.length,
          consumptionEntries: createdEntries,
          createdFoods: createdFoods,
          detectedFoods: analysisResult.items,
          errors: errors
        },
        message: `Created meal with ${createdEntries.length} items from image analysis`
      });

    } catch (error) {
      console.error('Create meal from image error:', error);
      
      if (tempFilePath) {
        await cleanupUploadedFile(tempFilePath);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create meal from image',
        message: error.message
      });
    }
  }

  /**
   * Get AI analysis suggestions for improving image quality
   * POST /api/consumption/ai/image-tips
   */
  async getImageTips(req, res) {
    let tempFilePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      tempFilePath = req.file.path;

      // Quick analysis to provide tips
      const analysisResult = await AIImageAnalysisService.analyzeFoodImage(tempFilePath);
      
      await cleanupUploadedFile(tempFilePath);

      const tips = generateImageTips(analysisResult);

      res.status(200).json({
        success: true,
        confidence: analysisResult.confidence || 0,
        tips: tips,
        canAnalyze: analysisResult.success,
        suggestion: getAnalysisSuggestion(analysisResult.confidence || 0)
      });

    } catch (error) {
      console.error('Image tips error:', error);
      
      if (tempFilePath) {
        await cleanupUploadedFile(tempFilePath);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to analyze image for tips',
        message: error.message
      });
    }
  }

  /**
   * Get service availability status
   * GET /api/consumption/ai/service-status
   */
  async getServiceStatus(req, res) {
    const status = {
      aiImageAnalysis: !!AIImageAnalysisService,
      consumptionService: !!ConsumptionService,
      foodService: !!FoodService,
      geminiConfigured: !!process.env.GOOGLE_API_KEY,
      services: {}
    };

    // Check ConsumptionService methods
    status.services.consumption = {
      available: true,
      methods: {
        createConsumptionEntry: typeof ConsumptionService.createConsumptionEntry === 'function',
        getUserConsumptions: typeof ConsumptionService.getUserConsumptions === 'function',
        addQuickMeal: typeof ConsumptionService.addQuickMeal === 'function'
      }
    };

    // Check FoodService methods
    status.services.food = {
      available: true,
      methods: {
        createCompleteFood: typeof FoodService.createCompleteFood === 'function',
        searchFoods: typeof FoodService.searchFoods === 'function',
        getFoodById: typeof FoodService.getFoodById === 'function'
      }
    };

    res.json({
      success: true,
      status,
      message: 'Service status retrieved',
      integration: 'Production-ready with actual service methods'
    });
  }
}

// Helper Functions (outside the class)

/**
 * Clean up uploaded file
 * @param {string} filePath - Path to file to delete
 */
async function cleanupUploadedFile(filePath) {
  try {
    if (filePath) {
      await fs.unlink(filePath);
      console.log('Cleaned up temp file:', path.basename(filePath));
    }
  } catch (error) {
    console.warn(`Failed to delete uploaded file ${filePath}:`, error.message);
  }
}

/**
 * Convert AI nutrition data to your database format
 * @param {Object} nutritionData - AI analysis nutrition data
 * @returns {Object} Nutrition in your database format
 */
function convertToNutritionalValues(nutritionData) {
  const servingWeight = nutritionData.estimatedWeight || 150;
  const nutrition = nutritionData.nutritionPerServing || {};
  
  // Convert to per 100g values for your database
  const conversionFactor = 100 / servingWeight;

  return {
    calories_per_100g: Math.round((nutrition.calories || 0) * conversionFactor),
    protein_per_100g: Math.round((nutrition.protein || 0) * conversionFactor * 10) / 10,
    carbohydrates_per_100g: Math.round((nutrition.carbs || 0) * conversionFactor * 10) / 10,
    fat_per_100g: Math.round((nutrition.fat || 0) * conversionFactor * 10) / 10,
    fiber_per_100g: Math.round((nutrition.fiber || 0) * conversionFactor * 10) / 10,
    sugar_per_100g: Math.round((nutrition.sugar || 0) * conversionFactor * 10) / 10,
    sodium_per_100g: Math.round((nutrition.sodium || 0) * conversionFactor),
    
    // Additional metadata
    is_estimated: true,
    estimation_source: 'ai_image_analysis',
    confidence: nutritionData.confidence / 10, // Convert to 0-1 scale
    estimation_notes: `AI analysis with ${nutritionData.confidence}/10 confidence`,
    estimated_serving_size: servingWeight
  };
}

/**
 * Create allergen objects for your database
 * @param {Array} allergens - Array of allergen strings from AI
 * @returns {Array} Allergen objects for your database
 */
function createAllergenObjects(allergens) {
  if (!allergens || !Array.isArray(allergens)) {
    return [];
  }

  return allergens.map(allergen => ({
    allergen_name: allergen.trim().toLowerCase(),
    severity: 'unknown',
    notes: 'Detected by AI image analysis',
    confidence: 0.7
  }));
}

/**
 * Find best matching food from search results
 * @param {Array} searchResults - Array of food search results
 * @param {Object} aiAnalysisData - AI analysis data for comparison
 * @returns {Object|null} Best matching food or null
 */
function findBestFoodMatch(searchResults, aiAnalysisData) {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const food of searchResults) {
    const score = calculateFoodMatchScore(food, aiAnalysisData);
    if (score > bestScore && score > 0.7) { // 70% minimum match
      bestScore = score;
      bestMatch = food;
    }
  }

  return bestMatch;
}

/**
 * Calculate how well a food matches AI analysis data
 * @param {Object} food - Food item from database
 * @param {Object} aiData - AI analysis data
 * @returns {number} Match score (0-1)
 */
function calculateFoodMatchScore(food, aiData) {
  let score = 0;
  
  // Name similarity (80% weight for simple matching)
  const nameSimilarity = calculateNameSimilarity(food.name, aiData.dishName);
  score += nameSimilarity * 0.8;

  // Category/type bonus (20% weight)
  if (food.food_type && food.food_type.includes('prepared')) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

/**
 * Calculate name similarity using simple string comparison
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {number} Similarity score (0-1)
 */
function calculateNameSimilarity(name1, name2) {
  const str1 = name1.toLowerCase().trim();
  const str2 = name2.toLowerCase().trim();
  
  if (str1 === str2) return 1;
  
  // Simple word overlap calculation
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  let commonWords = 0;
  for (const word1 of words1) {
    if (words2.includes(word1) && word1.length > 2) {
      commonWords++;
    }
  }
  
  const totalWords = Math.max(words1.length, words2.length);
  return totalWords > 0 ? commonWords / totalWords : 0;
}

/**
 * Parse portion size text to weight in grams
 * @param {string} portionText - Portion size text
 * @returns {number} Weight in grams
 */
function parsePortionSize(portionText) {
  if (!portionText) return 150; // default serving
  
  const text = portionText.toLowerCase();
  
  // Extract numbers from text
  const numbers = text.match(/\d+/g);
  if (numbers) {
    const num = parseInt(numbers[0]);
    
    // Common portion conversions
    if (text.includes('cup')) return num * 240;
    if (text.includes('tbsp') || text.includes('tablespoon')) return num * 15;
    if (text.includes('tsp') || text.includes('teaspoon')) return num * 5;
    if (text.includes('slice')) return num * 30;
    if (text.includes('piece')) return num * 50;
    if (text.includes('g') || text.includes('gram')) return num;
    
    // Default assumption for numbers without units
    if (num < 10) return num * 100; // assume servings
    return num; // assume grams
  }
  
  return 150; // fallback default
}

/**
 * Generate image improvement tips based on analysis
 * @param {Object} analysisResult - AI analysis result
 * @returns {Array} Array of tips
 */
function generateImageTips(analysisResult) {
  const tips = [];
  const confidence = analysisResult.confidence || 0;

  if (confidence < 4) {
    tips.push("Try taking the photo in better lighting");
    tips.push("Make sure the food is clearly visible and in focus");
    tips.push("Remove any obstructions or overlapping items");
  } else if (confidence < 7) {
    tips.push("Good image! For better accuracy, try a closer shot");
    tips.push("Ensure the entire dish is visible in the frame");
  } else {
    tips.push("Excellent image quality for AI analysis!");
    tips.push("The lighting and focus are optimal");
  }

  tips.push("Place food on a plain background when possible");
  tips.push("Take photos from directly above for best results");

  return tips;
}

/**
 * Get analysis suggestion based on confidence
 * @param {number} confidence - Confidence level (1-10)
 * @returns {string} Suggestion message
 */
function getAnalysisSuggestion(confidence) {
  if (confidence >= 8) {
    return "High confidence analysis - ready to create entry";
  } else if (confidence >= 6) {
    return "Good analysis - you may proceed or take a clearer image";
  } else if (confidence >= 4) {
    return "Moderate confidence - consider manual verification";
  } else {
    return "Low confidence - recommend manual entry or better image";
  }
}

module.exports = new AIConsumptionController();