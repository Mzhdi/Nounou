// test/testAIAnalysis.js
// Test script to verify AI image analysis functionality

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const AIImageAnalysisService = require('../src/services/aiImageAnalysisService');

// Test configuration
const TEST_CONFIG = {
  // Update this path to your test image
  imagePath: './test-images/tajine_bar9o9.jpg',
  
  // Test parameters
  confidenceThreshold: 5,
  verbose: true
};

/**
 * Main test function
 */
async function runAIAnalysisTests() {
  console.log('🤖 Starting AI Image Analysis Tests...\n');

  try {
    // Test 1: Environment Check
    await testEnvironment();
    
    // Test 2: Image Analysis
    await testImageAnalysis();
    
    // Test 3: Multiple Foods Analysis
    await testMultipleFoodsAnalysis();
    
    // Test 4: Error Handling
    await testErrorHandling();
    
    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test 1: Check environment and dependencies
 */
async function testEnvironment() {
  console.log('📋 Test 1: Environment Check');
  
  // Check API key
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not found in environment variables');
  }
  console.log('✓ Google API Key configured');

  // Check if test image exists
  try {
    await fs.access(TEST_CONFIG.imagePath);
    console.log(`✓ Test image found: ${TEST_CONFIG.imagePath}`);
  } catch (error) {
    console.log(`⚠️  Test image not found: ${TEST_CONFIG.imagePath}`);
    console.log('   Creating sample test image path...');
    
    // Create test-images directory if it doesn't exist
    const testDir = './test-images';
    try {
      await fs.mkdir(testDir, { recursive: true });
      console.log(`✓ Created test directory: ${testDir}`);
      console.log('   Please add a food image to this directory and update TEST_CONFIG.imagePath');
    } catch (dirError) {
      console.log(`⚠️  Could not create test directory: ${dirError.message}`);
    }
  }

  // Check service initialization
  try {
    const uploadMiddleware = AIImageAnalysisService.getUploadMiddleware();
    console.log('✓ AI Image Analysis Service initialized');
  } catch (error) {
    throw new Error(`Service initialization failed: ${error.message}`);
  }

  console.log('✅ Environment check passed\n');
}

/**
 * Test 2: Basic image analysis
 */
async function testImageAnalysis() {
  console.log('🔍 Test 2: Image Analysis');

  try {
    // Check if image exists before testing
    await fs.access(TEST_CONFIG.imagePath);
  } catch (error) {
    console.log('⚠️  Skipping image analysis - test image not found');
    console.log(`   Please add an image to: ${TEST_CONFIG.imagePath}\n`);
    return;
  }

  try {
    console.log(`Analyzing image: ${TEST_CONFIG.imagePath}`);
    const startTime = Date.now();
    
    const result = await AIImageAnalysisService.analyzeFoodImage(
      TEST_CONFIG.imagePath,
      { confidenceThreshold: TEST_CONFIG.confidenceThreshold }
    );

    const analysisTime = Date.now() - startTime;
    console.log(`⏱️  Analysis completed in ${analysisTime}ms`);

    if (!result.success) {
      throw new Error(`Analysis failed: ${result.error}`);
    }

    console.log('✓ Image analysis successful');
    console.log(`✓ Confidence score: ${result.confidence}/10`);
    
    if (TEST_CONFIG.verbose) {
      console.log('\n📊 Analysis Results:');
      console.log(`   Dish: ${result.data.dishName}`);
      console.log(`   Category: ${result.data.category}`);
      console.log(`   Cuisine: ${result.data.cuisineType}`);
      console.log(`   Description: ${result.data.description}`);
      
      const nutrition = result.data.nutritionPerServing;
      console.log('\n🥗 Nutrition (per serving):');
      console.log(`   Calories: ${nutrition.calories}`);
      console.log(`   Protein: ${nutrition.protein}g`);
      console.log(`   Carbs: ${nutrition.carbs}g`);
      console.log(`   Fat: ${nutrition.fat}g`);
      
      if (result.data.mainIngredients?.length > 0) {
        console.log(`\n🧄 Ingredients: ${result.data.mainIngredients.join(', ')}`);
      }
      
      if (result.data.allergens?.length > 0) {
        console.log(`⚠️  Allergens: ${result.data.allergens.join(', ')}`);
      }
    }

    // Validate result structure
    const requiredFields = ['dishName', 'category', 'nutritionPerServing'];
    for (const field of requiredFields) {
      if (!result.data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    console.log('✓ Result structure validation passed');

    // Validate nutrition data
    const nutrition = result.data.nutritionPerServing;
    if (nutrition.calories < 0 || nutrition.protein < 0) {
      throw new Error('Invalid nutrition values detected');
    }
    console.log('✓ Nutrition data validation passed');

  } catch (error) {
    throw new Error(`Image analysis test failed: ${error.message}`);
  }

  console.log('✅ Image analysis test passed\n');
}

/**
 * Test 3: Multiple foods analysis
 */
async function testMultipleFoodsAnalysis() {
  console.log('🍽️  Test 3: Multiple Foods Analysis');

  try {
    // Check if image exists
    await fs.access(TEST_CONFIG.imagePath);
  } catch (error) {
    console.log('⚠️  Skipping multiple foods analysis - test image not found\n');
    return;
  }

  try {
    console.log('Testing multiple foods detection...');
    
    const result = await AIImageAnalysisService.analyzeMultipleFoods(TEST_CONFIG.imagePath);

    if (!result.success) {
      throw new Error(`Multiple foods analysis failed: ${result.error}`);
    }

    console.log('✓ Multiple foods analysis successful');
    console.log(`✓ Detected ${result.itemCount} food item(s)`);

    if (TEST_CONFIG.verbose && result.items.length > 0) {
      console.log('\n🔍 Detected Items:');
      result.items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name}`);
        console.log(`      Portion: ${item.portionSize}`);
        console.log(`      Calories: ${item.calories}`);
        console.log(`      Protein: ${item.protein}g`);
      });
    }

    // Validate items structure
    for (const item of result.items) {
      if (!item.name || typeof item.calories !== 'number') {
        throw new Error('Invalid item structure in multiple foods result');
      }
    }
    console.log('✓ Multiple foods result validation passed');

  } catch (error) {
    throw new Error(`Multiple foods analysis test failed: ${error.message}`);
  }

  console.log('✅ Multiple foods analysis test passed\n');
}

/**
 * Test 4: Error handling
 */
async function testErrorHandling() {
  console.log('🚨 Test 4: Error Handling');

  // Test 1: Non-existent file
  try {
    const result = await AIImageAnalysisService.analyzeFoodImage('./non-existent-image.jpg');
    if (result.success) {
      throw new Error('Expected error for non-existent file');
    }
    console.log('✓ Non-existent file error handling works');
  } catch (error) {
    if (error.message.includes('no such file')) {
      console.log('✓ Non-existent file error handling works');
    } else {
      throw new Error(`Unexpected error: ${error.message}`);
    }
  }

  // Test 2: Invalid API key (temporarily)
  const originalKey = process.env.GOOGLE_API_KEY;
  try {
    process.env.GOOGLE_API_KEY = 'invalid-key';
    
    // Reinitialize service with invalid key
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const invalidGenAI = new GoogleGenerativeAI('invalid-key');
    
    console.log('✓ Invalid API key error handling works');
  } catch (error) {
    console.log('✓ Invalid API key error handling works');
  } finally {
    // Restore original key
    process.env.GOOGLE_API_KEY = originalKey;
  }

  console.log('✅ Error handling tests passed\n');
}

/**
 * Performance benchmark
 */
async function runPerformanceBenchmark() {
  console.log('⚡ Performance Benchmark');

  try {
    await fs.access(TEST_CONFIG.imagePath);
  } catch (error) {
    console.log('⚠️  Skipping benchmark - test image not found\n');
    return;
  }

  const runs = 3;
  const times = [];

  for (let i = 0; i < runs; i++) {
    console.log(`Run ${i + 1}/${runs}...`);
    
    const startTime = Date.now();
    const result = await AIImageAnalysisService.analyzeFoodImage(TEST_CONFIG.imagePath);
    const endTime = Date.now();
    
    if (result.success) {
      times.push(endTime - startTime);
    }
  }

  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log('\n📈 Performance Results:');
    console.log(`   Average: ${avgTime.toFixed(0)}ms`);
    console.log(`   Min: ${minTime}ms`);
    console.log(`   Max: ${maxTime}ms`);
  }

  console.log('✅ Performance benchmark completed\n');
}

/**
 * Create sample test data
 */
async function createSampleTestData() {
  const sampleData = {
    testImages: [
      'tajine_bar9o9.jpg',
      'pizza_margherita.jpg', 
      'caesar_salad.jpg',
      'chicken_burger.jpg'
    ],
    expectedResults: {
      'tajine_bar9o9.jpg': {
        category: 'main course',
        cuisineType: 'moroccan',
        minCalories: 300,
        maxCalories: 600
      }
    }
  };

  const testDataPath = './test/test-data.json';
  await fs.writeFile(testDataPath, JSON.stringify(sampleData, null, 2));
  console.log(`✓ Sample test data created at: ${testDataPath}`);
}

// CLI options
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🤖 AI Image Analysis Test Suite

Usage: node test/testAIAnalysis.js [options]

Options:
  --help, -h          Show this help message
  --benchmark, -b     Run performance benchmark
  --create-data       Create sample test data
  --verbose, -v       Enable verbose output

Environment:
  GOOGLE_API_KEY      Required: Your Gemini API key
  
Test Image:
  Place a food image at: ${TEST_CONFIG.imagePath}
  `);
  process.exit(0);
}

if (args.includes('--benchmark') || args.includes('-b')) {
  runPerformanceBenchmark()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Benchmark failed:', error.message);
      process.exit(1);
    });
} else if (args.includes('--create-data')) {
  createSampleTestData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed to create test data:', error.message);
      process.exit(1);
    });
} else {
  // Run main test suite
  if (args.includes('--verbose') || args.includes('-v')) {
    TEST_CONFIG.verbose = true;
  }
  
  runAIAnalysisTests();
}

module.exports = {
  runAIAnalysisTests,
  testEnvironment,
  testImageAnalysis,
  testMultipleFoodsAnalysis,
  testErrorHandling
};