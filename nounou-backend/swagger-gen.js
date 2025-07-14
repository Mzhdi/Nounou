// swagger-gen.js - Put this file in your ROOT directory (same level as server.js)

const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Nounou Nutrition API',
    description: 'A comprehensive nutrition tracking API with MongoDB backend supporting unified food and recipe consumption tracking.',
    version: '2.0.0',
    contact: {
      name: 'API Support',
      email: 'support@nounou-nutrition.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  host: 'localhost:3000',
  basePath: '/',
  schemes: ['http', 'https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    {
      name: 'Health',
      description: 'Health check and system status endpoints'
    },
    {
      name: 'Users',
      description: 'User management, authentication, and profile operations'
    },
    {
      name: 'Foods',
      description: 'Food database management and search functionality'
    },
    {
      name: 'Recipes',
      description: 'Recipe creation, management, and ingredient handling'
    },
    {
      name: 'Consumption',
      description: 'Unified food and recipe consumption tracking and analytics'
    },
    {
      name: 'Categories',
      description: 'Food and recipe category management'
    },
    {
      name: 'Analytics',
      description: 'Advanced nutrition analytics and reporting'
    },
    {
      name: 'Admin',
      description: 'Administrative operations and system management'
    }
  ],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Enter your bearer token in the format: Bearer {token}'
    },
    deviceAuth: {
      type: 'apiKey',
      name: 'X-Device-ID',
      in: 'header',
      description: 'Device identification for session management'
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  definitions: {
    // ========== USER SCHEMAS ==========
    User: {
      id: "64f7d1b2c8e5f1234567890a",
      email: "user@example.com",
      name: "John Doe",
      age: 25,
      gender: "male",
      height: 175,
      weight: 70,
      activityLevel: "moderate",
      subscriptionType: "free",
      preferences: {
        units: "metric",
        language: "en",
        notifications: true
      },
      createdAt: "2024-01-15T10:30:00.000Z",
      updatedAt: "2024-01-15T10:30:00.000Z"
    },
    UserRegistration: {
      email: "user@example.com",
      password: "securePassword123",
      name: "John Doe",
      age: 25,
      gender: "male",
      height: 175,
      weight: 70,
      activityLevel: "moderate"
    },
    UserLogin: {
      email: "user@example.com",
      password: "securePassword123",
      deviceId: "optional-device-id"
    },
    AuthResponse: {
      success: true,
      message: "Login successful",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      user: "$ref:User",
      expiresIn: "24h"
    },
    UserGoal: {
      id: "64f7d1b2c8e5f1234567890f",
      type: "calories",
      target: 2000,
      current: 1500,
      unit: "kcal",
      period: "daily",
      isActive: true,
      createdAt: "2024-01-15T10:30:00.000Z"
    },

    // ========== FOOD SCHEMAS ==========
    Food: {
      id: "64f7d1b2c8e5f1234567890b",
      food_id: "food_12345",
      name: "Apple",
      description: "Fresh red apple",
      brand: "Generic",
      barcode: "1234567890123",
      category: {
        id: "64f7d1b2c8e5f1234567890e",
        name: "Fruits",
        slug: "fruits"
      },
      nutritionPer100g: {
        calories: 52,
        protein: 0.3,
        carbs: 14,
        fat: 0.2,
        fiber: 2.4,
        sugar: 10,
        sodium: 1,
        calcium: 6,
        iron: 0.12
      },
      allergens: ["none"],
      isVerified: true,
      isPublic: true,
      createdBy: "system",
      createdAt: "2024-01-15T10:30:00.000Z",
      updatedAt: "2024-01-15T10:30:00.000Z"
    },
    FoodCreate: {
      name: "Apple",
      description: "Fresh red apple",
      brand: "Generic",
      barcode: "1234567890123",
      categoryId: "64f7d1b2c8e5f1234567890e",
      nutritionPer100g: {
        calories: 52,
        protein: 0.3,
        carbs: 14,
        fat: 0.2,
        fiber: 2.4,
        sugar: 10
      },
      allergens: ["none"]
    },
    FoodCategory: {
      id: "64f7d1b2c8e5f1234567890e",
      name: "Fruits",
      slug: "fruits",
      description: "Fresh and dried fruits",
      parentId: null,
      level: 0,
      order: 1,
      isActive: true,
      icon: "🍎",
      color: "#FF6B6B"
    },

    // ========== RECIPE SCHEMAS ==========
    Recipe: {
      id: "64f7d1b2c8e5f1234567890d",
      name: "Chicken Stir Fry",
      description: "A healthy chicken stir fry with vegetables",
      category: {
        id: "64f7d1b2c8e5f1234567890g",
        name: "Main Course",
        slug: "main-course"
      },
      cuisine: "Asian",
      difficulty: "medium",
      prepTime: 15,
      cookTime: 20,
      totalTime: 35,
      servings: 4,
      isPublic: true,
      authorId: "64f7d1b2c8e5f1234567890a",
      author: {
        id: "64f7d1b2c8e5f1234567890a",
        name: "John Doe"
      },
      ingredients: [
        {
          id: "64f7d1b2c8e5f1234567890h",
          foodId: "64f7d1b2c8e5f1234567890b",
          food: "$ref:Food",
          quantity: 200,
          unit: "g",
          notes: "diced",
          order: 1
        }
      ],
      instructions: [
        {
          id: "64f7d1b2c8e5f1234567890i",
          step: 1,
          instruction: "Heat oil in a large pan over medium-high heat",
          duration: 2,
          order: 1
        }
      ],
      nutrition: {
        perServing: {
          calories: 285,
          protein: 25.4,
          carbs: 18.2,
          fat: 12.8,
          fiber: 3.2,
          sugar: 8.5
        },
        total: {
          calories: 1140,
          protein: 101.6,
          carbs: 72.8,
          fat: 51.2
        }
      },
      tags: ["healthy", "quick", "protein-rich"],
      rating: {
        average: 4.5,
        count: 12
      },
      createdAt: "2024-01-15T10:30:00.000Z",
      updatedAt: "2024-01-15T10:30:00.000Z"
    },
    RecipeCreate: {
      name: "Chicken Stir Fry",
      description: "A healthy chicken stir fry",
      categoryId: "64f7d1b2c8e5f1234567890g",
      cuisine: "Asian",
      difficulty: "medium",
      prepTime: 15,
      cookTime: 20,
      servings: 4,
      isPublic: true,
      ingredients: [
        {
          foodId: "64f7d1b2c8e5f1234567890b",
          quantity: 200,
          unit: "g",
          notes: "diced"
        }
      ],
      instructions: [
        {
          step: 1,
          instruction: "Heat oil in a large pan",
          duration: 2
        }
      ],
      tags: ["healthy", "quick"]
    },
    RecipeCategory: {
      id: "64f7d1b2c8e5f1234567890g",
      name: "Main Course",
      slug: "main-course",
      description: "Main course recipes",
      parentId: null,
      level: 0,
      order: 1,
      icon: "🍽️",
      color: "#4ECDC4"
    },

    // ========== CONSUMPTION SCHEMAS ==========
    ConsumptionEntry: {
      id: "64f7d1b2c8e5f1234567890c",
      userId: "64f7d1b2c8e5f1234567890a",
      itemType: "food",
      itemId: "64f7d1b2c8e5f1234567890b",
      item: "$ref:Food",
      quantity: 150,
      unit: "g",
      servings: null,
      mealType: "breakfast",
      mealName: "Morning Snack",
      consumedAt: "2024-01-15T08:30:00.000Z",
      calculatedNutrition: {
        calories: 78,
        protein: 0.45,
        carbs: 21,
        fat: 0.3,
        fiber: 3.6,
        sugar: 15
      },
      notes: "Fresh and crunchy",
      tags: ["healthy", "fruit"],
      source: "manual",
      createdAt: "2024-01-15T10:30:00.000Z",
      updatedAt: "2024-01-15T10:30:00.000Z"
    },
    ConsumptionEntryCreate: {
      itemType: "food",
      itemId: "64f7d1b2c8e5f1234567890b",
      quantity: 150,
      unit: "g",
      mealType: "breakfast",
      mealName: "Morning Snack",
      consumedAt: "2024-01-15T08:30:00.000Z",
      notes: "Fresh and crunchy"
    },
    RecipeConsumptionEntry: {
      itemType: "recipe",
      itemId: "64f7d1b2c8e5f1234567890d",
      servings: 1.5,
      mealType: "lunch",
      mealName: "Healthy Lunch",
      consumedAt: "2024-01-15T12:30:00.000Z",
      notes: "Delicious homemade meal"
    },
    QuickMeal: {
      items: [
        {
          itemType: "food",
          itemId: "64f7d1b2c8e5f1234567890b",
          quantity: 100,
          unit: "g"
        },
        {
          itemType: "recipe",
          itemId: "64f7d1b2c8e5f1234567890d",
          servings: 1
        }
      ],
      mealType: "dinner",
      mealName: "Balanced Dinner",
      consumedAt: "2024-01-15T19:30:00.000Z"
    },
    DashboardData: {
      success: true,
      period: "today",
      summary: {
        totalCalories: 1847,
        totalProtein: 85.3,
        totalCarbs: 215.7,
        totalFat: 62.4,
        totalFiber: 28.5,
        goalCalories: 2000,
        caloriesRemaining: 153,
        progressPercentage: 92.4
      },
      breakdown: {
        breakfast: {
          calories: 520,
          entries: 3,
          items: 2
        },
        lunch: {
          calories: 680,
          entries: 4,
          items: 3
        },
        dinner: {
          calories: 560,
          entries: 2,
          items: 1
        },
        snack: {
          calories: 87,
          entries: 1,
          items: 1
        }
      },
      itemTypeBreakdown: {
        foods: {
          calories: 920,
          percentage: 49.8,
          entries: 6
        },
        recipes: {
          calories: 927,
          percentage: 50.2,
          entries: 4
        }
      },
      topItems: [
        {
          name: "Chicken Stir Fry",
          type: "recipe",
          calories: 285,
          frequency: 3
        }
      ]
    },

    // ========== COMMON SCHEMAS ==========
    Error: {
      success: false,
      error: "Bad Request",
      message: "Invalid input data",
      details: {
        field: "email",
        reason: "Invalid email format"
      },
      timestamp: "2024-01-15T10:30:00.000Z"
    },
    Success: {
      success: true,
      message: "Operation completed successfully",
      timestamp: "2024-01-15T10:30:00.000Z"
    },
    Pagination: {
      page: 1,
      limit: 20,
      total: 150,
      pages: 8,
      hasNext: true,
      hasPrev: false
    },
    HealthCheck: {
      status: "healthy",
      timestamp: "2024-01-15T10:30:00.000Z",
      service: "nounou-nutrition-api",
      version: "2.0.0",
      uptime: 3600,
      environment: "development",
      database: {
        status: "connected",
        responseTime: "15ms"
      },
      features: {
        unifiedItemSupport: true,
        foodIntegration: true,
        recipeIntegration: true,
        advancedAnalytics: true
      }
    },

    // ========== ANALYTICS SCHEMAS ==========
    NutritionBalance: {
      period: "week",
      totalCalories: 14500,
      sources: {
        foods: {
          calories: 7250,
          percentage: 50,
          topContributors: ["Apple", "Banana", "Chicken Breast"]
        },
        recipes: {
          calories: 7250,
          percentage: 50,
          topContributors: ["Chicken Stir Fry", "Pasta Salad"]
        }
      },
      trends: {
        daily: [
          { date: "2024-01-15", foodCalories: 1000, recipeCalories: 1200 }
        ]
      }
    },
    TopItems: {
      period: "month",
      items: [
        {
          id: "64f7d1b2c8e5f1234567890d",
          name: "Chicken Stir Fry",
          type: "recipe",
          totalCalories: 2850,
          frequency: 10,
          avgCaloriesPerServing: 285,
          lastConsumed: "2024-01-15T19:30:00.000Z"
        }
      ]
    }
  }
};

const outputFile = './src/swagger-output.json';
const endpointsFiles = [
  './src/app.js',
  './src/routes/userRoutes.js',
  './src/routes/foodRoutes.js',
  './src/routes/consumptionRoutes.js',
  './src/routes/recipeRoutes.js'
];

// Generate swagger documentation
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log('✅ Swagger documentation generated successfully!');
  console.log('📄 Generated file:', outputFile);
  console.log('🚀 Start your server to view docs at: http://localhost:3000/api-docs');
  console.log('📊 JSON spec available at: http://localhost:3000/api-docs.json');
});