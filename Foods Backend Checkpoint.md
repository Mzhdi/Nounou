# 🍎 Documentation Complète - Backend Foods API

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Modèles de Données](#modèles-de-données)
4. [Structure des Fichiers](#structure-des-fichiers)
5. [APIs Disponibles](#apis-disponibles)
6. [Guide d'Utilisation](#guide-dutilisation)
7. [Exemples Pratiques](#exemples-pratiques)
8. [Points Techniques](#points-techniques)

---

## 🎯 Vue d'Ensemble

Le module **Foods** est un système complet de gestion d'aliments pour l'application mobile de nutrition "Nounou". Il permet de :

- **Gérer les aliments** avec leurs informations nutritionnelles complètes
- **Organiser par catégories** hiérarchiques 
- **Rechercher** par texte, code-barres, filtres
- **Gérer les allergènes** et images
- **Intégrer** avec le module Consumption pour le tracking nutritionnel

### Technologies Utilisées
- **Backend** : Node.js + Express.js
- **Base de Données** : MongoDB + Mongoose
- **Architecture** : MVC (Model-View-Controller)
- **Authentification** : JWT Bearer Token
- **Validation** : Validation manuelle (prêt pour express-validator)

---

## 🏗️ Architecture

### Pattern MVC
```
📁 src/
├── 📁 models/          # Modèles MongoDB (Mongoose)
├── 📁 controllers/     # Logique de contrôle des routes
├── 📁 services/        # Logique métier et accès aux données
├── 📁 routes/          # Définition des endpoints API
└── 📁 middleware/      # Authentification et validation
```

### Flux de Données
```
Client Request → Routes → Middleware → Controller → Service → Model → MongoDB
```

---

## 🗄️ Modèles de Données

### 1. **Foods** (Collection principale)
```javascript
{
  _id: ObjectId,                    // ID MongoDB (utilisé comme référence)
  food_id: String (UUID),          // ID custom (legacy, pas utilisé)
  name: String (required),         // "Pomme Rouge"
  brand: String,                   // "Bio Local"
  category_id: String (required),  // Référence vers FoodCategory
  food_type: Enum,                 // "product" | "ingredient" | "recipe" | "composite"
  serving_size_g: Decimal128,      // 150 (grammes)
  serving_description: String,     // "1 pomme moyenne"
  barcode: String (unique),        // "1234567890123"
  is_verified: Boolean,            // false
  verification_source: String,     // "manuel"
  nutri_score: Enum,              // "A" | "B" | "C" | "D" | "E"
  nova_group: Number (1-4),       // 1
  ecoscore: Enum,                 // "A" | "B" | "C" | "D" | "E"
  created_by: String,             // User ID
  created_at: Date,
  updated_at: Date
}
```

### 2. **Food Categories** (Hiérarchie)
```javascript
{
  _id: ObjectId,
  category_id: String (UUID),
  parent_id: String,              // null pour racine
  name: String (required),        // "Fruits"
  slug: String (unique),          // "fruits"
  level: Number (0-5),           // 0 = racine
  path: String,                  // "/fruits" ou "/fruits/citrus"
  is_active: Boolean,            // true
  created_at: Date,
  updated_at: Date
}
```

### 3. **Nutritional Values** (Valeurs nutritionnelles)
```javascript
{
  _id: ObjectId,
  nutrition_id: String (UUID),
  food_id: String (référence vers Food._id),
  per_100g: Boolean,             // true
  calories: Decimal128,          // 52
  protein_g: Decimal128,         // 0.3
  carbohydrates_g: Decimal128,   // 14
  sugars_g: Decimal128,          // 10
  fat_g: Decimal128,             // 0.2
  saturated_fat_g: Decimal128,   // 0.1
  fiber_g: Decimal128,           // 2.4
  sodium_mg: Decimal128,         // 1
  calcium_mg: Decimal128,        // 6
  iron_mg: Decimal128,           // 0.12
  vitamin_c_mg: Decimal128,      // 4.6
  vitamin_d_ug: Decimal128,      // 0
  source: String,                // "CIQUAL"
  confidence_score: Decimal128,  // 0.95
  created_at: Date,
  updated_at: Date
}
```

### 4. **Food Allergens** (Allergènes)
```javascript
{
  _id: ObjectId,
  food_id: String (référence vers Food._id),
  allergen: Enum,                // "gluten" | "milk" | "eggs" | "nuts" | etc.
  presence: Enum                 // "contains" | "may_contain" | "free"
}
```

### 5. **Food Images** (Images)
```javascript
{
  _id: ObjectId,
  image_id: String (UUID),
  food_id: String (référence vers Food._id),
  image_url: String,             // URL de l'image
  image_type: Enum,              // "product" | "ingredients" | "nutrition_label" | "package"
  is_primary: Boolean,           // true pour image principale
  width: Number,
  height: Number,
  file_size: Number,
  uploaded_by: String,           // User ID
  created_at: Date,
  updated_at: Date
}
```

---

## 📁 Structure des Fichiers

```
src/
├── models/
│   ├── foodModel.js                    # Modèle principal des aliments
│   ├── foodCategoryModel.js            # Catégories hiérarchiques
│   ├── nutritionalValueModel.js        # Valeurs nutritionnelles
│   ├── foodAllergenModel.js           # Allergènes des aliments
│   └── foodImageModel.js              # Images des aliments
│
├── controllers/
│   ├── foodController.js              # CRUD aliments + recherche
│   └── categoryController.js          # CRUD catégories + arbre
│
├── services/
│   ├── foodService.js                 # Logique métier aliments
│   └── categoryService.js             # Logique métier catégories
│
├── routes/
│   └── foodRoutes.js                  # Toutes les routes foods
│
└── middleware/
    └── auth.js                        # Authentification JWT
```

---

## 🌐 APIs Disponibles

### Base URL
```
http://localhost:3000/api/v1/foods
```

### 🏷️ **CATÉGORIES**

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/categories` | ✅ | Créer une catégorie |
| `GET` | `/categories` | ❌ | Lister les catégories |
| `GET` | `/categories/tree` | ❌ | Arbre hiérarchique |
| `GET` | `/categories/:categoryId` | ❌ | Détails d'une catégorie |
| `PUT` | `/categories/:categoryId` | ✅ | Modifier une catégorie |

### 🍎 **ALIMENTS**

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/` | ✅ | Créer un aliment complet |
| `GET` | `/` | ❌ | Lister les aliments (filtres, pagination) |
| `GET` | `/:foodId` | ❌ | Détails d'un aliment |
| `PUT` | `/:foodId` | ✅ | Modifier un aliment |
| `DELETE` | `/:foodId` | ✅ | Supprimer (soft delete) |

### 🔍 **RECHERCHE**

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/search` | ❌ | Recherche textuelle |
| `GET` | `/barcode/:barcode` | ❌ | Recherche par code-barres |

### 🧪 **DEBUG**

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/test` | ❌ | Diagnostic de connexion |
| `GET` | `/debug/:foodId` | ❌ | Debug recherche aliment |

---

## 📖 Guide d'Utilisation

### 1. **Authentification**

Les routes protégées nécessitent un token JWT :
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. **Workflow Typique**

#### Étape 1 : Créer des Catégories
```http
POST /api/v1/foods/categories
Content-Type: application/json
Authorization: Bearer TOKEN

{
  "name": "Fruits",
  "level": 0
}
```

#### Étape 2 : Créer un Aliment
```http
POST /api/v1/foods
Content-Type: application/json
Authorization: Bearer TOKEN

{
  "food": {
    "name": "Pomme Rouge",
    "category_id": "CATEGORY_ID",
    "food_type": "product",
    "serving_size_g": 150
  },
  "nutritional_values": {
    "calories": 52,
    "protein_g": 0.3,
    "carbohydrates_g": 14
  }
}
```

#### Étape 3 : Rechercher
```http
GET /api/v1/foods/search?q=pomme&limit=10
GET /api/v1/foods?category_id=CATEGORY_ID&page=1&limit=20
```

### 3. **Paramètres de Filtrage**

#### Lister les Aliments
```http
GET /api/v1/foods?search=pomme&category_id=ID&food_type=product&is_verified=true&page=1&limit=20&sort=name
```

#### Détails avec Inclusions
```http
GET /api/v1/foods/FOOD_ID?include_nutrition=true&include_images=true&include_allergens=true
```

---

## 💡 Exemples Pratiques

### Créer un Aliment Complet
```json
{
  "food": {
    "name": "Yaourt Grec Nature",
    "brand": "Danone",
    "category_id": "686ea2df0054e2a44fa55d1b",
    "food_type": "product",
    "serving_size_g": 125,
    "serving_description": "1 pot",
    "barcode": "3033710074617",
    "is_verified": true,
    "verification_source": "fabricant",
    "nutri_score": "B",
    "nova_group": 3
  },
  "nutritional_values": {
    "per_100g": true,
    "calories": 97,
    "protein_g": 9,
    "carbohydrates_g": 4,
    "sugars_g": 4,
    "fat_g": 5,
    "saturated_fat_g": 3.2,
    "fiber_g": 0,
    "sodium_mg": 46,
    "calcium_mg": 150,
    "source": "Étiquette produit",
    "confidence_score": 1.0
  },
  "allergens": [
    {
      "allergen": "milk",
      "presence": "contains"
    }
  ],
  "images": [
    {
      "image_url": "https://example.com/yaourt.jpg",
      "image_type": "product",
      "is_primary": true,
      "width": 800,
      "height": 600
    }
  ]
}
```

### Recherche Avancée
```http
# Recherche textuelle
GET /api/v1/foods/search?q=yaourt+grec&limit=5

# Filtrage par catégorie et type
GET /api/v1/foods?category_id=DAIRY_CATEGORY&food_type=product&is_verified=true

# Pagination
GET /api/v1/foods?page=2&limit=10&sort=created_at
```

### Réponses Types

#### Succès - Liste d'Aliments
```json
{
  "success": true,
  "data": {
    "foods": [
      {
        "_id": "686ea2df0054e2a44fa55d1b",
        "name": "Pomme Rouge",
        "brand": "Bio Local",
        "category_id": "category_123",
        "food_type": "product",
        "serving_size_g": "150",
        "created_at": "2025-01-08T..."
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 1,
      "items_per_page": 20
    }
  }
}
```

#### Succès - Détails Complets
```json
{
  "success": true,
  "data": {
    "_id": "686ea2df0054e2a44fa55d1b",
    "name": "Pomme Rouge",
    "nutritional_values": {
      "calories": "52",
      "protein_g": "0.3"
    },
    "allergens": [],
    "images": []
  }
}
```

#### Erreur
```json
{
  "success": false,
  "message": "Aliment non trouvé"
}
```

---

## ⚙️ Points Techniques

### 1. **Important : Utilisation des IDs**

⚠️ **CRITIQUE** : Le système utilise `_id` MongoDB, **PAS** `food_id` custom !

```javascript
// ✅ CORRECT
Food.findById(foodId)

// ❌ INCORRECT  
Food.findOne({ food_id: foodId })
```

### 2. **Relations entre Collections**

- **Foods** ↔ **Categories** : `food.category_id` → `category._id`
- **Foods** ↔ **Nutrition** : `nutrition.food_id` → `food._id` 
- **Foods** ↔ **Allergens** : `allergen.food_id` → `food._id`
- **Foods** ↔ **Images** : `image.food_id` → `food._id`

### 3. **Ordre des Routes**

**CRITIQUE** : L'ordre des routes dans `foodRoutes.js` est important !

```javascript
// ✅ CORRECT - Spécifiques en premier
router.get('/search', ...);
router.get('/categories', ...);
router.get('/:foodId', ...);  // Générique à la fin

// ❌ INCORRECT - Générique en premier
router.get('/:foodId', ...);  // Capture tout !
router.get('/categories', ...); // Jamais atteint
```

### 4. **Authentification**

```javascript
// Routes publiques (lecture)
router.get('/categories', categoryController.getCategories);

// Routes protégées (modification)
router.post('/categories', AuthMiddleware.authenticate, categoryController.createCategory);
```

### 5. **Gestion d'Erreurs**

```javascript
// Standard de réponse
{
  "success": true/false,
  "message": "Description",
  "data": {...} // Si succès
}
```

### 6. **Performance**

- **Pagination** : Limite max 100 items par page
- **Index MongoDB** : Sur `name`, `category_id`, `barcode`
- **Search** : Index texte sur `name` et `brand`
- **Lean queries** : `.lean()` pour les listes

### 7. **Validation**

```javascript
// Validation basique actuelle
if (!req.body.name) {
  return res.status(400).json({
    success: false,
    message: 'Le nom est requis'
  });
}

// Prêt pour express-validator
const { validationResult } = require('express-validator');
const errors = validationResult(req);
```

---

## 🚀 Démarrage Rapide

### 1. **Installation**
```bash
npm install uuid express-validator mongoose
```

### 2. **Variables d'Environnement Postman**
```
baseUrl = http://localhost:3000/api/v1
accessToken = YOUR_JWT_TOKEN
categoryId = (sera défini après création)
foodId = (sera défini après création)
```

### 3. **Séquence de Test**
1. `GET /health` - Vérifier l'API
2. `POST /foods/categories` - Créer catégorie
3. `GET /foods/categories` - Lister catégories
4. `POST /foods` - Créer aliment
5. `GET /foods` - Lister aliments
6. `GET /foods/:id` - Détails aliment

### 4. **Debug en Cas de Problème**
```http
GET /api/v1/foods/test
GET /api/v1/foods/debug/FOOD_ID
```

---

## 🔗 Intégration avec Consumption

Le module Foods s'intègre avec le module Consumption :

```javascript
// Consumption utilise les _id des Foods
{
  "user_id": "user123",
  "food_id": "686ea2df0054e2a44fa55d1b",  // Référence vers Food._id
  "quantity": 150,
  "meal_type": "breakfast"
}
```

---

## 📞 Support

Pour tout problème :
1. Vérifiez les logs serveur
2. Utilisez les routes de debug
3. Vérifiez l'ordre des routes
4. Confirmez l'utilisation des `_id` MongoDB

**Le système Foods est maintenant complet et prêt pour la production ! 🎉**