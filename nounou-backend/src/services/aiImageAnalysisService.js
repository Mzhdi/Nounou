// src/services/aiImageAnalysisService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp'); // For image optimization

class AIImageAnalysisService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Configure multer for image uploads
    this.upload = multer({
      dest: 'uploads/temp/',
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    });
  }

  /**
   * Analyze food image using Gemini API
   * @param {string} imagePath - Path to the image file
   * @param {Object} options - Analysis options
   * @returns {Object} Nutrition and food information
   */
  async analyzeFoodImage(imagePath, options = {}) {
    try {
      // Optimize image for better AI analysis
      const optimizedImagePath = await this.optimizeImage(imagePath);
      
      // Convert image to base64 for Gemini
      const imageBuffer = await fs.readFile(optimizedImagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Enhanced nutrition prompt based on your working Python version
      // Replace this section in src/services/aiImageAnalysisService.js
      const nutritionPrompt = `
      Analyze this food image and provide specific information. Be as accurate as possible:

      DISH IDENTIFICATION:
      1. Dish name: [exact name of the food item]
      2. Category: appetizer, main course, dessert, snack, beverage, or other
      3. Cuisine type: [Italian, American, Chinese, etc.]
      4. Description: [brief 15-word description]

      PORTION ESTIMATION:
      5. Serving size: [estimate in grams or standard portions]

      NUTRITION ESTIMATION (provide your best estimates, don't say "unknown"):
      6. Calories: [estimate based on visible ingredients and portion]
      7. Protein (grams): [estimate from visible protein sources]
      8. Carbohydrates (grams): [estimate from bread, rice, pasta, etc.]
      9. Fat (grams): [estimate from oils, cheese, meat, etc.]
      10. Fiber (grams): [estimate from vegetables, grains]
      11. Sodium (mg): [estimate based on processed foods, dressings]

      ADDITIONAL INFO:
      12. Main ingredients: [list 3-5 visible ingredients]
      13. Allergens: [dairy, gluten, nuts, etc.]
      14. Confidence (1-10): [how confident are you in these estimates?]
      15. Health notes: [brief health assessment]

      IMPORTANT: 
      - Provide specific numbers for nutrition, not "unknown"
      - Base estimates on similar foods if exact values unclear
      - Give confidence rating 1-10 based on image clarity
      - Keep responses concise and structured
      `;

      // Generate content with image
      const result = await this.model.generateContent([
        nutritionPrompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      const analysisText = response.text();

      // Parse the response into structured data
      const nutritionData = this.parseGeminiResponse(analysisText);
      
      // Add metadata
      nutritionData.metadata = {
        analysisTimestamp: new Date(),
        modelUsed: 'gemini-1.5-flash',
        imageProcessed: true,
        originalImagePath: imagePath,
        optimizedImagePath: optimizedImagePath,
        analysisOptions: options,
        rawResponse: analysisText
      };

      // Clean up temporary files
      await this.cleanupTempFiles([optimizedImagePath]);

      return {
        success: true,
        data: nutritionData,
        confidence: nutritionData.confidence || 7
      };

    } catch (error) {
      console.error('AI Image Analysis Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackSuggestion: 'Please try manual entry or a clearer image'
      };
    }
  }

/**
 * Parse Gemini response into structured nutrition data
 * @param {string} responseText - Raw response from Gemini
 * @returns {Object} Structured nutrition data
 */
parseGeminiResponse(responseText) {
  console.log('Raw Gemini Response:', responseText);
  
  try {
    // FIXED: Extract from numbered format "1. Dish name: ..."
    const dishNameMatch = responseText.match(/1\.\s*Dish name:\s*(.+?)(?=\n|$)/i);
    const dishName = dishNameMatch ? dishNameMatch[1].trim() : 'Unknown Dish';
    
    const categoryMatch = responseText.match(/2\.\s*Category:\s*(.+?)(?=\n|$)/i);
    const category = categoryMatch ? categoryMatch[1].trim().toLowerCase() : 'other';
    
    const cuisineMatch = responseText.match(/3\.\s*Cuisine type:\s*(.+?)(?=\n|$)/i);
    const cuisineType = cuisineMatch ? cuisineMatch[1].trim() : 'unknown';
    
    const descriptionMatch = responseText.match(/4\.\s*Description:\s*(.+?)(?=\n|$)/i);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';
    
    const servingSizeMatch = responseText.match(/5\.\s*Serving size:\s*(.+?)(?=\n|$)/i);
    const servingSize = servingSizeMatch ? servingSizeMatch[1].trim() : 'standard serving';
    
    // Extract nutrition - looking for "6. Calories: 450"
    const caloriesMatch = responseText.match(/6\.\s*Calories:\s*(\d+)/i);
    const calories = caloriesMatch ? parseInt(caloriesMatch[1]) : 250;
    
    const proteinMatch = responseText.match(/7\.\s*Protein.*?:\s*(\d+)/i);
    const protein = proteinMatch ? parseInt(proteinMatch[1]) : 15;
    
    const carbsMatch = responseText.match(/8\.\s*Carbohydrates.*?:\s*(\d+)/i);
    const carbs = carbsMatch ? parseInt(carbsMatch[1]) : 20;
    
    const fatMatch = responseText.match(/9\.\s*Fat.*?:\s*(\d+)/i);
    const fat = fatMatch ? parseInt(fatMatch[1]) : 10;
    
    const fiberMatch = responseText.match(/10\.\s*Fiber.*?:\s*(\d+)/i);
    const fiber = fiberMatch ? parseInt(fiberMatch[1]) : 3;
    
    const sodiumMatch = responseText.match(/11\.\s*Sodium.*?:\s*(\d+)/i);
    const sodium = sodiumMatch ? parseInt(sodiumMatch[1]) : 300;
    
    // Extract serving weight
    const servingWeightMatch = servingSize.match(/(\d+)/);
    const estimatedWeight = servingWeightMatch ? parseInt(servingWeightMatch[1]) : 150;
    
    // Extract confidence "14. Confidence (1-10): 7"
    const confidenceMatch = responseText.match(/14\.\s*Confidence.*?:\s*(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 7;
    
    // Extract ingredients "12. Main ingredients: ..."
    const ingredientsMatch = responseText.match(/12\.\s*Main ingredients:\s*(.+?)(?=\n\d+\.|$)/i);
    const mainIngredients = ingredientsMatch ? 
      ingredientsMatch[1].split(/[,]/).map(i => i.trim()).filter(i => i.length > 0) : [];
    
    // Extract allergens "13. Allergens: ..."
    const allergensMatch = responseText.match(/13\.\s*Allergens:\s*(.+?)(?=\n\d+\.|$)/i);
    const allergens = allergensMatch ? 
      allergensMatch[1].split(/[,]/).map(a => a.trim()).filter(a => a.length > 0) : [];

    const result = {
      dishName: dishName,
      category: this.validateCategory(category),
      cuisineType: cuisineType,
      description: description,
      servingSize: servingSize,
      estimatedWeight: estimatedWeight,
      nutritionPerServing: {
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        fiber: fiber,
        sodium: sodium
      },
      mainIngredients: mainIngredients,
      allergens: allergens,
      confidence: confidence,
      healthNotes: '',
      analysisMethod: 'ai_image_analysis',
      calculationSource: 'gemini_ai_estimation'
    };

    result.nutritionPerServing = this.validateNutrition(result.nutritionPerServing);
    
    console.log('FIXED Parsed Result:', JSON.stringify(result, null, 2));
    return result;

  } catch (parseError) {
    console.error('Error parsing Gemini response:', parseError);
    return this.getFallbackNutritionData(responseText);
  }
}

/**
 * Get fallback nutrition data when parsing fails or confidence is too low
 * @param {string} responseText - Original response text
 * @returns {Object} Basic fallback data with reasonable estimates
 */
getFallbackNutritionData(responseText) {
  // Try to extract at least the dish name
  const dishName = responseText.includes('Caesar') ? 'Caesar Salad' :
                   responseText.includes('pizza') ? 'Pizza' :
                   responseText.includes('burger') ? 'Burger' :
                   responseText.includes('salad') ? 'Salad' :
                   'Unknown Food Item';

  return {
    dishName: dishName,
    category: 'other',
    cuisineType: 'unknown',
    description: 'AI analysis incomplete - using estimated values',
    servingSize: 'standard serving',
    estimatedWeight: 250,
    nutritionPerServing: {
      calories: 300,  // Reasonable default
      protein: 15,
      carbs: 25,
      fat: 15,
      fiber: 3,
      sodium: 500
    },
    mainIngredients: [],
    allergens: [],
    confidence: 4, // Low but not too low
    healthNotes: 'Nutritional estimates based on similar foods',
    analysisMethod: 'ai_image_analysis_fallback',
    rawAnalysisText: responseText
  };
}

/**
 * Optimize image for better AI analysis
 * @param {string} imagePath - Original image path
 * @returns {string} Optimized image path
 */
async optimizeImage(imagePath) {
  try {
    // Fix Windows path handling
    const ext = path.extname(imagePath);
    const basename = path.basename(imagePath, ext);
    const dirname = path.dirname(imagePath);
    
    const outputPath = path.join(dirname, `${basename}_optimized.jpg`);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    await sharp(imagePath)
      .resize(1024, 1024, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error('Image optimization failed:', error);
    return imagePath; // Return original if optimization fails
  }
}

  /**
   * Validate and normalize category
   * @param {string} category - Raw category from AI
   * @returns {string} Validated category
   */
  validateCategory(category) {
    const validCategories = [
      'appetizer', 'main course', 'dessert', 'snack', 
      'beverage', 'breakfast', 'lunch', 'dinner', 'other'
    ];
    
    const normalized = category.toLowerCase().trim();
    return validCategories.includes(normalized) ? normalized : 'other';
  }

  /**
   * Validate nutrition values
   * @param {Object} nutrition - Raw nutrition data
   * @returns {Object} Validated nutrition data
   */
  validateNutrition(nutrition) {
    const validated = {};
    
    // Ensure all values are numbers and within reasonable ranges
    validated.calories = Math.max(0, Math.min(nutrition.calories || 0, 5000));
    validated.protein = Math.max(0, Math.min(nutrition.protein || 0, 200));
    validated.carbs = Math.max(0, Math.min(nutrition.carbs || 0, 500));
    validated.fat = Math.max(0, Math.min(nutrition.fat || 0, 200));
    validated.fiber = Math.max(0, Math.min(nutrition.fiber || 0, 50));
    validated.sodium = Math.max(0, Math.min(nutrition.sodium || 0, 10000));

    return validated;
  }

  /**
   * Get fallback nutrition data when parsing fails
   * @param {string} responseText - Original response text
   * @returns {Object} Basic fallback data
   */
  getFallbackNutritionData(responseText) {
    return {
      dishName: 'AI Analysis Incomplete',
      category: 'other',
      cuisineType: 'unknown',
      description: 'Image analyzed but data parsing incomplete',
      nutritionPerServing: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sodium: 0
      },
      confidence: 3,
      analysisMethod: 'ai_image_analysis_fallback',
      rawAnalysisText: responseText
    };
  }

  /**
   * Clean up temporary files
   * @param {Array} filePaths - Array of file paths to delete
   */
  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`Failed to delete temp file ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Analyze multiple food items in one image
   * @param {string} imagePath - Path to image with multiple foods
   * @returns {Array} Array of nutrition data for each detected food
   */
  async analyzeMultipleFoods(imagePath) {
    try {
      const optimizedImagePath = await this.optimizeImage(imagePath);
      const imageBuffer = await fs.readFile(optimizedImagePath);
      const base64Image = imageBuffer.toString('base64');

      const multiItemPrompt = `
        Look at this image and identify ALL separate food items visible. 
        For each distinct food item, provide:
        1. Food name
        2. Estimated portion size
        3. Calories for that portion
        4. Protein, carbs, and fat in grams
        
        Format: Item 1: [name] | [portion] | [calories]cal | [protein]g protein | [carbs]g carbs | [fat]g fat
        
        If there's only one food item, just analyze that one.
        If you see multiple items, list each one separately.
      `;

      const result = await this.model.generateContent([
        multiItemPrompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      const analysisText = response.text();

      // Parse multiple items
      const items = this.parseMultipleItems(analysisText);
      
      await this.cleanupTempFiles([optimizedImagePath]);

      return {
        success: true,
        itemCount: items.length,
        items: items,
        rawAnalysis: analysisText
      };

    } catch (error) {
      console.error('Multiple foods analysis error:', error);
      return {
        success: false,
        error: error.message,
        items: []
      };
    }
  }

  /**
   * Parse multiple food items from AI response
   * @param {string} responseText - AI response with multiple items
   * @returns {Array} Array of parsed food items
   */
  parseMultipleItems(responseText) {
    const lines = responseText.split('\n').filter(line => line.trim());
    const items = [];

    for (const line of lines) {
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 4) {
          const extractNumber = (text) => {
            const match = text.match(/(\d+\.?\d*)/);
            return match ? parseFloat(match[1]) : 0;
          };

          items.push({
            name: parts[0].replace(/^Item \d+:\s*/, ''),
            portionSize: parts[1],
            calories: extractNumber(parts[2]),
            protein: extractNumber(parts[3]),
            carbs: extractNumber(parts[4]),
            fat: parts[5] ? extractNumber(parts[5]) : 0
          });
        }
      }
    }

    return items.length > 0 ? items : [{
      name: 'Unknown Food Item',
      portionSize: 'standard serving',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    }];
  }

  /**
   * Get multer middleware for image uploads
   * @returns {Function} Multer middleware
   */
  getUploadMiddleware() {
    return this.upload.single('foodImage');
  }
}

module.exports = new AIImageAnalysisService();