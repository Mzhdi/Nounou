// src/services/aiEnhancedConsumptionService.js
// Extension to the existing ConsumptionService for AI functionality

const ConsumptionService = require('./consumptionService');
const AIImageAnalysisService = require('./aiImageAnalysisService');
const FoodService = require('./foodService');
const RecipeService = require('./recipeService');

class AIEnhancedConsumptionService extends ConsumptionService {
  
  /**
   * Create consumption entry from AI image analysis
   * @param {Object} imageAnalysisData - Data from AI image analysis
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Object} Created consumption entry
   */
  async createEntryFromAIAnalysis(imageAnalysisData, userId, options = {}) {
    try {
      const {
        mealType = 'other',
        consumedAt = new Date(),
        createFoodIfNeeded = true,
        confidence_threshold = 5
      } = options;

      // Validate confidence level
      if (imageAnalysisData.confidence < confidence_threshold) {
        throw new Error(`Analysis confidence too low: ${imageAnalysisData.confidence}`);
      }

      // Step 1: Try to find or create food item
      let foodItem = null;
      
      // Search for existing similar food
      try {
        const searchResults = await FoodService.searchFoods({
          name: imageAnalysisData.dishName,
          category: imageAnalysisData.category,
          limit: 3
        });

        // Find best match based on name similarity and nutrition
        foodItem = this.findBestFoodMatch(searchResults, imageAnalysisData);
        
      } catch (searchError) {
        console.log('Food search failed:', searchError.message);
      }

      // Create new food if no match and allowed
      if (!foodItem && createFoodIfNeeded) {
        foodItem = await this.createFoodFromAIAnalysis(imageAnalysisData);
      }

      if (!foodItem) {
        throw new Error('Could not find or create food item from AI analysis');
      }

      // Step 2: Create consumption entry
      const entryData = {
        userId: userId,
        consumedItem: {
          itemType: 'food',
          itemId: foodItem._id,
          refPath: 'Food'
        },
        quantity: imageAnalysisData.estimatedWeight || 150,
        unit: 'g',
        mealType: mealType,
        consumedAt: new Date(consumedAt),
        entryMethod: 'ai_image_analysis',
        
        // Enhanced metadata for AI entries
        metadata: {
          aiAnalysis: {
            originalAnalysis: imageAnalysisData,
            confidence: imageAnalysisData.confidence,
            analysisMethod: imageAnalysisData.analysisMethod,
            modelUsed: imageAnalysisData.metadata?.modelUsed,
            analysisTimestamp: imageAnalysisData.metadata?.analysisTimestamp
          },
          imageProcessed: true,
          entrySource: 'ai_analysis',
          qualityScore: this.calculateEntryQualityScore(imageAnalysisData)
        }
      };

      // Create the entry using the parent service
      const consumptionEntry = await this.createEntry(entryData);

      // Log AI usage for analytics
      await this.logAIUsage(userId, 'image_analysis', {
        confidence: imageAnalysisData.confidence,
        dishName: imageAnalysisData.dishName,
        success: true
      });

      return {
        consumptionEntry,
        foodItem,
        aiAnalysis: imageAnalysisData,
        confidence: imageAnalysisData.confidence,
        isNewFood: foodItem.isAIGenerated || false
      };

    } catch (error) {
      // Log failed AI usage
      await this.logAIUsage(userId, 'image_analysis', {
        error: error.message,
        success: false
      });
      
      throw error;
    }
  }

  /**
   * Create multiple consumption entries from multi-food image analysis
   * @param {Array} detectedFoods - Array of detected foods from AI
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Object} Results of meal creation
   */
  async createMealFromAIAnalysis(detectedFoods, userId, options = {}) {
    try {
      const {
        mealType = 'other',
        consumedAt = new Date(),
        mealName = 'AI Analyzed Meal'
      } = options;

      const results = {
        mealName,
        totalDetected: detectedFoods.length,
        successfulEntries: [],
        failedEntries: [],
        createdFoods: [],
        totalNutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      };

      // Process each detected food item
      for (const [index, detectedFood] of detectedFoods.entries()) {
        try {
          // Create simplified nutrition data for each item
          const itemAnalysisData = {
            dishName: detectedFood.name,
            category: 'other',
            description: `Detected in meal: ${mealName}`,
            estimatedWeight: this.parsePortionSize(detectedFood.portionSize),
            nutritionPerServing: {
              calories: detectedFood.calories || 0,
              protein: detectedFood.protein || 0,
              carbs: detectedFood.carbs || 0,
              fat: detectedFood.fat || 0
            },
            confidence: 7, // Assume moderate confidence for multi-item detection
            analysisMethod: 'multi_food_detection'
          };

          // Create food item
          const foodItem = await this.createFoodFromAIAnalysis(itemAnalysisData, {
            mealContext: mealName,
            detectionIndex: index
          });

          results.createdFoods.push(foodItem);

          // Create consumption entry
          const entryData = {
            userId: userId,
            consumedItem: {
              itemType: 'food',
              itemId: foodItem._id,
              refPath: 'Food'
            },
            quantity: itemAnalysisData.estimatedWeight,
            unit: 'g',
            mealType: mealType,
            consumedAt: new Date(consumedAt),
            entryMethod: 'ai_meal_analysis',
            metadata: {
              mealContext: {
                mealName: mealName,
                itemIndex: index,
                totalItems: detectedFoods.length,
                originalDetection: detectedFood
              },
              aiAnalysis: itemAnalysisData,
              entrySource: 'multi_food_ai_analysis'
            }
          };

          const consumptionEntry = await this.createEntry(entryData);
          results.successfulEntries.push(consumptionEntry);

          // Add to total nutrition
          results.totalNutrition.calories += detectedFood.calories || 0;
          results.totalNutrition.protein += detectedFood.protein || 0;
          results.totalNutrition.carbs += detectedFood.carbs || 0;
          results.totalNutrition.fat += detectedFood.fat || 0;

        } catch (itemError) {
          console.error(`Failed to process detected food ${index}:`, itemError);
          results.failedEntries.push({
            index,
            food: detectedFood,
            error: itemError.message
          });
        }
      }

      // Log meal creation
      await this.logAIUsage(userId, 'meal_analysis', {
        totalItems: detectedFoods.length,
        successfulItems: results.successfulEntries.length,
        mealName: mealName,
        success: results.successfulEntries.length > 0
      });

      return results;

    } catch (error) {
      await this.logAIUsage(userId, 'meal_analysis', {
        error: error.message,
        success: false
      });
      
      throw error;
    }
  }

  /**
   * Create food item from AI analysis data
   * @param {Object} aiAnalysisData - AI analysis data
   * @param {Object} options - Additional options
   * @returns {Object} Created food item
   */
  async createFoodFromAIAnalysis(aiAnalysisData, options = {}) {
    try {
      const nutritionPer100g = this.convertToNutritionPer100g(
        aiAnalysisData.nutritionPerServing,
        aiAnalysisData.estimatedWeight || 150
      );

      const foodData = {
        name: aiAnalysisData.dishName,
        description: aiAnalysisData.description || 'AI-analyzed food item',
        category: this.validateCategory(aiAnalysisData.category),
        cuisineType: aiAnalysisData.cuisineType || 'unknown',
        nutritionPer100g: nutritionPer100g,
        
        // AI-specific fields
        isAIGenerated: true,
        aiAnalysisData: {
          originalEstimate: aiAnalysisData.nutritionPerServing,
          estimatedWeight: aiAnalysisData.estimatedWeight,
          confidence: aiAnalysisData.confidence,
          analysisMethod: aiAnalysisData.analysisMethod,
          createdAt: new Date(),
          mealContext: options.mealContext,
          detectionIndex: options.detectionIndex
        },

        // Additional data if available
        ingredients: aiAnalysisData.mainIngredients || [],
        allergens: aiAnalysisData.allergens || [],
        
        // Metadata
        tags: ['ai-generated', 'image-analysis'],
        source: 'ai_image_analysis',
        verified: false // AI-generated foods need verification
      };

      const createdFood = await FoodService.createFood(foodData);
      return createdFood;

    } catch (error) {
      console.error('Failed to create food from AI analysis:', error);
      throw new Error(`Could not create food item: ${error.message}`);
    }
  }

  /**
   * Find best matching food from search results
   * @param {Array} searchResults - Array of food search results
   * @param {Object} aiAnalysisData - AI analysis data for comparison
   * @returns {Object|null} Best matching food or null
   */
  findBestFoodMatch(searchResults, aiAnalysisData) {
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const food of searchResults) {
      const score = this.calculateFoodMatchScore(food, aiAnalysisData);
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
  calculateFoodMatchScore(food, aiData) {
    let score = 0;
    
    // Name similarity (40% weight)
    const nameSimilarity = this.calculateNameSimilarity(food.name, aiData.dishName);
    score += nameSimilarity * 0.4;

    // Category match (20% weight)
    if (food.category === aiData.category) {
      score += 0.2;
    }

    // Nutrition similarity (40% weight)
    const nutritionSimilarity = this.calculateNutritionSimilarity(
      food.nutritionPer100g, 
      this.convertToNutritionPer100g(
        aiData.nutritionPerServing, 
        aiData.estimatedWeight || 150
      )
    );
    score += nutritionSimilarity * 0.4;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate nutrition similarity between two nutrition objects
   * @param {Object} nutrition1 - First nutrition data
   * @param {Object} nutrition2 - Second nutrition data
   * @returns {number} Similarity score (0-1)
   */
  calculateNutritionSimilarity(nutrition1, nutrition2) {
    const keys = ['calories', 'protein', 'carbs', 'fat'];
    let totalDifference = 0;
    let comparisons = 0;

    for (const key of keys) {
      if (nutrition1[key] !== undefined && nutrition2[key] !== undefined) {
        const val1 = nutrition1[key] || 0;
        const val2 = nutrition2[key] || 0;
        const maxVal = Math.max(val1, val2);
        
        if (maxVal > 0) {
          const difference = Math.abs(val1 - val2) / maxVal;
          totalDifference += difference;
          comparisons++;
        }
      }
    }

    if (comparisons === 0) return 0;
    
    const avgDifference = totalDifference / comparisons;
    return Math.max(0, 1 - avgDifference);
  }

  /**
   * Calculate name similarity using simple string comparison
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @returns {number} Similarity score (0-1)
   */
  calculateNameSimilarity(name1, name2) {
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
   * Convert portion-based nutrition to per-100g nutrition
   * @param {Object} nutritionPerServing - Nutrition per serving
   * @param {number} servingWeight - Weight of serving in grams
   * @returns {Object} Nutrition per 100g
   */
  convertToNutritionPer100g(nutritionPerServing, servingWeight) {
    const conversionFactor = 100 / (servingWeight || 150);
    
    return {
      calories: Math.round((nutritionPerServing.calories || 0) * conversionFactor),
      protein: Math.round((nutritionPerServing.protein || 0) * conversionFactor * 10) / 10,
      carbs: Math.round((nutritionPerServing.carbs || 0) * conversionFactor * 10) / 10,
      fat: Math.round((nutritionPerServing.fat || 0) * conversionFactor * 10) / 10,
      fiber: Math.round((nutritionPerServing.fiber || 0) * conversionFactor * 10) / 10,
      sodium: Math.round((nutritionPerServing.sodium || 0) * conversionFactor)
    };
  }

  /**
   * Parse portion size text to weight in grams
   * @param {string} portionText - Portion size text
   * @returns {number} Weight in grams
   */
  parsePortionSize(portionText) {
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
   * Calculate entry quality score based on AI analysis
   * @param {Object} aiAnalysisData - AI analysis data
   * @returns {number} Quality score (0-10)
   */
  calculateEntryQualityScore(aiAnalysisData) {
    let score = aiAnalysisData.confidence || 5;
    
    // Bonus for detailed analysis
    if (aiAnalysisData.mainIngredients?.length > 0) score += 0.5;
    if (aiAnalysisData.allergens?.length > 0) score += 0.5;
    if (aiAnalysisData.description?.length > 10) score += 0.5;
    if (aiAnalysisData.cuisineType && aiAnalysisData.cuisineType !== 'unknown') score += 0.5;
    
    return Math.min(Math.round(score * 10) / 10, 10);
  }

  /**
   * Validate and normalize food category
   * @param {string} category - Raw category
   * @returns {string} Validated category
   */
  validateCategory(category) {
    const validCategories = [
      'appetizer', 'main course', 'dessert', 'snack', 
      'beverage', 'breakfast', 'lunch', 'dinner', 'other'
    ];
    
    const normalized = (category || '').toLowerCase().trim();
    return validCategories.includes(normalized) ? normalized : 'other';
  }

  /**
   * Log AI usage for analytics and monitoring
   * @param {string} userId - User ID
   * @param {string} analysisType - Type of AI analysis
   * @param {Object} data - Analysis data
   */
  async logAIUsage(userId, analysisType, data) {
    try {
      // This could be implemented to log to a separate analytics service
      // or stored in the database for monitoring AI usage patterns
      
      const logEntry = {
        userId,
        analysisType,
        timestamp: new Date(),
        success: data.success,
        confidence: data.confidence,
        error: data.error,
        metadata: data
      };

      // For now, just console log - implement proper logging as needed
      console.log('AI Usage Log:', logEntry);
      
      // Could also update user statistics here
      // await UserService.updateAIUsageStats(userId, analysisType, data.success);

    } catch (error) {
      console.error('Failed to log AI usage:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }
}

module.exports = new AIEnhancedConsumptionService();