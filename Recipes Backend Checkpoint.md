# 🚀 Module Recipes - Récapitulatif d'Installation

## ✅ Fichiers Créés

### 📁 Modèles (src/models/)
1. **recipeModel.js** - Modèle principal des recettes
2. **recipeCategoryModel.js** - Catégories hiérarchiques
3. **recipeIngredientModel.js** - Ingrédients avec calculs nutritionnels
4. **recipeInstructionModel.js** - Instructions étape par étape
5. **recipeImageModel.js** - Images des recettes (préparé pour le futur)

### 🔧 Services (src/services/)
1. **recipeService.js** - Logique métier principale
2. **recipeCategoryService.js** - Gestion des catégories

### 🎛️ Contrôleurs (src/controllers/)
1. **recipeController.js** - Endpoints des recettes
2. **recipeCategoryController.js** - Endpoints des catégories

### 🛣️ Routes (src/routes/)
1. **recipeRoutes.js** - Définition complète des routes

### 🌱 Seeds & Test Data (src/seeds/)
1. **recipeCategoriesSeeds.js** - Catégories par défaut
2. **recipeTestData.js** - Données de test

### 📚 Documentation
1. **Documentation complète** - Guide d'utilisation et exemples

## 🔗 Intégration dans l'App

### 1. Ajouter les routes dans app.js
```javascript
// Dans src/app.js, ajouter cette ligne avec les autres routes :
const recipeRoutes = require('./routes/recipeRoutes');
app.use(`/api/${API_VERSION}/recipes`, recipeRoutes);
```

### 2. Structure finale du projet
```
nounou-backend/
├── src/
│   ├── models/
│   │   ├── recipeModel.js                    ✨ NOUVEAU
│   │   ├── recipeCategoryModel.js            ✨ NOUVEAU
│   │   ├── recipeIngredientModel.js          ✨ NOUVEAU
│   │   ├── recipeInstructionModel.js         ✨ NOUVEAU
│   │   ├── recipeImageModel.js               ✨ NOUVEAU
│   │   ├── foodModel.js                      ✅ EXISTANT
│   │   └── ...autres modèles existants
│   ├── services/
│   │   ├── recipeService.js                  ✨ NOUVEAU
│   │   ├── recipeCategoryService.js          ✨ NOUVEAU
│   │   ├── foodService.js                    ✅ EXISTANT
│   │   └── ...autres services existants
│   ├── controllers/
│   │   ├── recipeController.js               ✨ NOUVEAU
│   │   ├── recipeCategoryController.js       ✨ NOUVEAU
│   │   ├── foodController.js                 ✅ EXISTANT
│   │   └── ...autres contrôleurs existants
│   ├── routes/
│   │   ├── recipeRoutes.js                   ✨ NOUVEAU
│   │   ├── foodRoutes.js                     ✅ EXISTANT
│   │   └── ...autres routes existantes
│   └── seeds/                                ✨ NOUVEAU DOSSIER
│       ├── recipeCategoriesSeeds.js
│       └── recipeTestData.js
```

## 🎯 Étapes d'Installation

### Étape 1: Créer les fichiers
Copier tous les fichiers créés dans leurs dossiers respectifs selon l'arborescence ci-dessus.

### Étape 2: Ajouter les routes
```javascript
// Dans src/app.js
const recipeRoutes = require('./routes/recipeRoutes');

// Avec les autres routes existantes :
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/consumption`, consumptionRoutes);
app.use(`/api/${API_VERSION}/foods`, foodRoutes);
app.use(`/api/${API_VERSION}/recipes`, recipeRoutes);  // ✨ NOUVEAU
```

### Étape 3: Initialiser les catégories
```bash
# Depuis la racine du projet
node src/seeds/recipeCategoriesSeeds.js seed
```

### Étape 4: Créer des recettes de test (optionnel)
```bash
# Remplacer USER_ID par un ID utilisateur existant
node src/seeds/recipeTestData.js seed USER_ID
```

### Étape 5: Tester l'API
Utiliser Postman avec les variables :
```javascript
{
  "baseUrl": "http://localhost:3000/api/v1",
  "accessToken": "votre_token_jwt",
  "userId": "votre_user_id"
}
```

## 🧪 Tests de Base

### 1. Vérifier les catégories
```http
GET {{baseUrl}}/recipes/categories
```

### 2. Créer une recette simple
```http
POST {{baseUrl}}/recipes
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "Test Recette",
  "description": "Une recette de test",
  "servings": 2,
  "difficulty_level": "easy",
  "is_public": true
}
```

### 3. Lister les recettes
```http
GET {{baseUrl}}/recipes
```

### 4. Rechercher des recettes
```http
GET {{baseUrl}}/recipes/search?q=test
```

## 🔄 Relations avec les Modules Existants

### Avec le module Foods
- **RecipeIngredient.food_id** → **Food._id**
- Calculs nutritionnels automatiques depuis NutritionalValues
- Conversion d'unités basée sur Food.serving_size_g

### Avec le module Consumption  
- Les recettes peuvent être utilisées dans le tracking de consommation
- **consumption_entries.entry_method** peut être "recipe"
- Possibilité future d'ajouter **recipe_id** dans consumption_entries

### Avec le module Users
- **Recipe.created_by** → **User.id**
- Authentification JWT pour toutes les modifications
- Permissions basées sur la propriété des recettes

## 📊 Collections MongoDB Créées

Le module va créer ces nouvelles collections :
- `recipes` - Recettes principales
- `recipe_categories` - Catégories hiérarchiques  
- `recipe_ingredients` - Ingrédients des recettes
- `recipe_instructions` - Instructions étape par étape
- `recipe_images` - Images (préparé pour le futur)

## 🎁 Fonctionnalités Prêtes

### ✅ Disponibles immédiatement
- CRUD complet des recettes
- Système de catégories hiérarchiques
- Gestion des ingrédients avec nutrition
- Instructions étape par étape
- Recherche et filtres avancés
- Authentification et permissions
- Recettes publiques/privées
- Calculs nutritionnels automatiques

### 🔮 Préparées pour le futur
- Gestion d'images (modèle créé)
- Système de favoris (routes commentées)
- Évaluations et notes (structure prête)
- Import/export de recettes
- Partage de recettes
- Conversion d'unités avancée

## 🚨 Points d'Attention

1. **Ordre des routes** : Les routes spécifiques sont placées AVANT les routes avec paramètres
2. **Authentification** : Toutes les modifications nécessitent un token JWT valide
3. **Références** : Utilise `_id` MongoDB (pas les UUID custom)
4. **Validation** : Validation basique intégrée, extensible avec express-validator
5. **Performance** : Index MongoDB créés pour les recherches fréquentes

## 🎉 Résultat Final

Après installation, votre API Nounou aura :

```
Base URL: /api/v1/recipes

📝 Recettes:
GET    /                           # Lister recettes
POST   /                           # Créer recette
GET    /:id                        # Détails recette  
PUT    /:id                        # Modifier recette
DELETE /:id                        # Supprimer recette
POST   /complete                   # Créer recette complète

🔍 Recherche:
GET    /search                     # Recherche publique
GET    /my-recipes                 # Mes recettes
GET    /public                     # Recettes publiques

📂 Catégories:
GET    /categories                 # Lister catégories
POST   /categories                 # Créer catégorie
GET    /categories/:id             # Détails catégorie
PUT    /categories/:id             # Modifier catégorie
DELETE /categories/:id             # Supprimer catégorie

🥕 Ingrédients:
GET    /:id/ingredients            # Lister ingrédients
POST   /:id/ingredients            # Ajouter ingrédient
PUT    /ingredients/:id            # Modifier ingrédient
DELETE /ingredients/:id            # Supprimer ingrédient

📋 Instructions:
POST   /:id/instructions           # Ajouter instruction
PUT    /instructions/:id           # Modifier instruction
DELETE /instructions/:id           # Supprimer instruction

📊 Analytics:
GET    /:id/nutrition              # Valeurs nutritionnelles
```

**Le module Recipes est maintenant 100% opérationnel et s'intègre parfaitement avec l'architecture existante de Nounou ! 🎊**