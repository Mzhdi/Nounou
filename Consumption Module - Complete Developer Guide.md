# 🍽️ Consumption Module v2.0 - Complete Developer Guide

## 📋 Table of Contents
- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Architecture](#architecture)
- [Data Schema](#data-schema)
- [API Endpoints](#api-endpoints)
- [Testing with Postman](#testing-with-postman)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Migration Guide](#migration-guide)

---

## 🎯 Overview

The **Consumption Module v2.0** is a unified system that allows users to log their food intake by consuming either:
- **Individual foods** (e.g., "Apple, 150g")
- **Complete recipes** (e.g., "Caesar Salad, 1.5 servings")

### What's New in v2.0
- ✅ **Unified Schema**: Single model supports both foods and recipes
- ✅ **Automatic Nutrition Calculation**: Integrates with Food/Recipe services
- ✅ **Backward Compatibility**: Supports old `foodId`/`recipeId` format
- ✅ **Advanced Analytics**: Cross-type insights and reporting
- ✅ **Smart Suggestions**: AI-powered food and recipe recommendations
- ✅ **Comprehensive Validation**: Class-based validation middleware
- ✅ **Enhanced Export**: Multiple format support (JSON, CSV, XLSX)
- ✅ **Batch Operations**: Bulk processing and admin tools

---

## 🧠 Core Concepts

### 1. **Unified Item System**
Instead of separate fields for foods and recipes, we use a flexible `consumedItem` structure:

```javascript
// NEW UNIFIED APPROACH
{
  consumedItem: {
    itemType: 'food',           // or 'recipe'
    itemId: ObjectId,           // Points to Food or Recipe
    refPath: 'Food'            // Dynamic reference
  }
}

// OLD RIGID APPROACH (still supported)
{
  foodId: ObjectId,            // Legacy support
  recipeId: ObjectId           // Legacy support
}
```

### 2. **Smart Nutrition Calculation**
The system automatically calculates nutrition based on the item type:
- **Food**: Uses `nutritionPer100g` × `quantity`
- **Recipe**: Uses `nutritionPerServing` × `servings`

### 3. **Entry Methods**
- `manual`: User manually enters item and quantity
- `recipe`: User selects from saved recipes
- `quick_meal`: Quick logging with multiple items
- `barcode_scan`: Scanned via barcode
- `image_analysis`: AI-powered image recognition
- `voice`: Voice input processing

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Food API      │    │   Recipe API    │    │  Consumption    │
│                 │    │                 │    │     API         │
│ /foods          │    │ /recipes        │    │ /consumption    │
│ - Get food info │    │ - Get recipe    │    │ - Log entries   │
│ - Nutrition     │    │ - Nutrition     │    │ - Analytics     │
│   per 100g      │    │   per serving   │    │ - Reports       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ ConsumptionEntry│
                    │     Model       │
                    │                 │
                    │ Unified Schema  │
                    │ Food + Recipe   │
                    │ Support         │
                    └─────────────────┘
```

### File Structure
```
src/
├── models/
│   └── consumptionModel.js           # Unified schema
├── services/
│   └── consumptionService.js         # Business logic (80+ methods)
├── controllers/
│   └── consumptionController.js      # API handlers (60+ methods)
├── middleware/
│   ├── auth.js                       # Authentication & authorization
│   ├── rateLimiter.js               # Rate limiting by subscription
│   └── consumptionValidation.js     # Request validation (class-based)
└── routes/
    └── consumptionRoutes.js         # 35+ endpoints with Swagger docs
```

---

## 📊 Data Schema

### ConsumptionEntry Model (Updated)

```javascript
{
  // User identification
  userId: ObjectId,                    // Required
  
  // UNIFIED ITEM REFERENCE (NEW)
  consumedItem: {
    itemType: String,                  // 'food' | 'recipe'
    itemId: ObjectId,                  // Food._id or Recipe._id
    refPath: String                    // 'Food' | 'Recipe' (for populate)
  },
  
  // Consumption details
  quantity: Number,                    // For foods (e.g., 150g)
  unit: String,                        // 'g', 'ml', 'cup', 'piece', etc.
  servings: Number,                    // For recipes (e.g., 1.5 servings)
  
  // Context
  mealType: String,                    // 'breakfast', 'lunch', 'dinner', 'snack', 'other'
  consumedAt: Date,                    // When consumed
  entryMethod: String,                 // 'manual', 'recipe', 'quick_meal', 'barcode_scan', 'image_analysis', 'voice'
  
  // Calculated nutrition (auto-generated)
  calculatedNutrition: {
    calories: Number,
    protein: Number,                   // grams
    carbs: Number,                     // grams  
    fat: Number,                       // grams
    fiber: Number,                     // grams
    sugar: Number,                     // grams
    sodium: Number,                    // mg
    calculatedAt: Date,
    calculationSource: String,         // 'food_database', 'recipe_computation'
    confidence: Number                 // 0-1 confidence score
  },
  
  // Enhanced metadata
  metadata: {
    deviceInfo: {
      deviceId: String,
      deviceType: String,               // 'mobile', 'web', 'tablet'
      ipAddress: String,
      userAgent: String
    },
    userInput: {
      notes: String,
      tags: [String],                   // ['healthy', 'protein', 'homemade']
      rating: Number,                   // 1-5 stars
      mood: String,                     // 'happy', 'satisfied', 'neutral', 'disappointed'
      photos: [String]                  // URLs to uploaded photos
    },
    location: {
      name: String,                     // 'Home', 'Restaurant', 'Office'
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    aiAnalysis: {
      confidence: Number,               // AI recognition confidence
      alternatives: [String],           // Alternative suggestions
      imageAnalysis: Object             // Image processing results
    }
  },
  
  // Meal context
  context: {
    meal: {
      isPartOfLargerMeal: Boolean,
      mealSessionId: String,            // Groups related entries
      mealName: String                  // 'Sunday Brunch', 'Family Dinner'
    },
    originalRecipe: {
      name: String,
      totalServings: Number,
      portionConsumed: Number
    },
    social: {
      sharedWith: [String],            // User IDs
      location: String,
      occasion: String                 // 'birthday', 'date night', 'work lunch'
    }
  },
  
  // Enhanced tracking
  tracking: {
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: ObjectId,
    deletionReason: String,
    
    versions: [{
      changedAt: Date,
      changedBy: ObjectId,
      changes: [String],                // Array of changed fields
      reason: String,                   // 'user_edit', 'nutrition_sync', 'admin_correction'
      previousValues: Object
    }],
    
    qualityScore: Number,              // 0-100 data quality score
    isVerified: Boolean,               // Manually verified by user
    confidence: Number,                // Overall entry confidence
    
    syncHistory: [{
      syncedAt: Date,
      source: String,                  // 'food_database', 'recipe_update'
      changes: Object
    }]
  }
}
```

---

## 🔌 API Endpoints

Base URL: `/api/v1/consumption`

### 📝 Entry Creation

#### Create Unified Entry
```http
POST /entries
Content-Type: application/json
Authorization: Bearer <token>

{
  "itemType": "food",           // or "recipe"
  "itemId": "686ea2df0054e2a44fa55d1b",
  "quantity": 150,              // for foods
  "unit": "g",                  // for foods
  "servings": 1.5,              // for recipes
  "mealType": "breakfast",
  "notes": "Morning snack",
  "tags": ["healthy", "protein"],
  "rating": 4,
  "mood": "satisfied"
}
```

#### Create Food Entry (Specific)
```http
POST /entries/food
Content-Type: application/json
Authorization: Bearer <token>

{
  "itemId": "686ea2df0054e2a44fa55d1b",    // or "foodId" for backward compatibility
  "quantity": 200,
  "unit": "g",
  "mealType": "lunch",
  "notes": "Grilled chicken breast",
  "rating": 5
}
```

#### Create Recipe Entry (Specific)
```http
POST /entries/recipe
Content-Type: application/json
Authorization: Bearer <token>

{
  "itemId": "68721968b85f494e0ac371b1",    // or "recipeId" for backward compatibility
  "servings": 2,
  "mealType": "dinner",
  "notes": "Made extra spicy",
  "rating": 4
}
```

#### Create Quick Meal (Multiple Items)
```http
POST /meals/quick
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {
      "itemType": "food",
      "itemId": "686ea2df0054e2a44fa55d1b",
      "quantity": 100,
      "unit": "g"
    },
    {
      "itemType": "recipe", 
      "itemId": "68721968b85f494e0ac371b1",
      "servings": 1
    }
  ],
  "mealType": "breakfast",
  "mealName": "Complete Breakfast",
  "mealNotes": "Weekend special",
  "tags": ["weekend", "homemade"]
}
```

#### Create Meal from Recipe
```http
POST /meals/from-recipe/68721968b85f494e0ac371b1
Content-Type: application/json
Authorization: Bearer <token>

{
  "servings": 1.5,
  "mealType": "lunch",
  "notes": "Shared with colleague",
  "includeIngredients": false
}
```

### 🔍 Retrieval & Search

#### Get User Entries (with Advanced Filtering)
```http
GET /entries?page=1&limit=20&mealType=breakfast&itemType=food&dateFrom=2025-07-01&dateTo=2025-07-14&search=chicken&minCalories=100&maxCalories=500
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (1-100, default: 20)
- `mealType`: breakfast, lunch, dinner, snack, other
- `itemType`: food, recipe
- `dateFrom`: Start date (ISO format)
- `dateTo`: End date (ISO format)
- `search`: Text search in notes and tags
- `tags`: Comma-separated tags
- `minCalories`: Minimum calories filter
- `maxCalories`: Maximum calories filter
- `sortBy`: consumedAt, calories, createdAt (default: consumedAt)
- `sortOrder`: asc, desc (default: desc)
- `includeDeleted`: Include soft-deleted entries

#### Get Food Entries Only
```http
GET /entries/foods?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Recipe Entries Only
```http
GET /entries/recipes?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Single Entry
```http
GET /entries/60f7b1b9c9a6b12345678901
Authorization: Bearer <token>
```

#### Search Entries
```http
GET /search?q=chicken&page=1&limit=20&itemType=food&dateFrom=2025-07-01
Authorization: Bearer <token>
```

#### Search Food Entries Only
```http
GET /search/foods?q=chicken
Authorization: Bearer <token>
```

#### Search Recipe Entries Only
```http
GET /search/recipes?q=salad
Authorization: Bearer <token>
```

### 📊 Analytics & Dashboard

#### Get Nutrition Dashboard
```http
GET /dashboard?period=today&includeComparison=true&includeGoals=true&includeInsights=true
Authorization: Bearer <token>
```

**Parameters:**
- `period`: today, week, month, year
- `includeComparison`: Compare with previous period
- `includeGoals`: Include goal progress
- `includeInsights`: Include AI insights
- `weekOffset`: Offset for week period (-52 to 52)
- `monthOffset`: Offset for month period (-12 to 12)

#### Get Dashboard by Item Type
```http
GET /dashboard/by-type?period=week
Authorization: Bearer <token>
```

#### Get Top Consumed Items
```http
GET /stats/top-items?limit=10&period=month&itemType=food&mealType=breakfast
Authorization: Bearer <token>
```

#### Get Top Foods
```http
GET /stats/top-foods?limit=10&period=month
Authorization: Bearer <token>
```

#### Get Top Recipes
```http
GET /stats/top-recipes?limit=10&period=month
Authorization: Bearer <token>
```

#### Get Nutrition Balance Analysis
```http
GET /stats/balance?period=week&includeComparison=true
Authorization: Bearer <token>
```

### ✏️ Entry Management

#### Update Entry
```http
PUT /entries/60f7b1b9c9a6b12345678901
Content-Type: application/json
Authorization: Bearer <token>

{
  "quantity": 175,
  "notes": "Updated portion size",
  "rating": 5,
  "tags": ["healthy", "protein", "lean"]
}
```

#### Delete Entry (Soft Delete)
```http
DELETE /entries/60f7b1b9c9a6b12345678901
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "incorrect_entry",
  "hardDelete": false
}
```

#### Duplicate Entry
```http
POST /entries/60f7b1b9c9a6b12345678901/duplicate
Content-Type: application/json
Authorization: Bearer <token>

{
  "mealType": "dinner",
  "consumedAt": "2025-07-15T19:00:00Z",
  "notes": "Same meal, different time"
}
```

#### Recalculate Nutrition
```http
POST /entries/60f7b1b9c9a6b12345678901/recalculate
Authorization: Bearer <token>
```

### 🤖 AI Suggestions & Recommendations

#### Get Food Suggestions
```http
GET /suggestions/foods?mealType=breakfast&limit=10&basedOn=history
Authorization: Bearer <token>
```
*Requires Premium subscription*

#### Get Recipe Suggestions
```http
GET /suggestions/recipes?mealType=dinner&limit=10&basedOn=ingredients
Authorization: Bearer <token>
```
*Requires Premium subscription*

#### Get Missing Nutrient Recommendations
```http
POST /recommendations/missing-nutrients
Content-Type: application/json
Authorization: Bearer <token>

{
  "targetNutrients": ["protein", "fiber", "vitaminC"],
  "period": "week"
}
```
*Requires Premium subscription*

### ✅ Validation & Synchronization

#### Validate Food Exists
```http
POST /validate/food-exists/686ea2df0054e2a44fa55d1b
Authorization: Bearer <token>
```

#### Validate Recipe Exists
```http
POST /validate/recipe-exists/68721968b85f494e0ac371b1
Authorization: Bearer <token>
```

#### Sync Nutrition Data
```http
POST /sync/nutrition
Content-Type: application/json
Authorization: Bearer <token>

{
  "force": true,
  "itemType": "food",
  "batchSize": 100
}
```
*Requires Pro subscription*

### 📊 Advanced Reports

#### Get Nutrition Sources Report
```http
GET /reports/nutrition-sources?period=month&includeComparison=true
Authorization: Bearer <token>
```
*Requires Premium subscription*

#### Get Recipe Usage Report
```http
GET /reports/recipe-usage?period=month
Authorization: Bearer <token>
```
*Requires Premium subscription*

#### Get Food vs Recipe Report
```http
GET /reports/food-vs-recipe?period=quarter&includeComparison=true
Authorization: Bearer <token>
```
*Requires Pro subscription*

### 📤 Export & Import

#### Export Unified Data
```http
GET /export/unified?format=json&dateFrom=2025-07-01&dateTo=2025-07-31&includeNutrition=true&includeItemDetails=true&includeMetadata=false
Authorization: Bearer <token>
```

**Parameters:**
- `format`: json, csv, xlsx
- `dateFrom/dateTo`: Date range
- `includeNutrition`: Include nutrition data
- `includeItemDetails`: Include full item details
- `includeMetadata`: Include metadata and tracking info
- `limit`: Max entries (default: 10000)

*Requires Premium subscription*

#### Export Data by Type
```http
GET /export/by-type?format=csv&dateFrom=2025-07-01
Authorization: Bearer <token>
```
*Requires Premium subscription*

### ⚙️ Batch Operations

#### Batch Recalculate Nutrition
```http
POST /batch/recalculate
Content-Type: application/json
Authorization: Bearer <token>

{
  "entryIds": ["id1", "id2", "id3"]
}
```
*Requires Pro subscription*

#### Batch Convert Item Type
```http
POST /batch/convert-type
Content-Type: application/json
Authorization: Bearer <token>

{
  "entryIds": ["id1", "id2"],
  "fromType": "food",
  "toType": "recipe",
  "conversionData": {
    "reason": "recipe_created_from_food"
  }
}
```
*Requires Admin role*

### 🔧 Admin & Maintenance

#### Trigger Schema Migration
```http
POST /migration/schema
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "dryRun": true,
  "batchSize": 100,
  "backupFirst": true
}
```

#### Get Migration Status
```http
GET /migration/status
Authorization: Bearer <admin_token>
```

#### Cleanup Orphaned Entries
```http
POST /maintenance/cleanup-orphaned
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "olderThan": "2025-01-01",
  "includeOrphaned": true,
  "dryRun": true,
  "maxEntries": 1000
}
```

#### Get Global Statistics
```http
GET /admin/stats/item-types?period=month&includeUserBreakdown=false
Authorization: Bearer <admin_token>
```

#### Get Migration Statistics
```http
GET /admin/stats/migration
Authorization: Bearer <admin_token>
```

### 🏥 Health & Metadata

#### Health Check
```http
GET /health
```

```json
{
  "status": "healthy",
  "timestamp": "2025-07-14T10:30:00.000Z",
  "service": "consumption-service-v2",
  "version": "2.0.0",
  "features": {
    "unifiedItemSupport": true,
    "foodIntegration": true,
    "recipeIntegration": true,
    "advancedAnalytics": true,
    "crossModuleSync": true,
    "migrationTools": true
  },
  "supportedItemTypes": ["food", "recipe"],
  "integrations": {
    "foodService": true,
    "recipeService": true,
    "userService": true
  }
}
```

#### Get Service Metadata
```http
GET /metadata
Authorization: Bearer <token>
```

---

## 🧪 Testing with Postman

### Environment Setup

Create a Postman environment with:
```json
{
  "baseUrl": "http://localhost:3000/api/v1/consumption",
  "authToken": "your_jwt_token_here",
  "userId": "686c197100ed573094c32ba7",
  "foodId": "686ea2df0054e2a44fa55d1b", 
  "recipeId": "68721968b85f494e0ac371b1"
}
```

### Authentication Header
Add to all requests:
```
Authorization: Bearer {{authToken}}
```

### Test Collection Structure

```
📁 Consumption API v2.0 Tests
├── 📁 1. Health & Validation
│   ├── GET Health Check
│   ├── GET Service Metadata
│   ├── POST Validate Food Exists
│   └── POST Validate Recipe Exists
├── 📁 2. Entry Creation
│   ├── POST Create Unified Entry
│   ├── POST Create Food Entry
│   ├── POST Create Recipe Entry
│   ├── POST Create Quick Meal
│   └── POST Create Meal from Recipe
├── 📁 3. Retrieval & Search
│   ├── GET All Entries (with filters)
│   ├── GET Food Entries Only
│   ├── GET Recipe Entries Only
│   ├── GET Single Entry
│   ├── GET Search All
│   ├── GET Search Foods
│   └── GET Search Recipes
├── 📁 4. Analytics & Dashboard
│   ├── GET Dashboard
│   ├── GET Dashboard by Type
│   ├── GET Top Items
│   ├── GET Top Foods
│   ├── GET Top Recipes
│   └── GET Nutrition Balance
├── 📁 5. Entry Management
│   ├── PUT Update Entry
│   ├── DELETE Soft Delete Entry
│   ├── POST Duplicate Entry
│   └── POST Recalculate Nutrition
├── 📁 6. AI Suggestions (Premium)
│   ├── GET Food Suggestions
│   ├── GET Recipe Suggestions
│   └── POST Missing Nutrient Recommendations
├── 📁 7. Reports (Premium/Pro)
│   ├── GET Nutrition Sources Report
│   ├── GET Recipe Usage Report
│   └── GET Food vs Recipe Report
├── 📁 8. Export (Premium)
│   ├── GET Export Unified Data
│   └── GET Export by Type
└── 📁 9. Admin Operations
    ├── POST Batch Recalculate
    ├── GET Migration Status
    └── GET Global Statistics
```

### Sample Test Sequence

#### 1. Basic Flow Test
```http
# 1. Check if food exists
POST {{baseUrl}}/validate/food-exists/{{foodId}}

# 2. Create food entry
POST {{baseUrl}}/entries/food
{
  "itemId": "{{foodId}}",
  "quantity": 150,
  "unit": "g",
  "mealType": "breakfast",
  "notes": "Test entry",
  "rating": 4
}

# 3. Get created entry (save ID from previous response)
GET {{baseUrl}}/entries/{{lastEntryId}}

# 4. Update entry
PUT {{baseUrl}}/entries/{{lastEntryId}}
{
  "quantity": 200,
  "notes": "Updated quantity"
}

# 5. View dashboard
GET {{baseUrl}}/dashboard?period=today
```

### Postman Test Scripts

Add these to your request **Tests** tab:

#### For Entry Creation:
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response structure is correct", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success', true);
    pm.expect(jsonData).to.have.property('data');
    pm.expect(jsonData).to.have.property('message');
});

pm.test("Entry has required fields", function () {
    const entry = pm.response.json().data.entry;
    pm.expect(entry).to.have.property('_id');
    pm.expect(entry).to.have.property('userId');
    pm.expect(entry).to.have.property('consumedItem');
    pm.expect(entry).to.have.property('calculatedNutrition');
    
    // Save for other tests
    pm.environment.set("lastEntryId", entry._id);
});

pm.test("Nutrition calculation is valid", function () {
    const nutrition = pm.response.json().data.nutritionSummary;
    pm.expect(nutrition.calories).to.be.a('number');
    pm.expect(nutrition.calories).to.be.greaterThan(0);
    pm.expect(nutrition.confidence).to.be.within(0, 1);
});
```

#### For Dashboard:
```javascript
pm.test("Dashboard has all sections", function () {
    const dashboard = pm.response.json().data;
    pm.expect(dashboard).to.have.property('totals');
    pm.expect(dashboard).to.have.property('breakdown');
    pm.expect(dashboard).to.have.property('dateRange');
});

pm.test("Breakdown includes item types", function () {
    const breakdown = pm.response.json().data.breakdown;
    pm.expect(breakdown).to.have.property('byItemType');
    pm.expect(breakdown.byItemType).to.have.property('food');
    pm.expect(breakdown.byItemType).to.have.property('recipe');
});
```

---

## 💡 Usage Examples

### Real-World Scenarios

#### Scenario 1: Morning Breakfast Logging
```javascript
// User logs: "Oatmeal (50g) + Banana (120g) + Milk (200ml)"

// Option A: Quick meal (recommended)
POST /meals/quick {
  mealType: "breakfast",
  mealName: "Healthy Breakfast",
  items: [
    { itemType: "food", itemId: "oatmeal_id", quantity: 50, unit: "g" },
    { itemType: "food", itemId: "banana_id", quantity: 120, unit: "g" },
    { itemType: "food", itemId: "milk_id", quantity: 200, unit: "ml" }
  ],
  tags: ["healthy", "fiber", "morning"]
}

// Option B: Individual entries
// (3 separate POST requests to /entries/food)
```

#### Scenario 2: Recipe-Based Family Dinner
```javascript
// User made "Spaghetti Bolognese" for family, ate 1.5 servings

POST /entries/recipe {
  itemId: "spaghetti_bolognese_recipe_id",
  servings: 1.5,
  mealType: "dinner",
  notes: "Family dinner, added extra parmesan",
  rating: 5,
  mood: "happy",
  context: {
    social: {
      sharedWith: ["spouse_id", "child1_id", "child2_id"],
      occasion: "family_dinner"
    }
  }
}
```

#### Scenario 3: Meal Prep Analysis
```javascript
// Analyze weekly consumption patterns for meal prep

// Get top consumed items
GET /stats/top-items?period=month&limit=20

// Get nutrition balance
GET /stats/balance?period=week&includeComparison=true

// Get food vs recipe breakdown
GET /dashboard/by-type?period=month

// Export for external analysis
GET /export/unified?format=csv&dateFrom=2025-07-01&dateTo=2025-07-31
```

#### Scenario 4: AI-Powered Suggestions
```javascript
// Get personalized suggestions for lunch

// Based on consumption history
GET /suggestions/foods?mealType=lunch&basedOn=history&limit=10

// Based on nutrition goals
GET /suggestions/recipes?mealType=lunch&basedOn=goals&limit=5

// Missing nutrients recommendations
POST /recommendations/missing-nutrients {
  targetNutrients: ["protein", "fiber", "iron"],
  period: "week"
}
```

### Integration Patterns

#### Frontend Integration Example
```javascript
class ConsumptionAPI {
  constructor(baseURL, authToken) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  async createEntry(entryData) {
    try {
      const response = await fetch(`${this.baseURL}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(entryData)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create entry');
      }

      return result.data;
    } catch (error) {
      console.error('Error creating consumption entry:', error);
      throw error;
    }
  }

  async getDashboard(period = 'today', options = {}) {
    const params = new URLSearchParams({ period, ...options });
    
    const response = await fetch(`${this.baseURL}/dashboard?${params}`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });

    const result = await response.json();
    return result.data;
  }

  async getTopItems(options = {}) {
    const params = new URLSearchParams(options);
    
    const response = await fetch(`${this.baseURL}/stats/top-items?${params}`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });

    const result = await response.json();
    return result.data;
  }
}

// Usage
const consumptionAPI = new ConsumptionAPI('https://api.nounou.com/v1/consumption', userToken);

// Create entry
const entry = await consumptionAPI.createEntry({
  itemType: 'food',
  itemId: 'food_id_here',
  quantity: 150,
  unit: 'g',
  mealType: 'lunch'
});

// Get dashboard data
const dashboard = await consumptionAPI.getDashboard('week', {
  includeGoals: true,
  includeInsights: true
});
```

---

## ⚠️ Error Handling

### Common Error Responses

#### Rate Limiting (429)
```json
{
  "error": "Too many consumption entries created",
  "message": "You can only create 20 consumption entries per minute with free subscription. Please try again later.",
  "retryAfter": 60,
  "subscription": "free",
  "upgradeAvailable": true
}
```

#### Validation Error (400)
```json
{
  "success": false,
  "error": "Valid positive quantity is required for food items",
  "timestamp": "2025-07-14T10:30:00.000Z"
}
```

#### Not Found (404)
```json
{
  "success": false,
  "error": "Food not found",
  "itemId": "invalid_food_id_here"
}
```

#### Subscription Required (403)
```json
{
  "success": false,
  "error": "Feature 'ai_analysis' requires premium or pro subscription",
  "currentSubscription": "free",
  "upgradeRequired": true,
  "upgradeUrl": "/subscription/upgrade"
}
```

### Subscription-Based Features

| Feature | Free | Premium | Pro |
|---------|------|---------|-----|
| Basic entry creation | ✅ | ✅ | ✅ |
| Dashboard & stats | ✅ | ✅ | ✅ |
| AI suggestions | ❌ | ✅ | ✅ |
| Advanced reports | ❌ | ✅ | ✅ |
| Data export | ❌ | ✅ | ✅ |
| Batch operations | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |

### Rate Limits by Subscription

| Operation | Free | Premium | Pro |
|-----------|------|---------|-----|
| Entry creation | 20/min | 50/min | 100/min |
| Dashboard requests | 30/min | 100/min | 200/min |
| AI analysis | 5/min | 25/min | 100/min |
| Export requests | 2/15min | 10/15min | 25/15min |

---

## 🔄 Migration Guide

### Migrating from v1.0 to v2.0

#### Step 1: Update Validation
Replace old validation calls:
```javascript
// OLD
const ValidationMiddleware = require('../middleware/validation');

// NEW  
const ValidationMiddleware = require('../middleware/consumptionValidation');
```

#### Step 2: Update API Calls
Update your frontend API calls:
```javascript
// OLD - Only supported foods
POST /consumption/food-entries {
  foodId: "123",
  quantity: 150
}

// NEW - Unified approach
POST /consumption/entries {
  itemType: "food",
  itemId: "123", 
  quantity: 150
}

// OR use specific endpoint
POST /consumption/entries/food {
  itemId: "123",
  quantity: 150
}
```

#### Step 3: Update Response Handling
Response structures have been enhanced:
```javascript
// OLD Response
{
  entry: { ... },
  calories: 245
}

// NEW Response
{
  entry: { ... },
  nutritionSummary: {
    calories: 245,
    protein: 31.2,
    confidence: 0.95
  },
  itemDetails: { ... }
}
```

#### Step 4: Leverage New Features
Take advantage of v2.0 features:
```javascript
// New analytics endpoints
GET /dashboard/by-type
GET /stats/balance
GET /reports/food-vs-recipe

// New suggestion system
GET /suggestions/foods
GET /suggestions/recipes

// Enhanced export
GET /export/unified?includeItemDetails=true
```

---

## 🚀 Quick Start Checklist

### For New Developers

#### 1. Environment Setup
- [ ] Node.js 16+ and MongoDB 5+ installed
- [ ] Repository cloned: `git clone <repo>`
- [ ] Dependencies installed: `npm install`
- [ ] Environment variables configured (see `.env.example`)
- [ ] Database connection tested

#### 2. Test Data Setup
- [ ] Create test foods: `POST /api/v1/foods` (create 3-5 foods)
- [ ] Create test recipes: `POST /api/v1/recipes` (create 2-3 recipes)
- [ ] Note the IDs for testing consumption

#### 3. Basic API Testing
- [ ] Start server: `npm run dev`
- [ ] Import Postman collection from `/docs/postman/`
- [ ] Test authentication: `POST /api/v1/users/login`
- [ ] Test basic endpoints:
  - [ ] `GET /api/v1/consumption/health`
  - [ ] `POST /api/v1/consumption/entries/food` 
  - [ ] `POST /api/v1/consumption/entries/recipe`
  - [ ] `GET /api/v1/consumption/dashboard`

#### 4. Feature Validation
- [ ] Test unified entry creation
- [ ] Verify nutrition auto-calculation
- [ ] Test analytics dashboard
- [ ] Validate error handling

#### 5. Development Ready
- [ ] Understand unified schema concept
- [ ] Know subscription-based feature restrictions
- [ ] Understand rate limiting by user type
- [ ] Ready for frontend integration

### For Frontend Integration

#### Required API Calls
1. **Authentication**: Get user token
2. **Food/Recipe validation**: Ensure items exist before consumption
3. **Entry creation**: Log consumption with proper validation
4. **Dashboard data**: Display user analytics
5. **Error handling**: Handle subscription limits and validation errors

---

## 📚 Additional Resources

- **API Reference**: [Full Swagger documentation](http://localhost:3000/api/docs)
- **Postman Collection**: [Download collection](/docs/postman/consumption-v2.json)
- **Database Schema**: [Complete model documentation](/docs/schema/consumption.md)
- **Rate Limiting Guide**: [Understanding subscription limits](/docs/rate-limits.md)
- **Migration Scripts**: [v1 to v2 migration tools](/scripts/migration/)

---

**🎉 You're now ready to use the Consumption Module v2.0! The unified system provides powerful food and recipe tracking with advanced analytics and AI-powered insights.**