# Guide de Test API Consumption - Postman

## 🚀 Configuration Initiale

### 1. Variables d'Environnement
Créez un environnement Postman avec :
```
BASE_URL = http://localhost:3000 (ou votre port)
API_VERSION = /api/v1
USER_ID = 507f1f77bcf86cd799439011 (ObjectId MongoDB valide)
FOOD_ID = 507f1f77bcf86cd799439012 (ObjectId MongoDB valide)
```

### 2. Headers Globaux
Ajoutez dans tous vos requests :
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN (si authentification activée)
```

---

## 📋 ÉTAPE 1 : Tests Basiques CRUD

### 1.1 Créer une Entrée de Consommation
**POST** `{{BASE_URL}}{{API_VERSION}}/consumption/entries`

**Body (JSON) :**
```json
{
  "user_id": "{{USER_ID}}",
  "food_id": "{{FOOD_ID}}",
  "quantity": 150.5,
  "meal_type": "breakfast",
  "consumed_at": "2025-01-08T08:30:00.000Z",
  "entry_method": "manual",
  "confidence_score": 0.95,
  "calories_calculated": 320.75,
  "protein_calculated": 15.2,
  "carbs_calculated": 45.8,
  "fat_calculated": 8.1,
  "fiber_calculated": 3.2,
  "sugar_calculated": 12.5,
  "sodium_calculated": 450.0
}
```

**Tests à vérifier :**
- Status 201 Created
- Retour de l'entry_id généré
- Timestamps created_at et updated_at
- Validation des champs obligatoires

### 1.2 Lister les Entrées
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/entries`

**Query Parameters (optionnels) :**
```
user_id={{USER_ID}}
meal_type=breakfast
page=1
limit=10
start_date=2025-01-01
end_date=2025-01-31
```

**Tests à vérifier :**
- Status 200 OK
- Pagination fonctionnelle
- Filtrage par paramètres
- Structure des données retournées

### 1.3 Obtenir une Entrée Spécifique
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/entries/:entryId`

Remplacez `:entryId` par l'ID retourné à l'étape 1.1

**Tests à vérifier :**
- Status 200 OK pour ID valide
- Status 404 pour ID inexistant
- Données complètes de l'entrée

### 1.4 Modifier une Entrée
**PUT** `{{BASE_URL}}{{API_VERSION}}/consumption/entries/:entryId`

**Body (JSON) :**
```json
{
  "quantity": 200.0,
  "meal_type": "lunch",
  "calories_calculated": 427.0
}
```

**Tests à vérifier :**
- Status 200 OK
- Mise à jour des champs modifiés
- updated_at modifié

### 1.5 Supprimer une Entrée (Soft Delete)
**DELETE** `{{BASE_URL}}{{API_VERSION}}/consumption/entries/:entryId`

**Tests à vérifier :**
- Status 200 OK
- is_deleted = true
- Entrée toujours présente en base

---

## 📊 ÉTAPE 2 : Dashboard et Statistiques

### 2.1 Dashboard Complet
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/dashboard`

**Query Parameters :**
```
user_id={{USER_ID}}
```

**Tests à vérifier :**
- Status 200 OK
- KPIs nutritionnels
- Graphiques de tendances
- Répartition des macronutriments

### 2.2 Statistiques du Jour
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/stats/today`

**Query Parameters :**
```
user_id={{USER_ID}}
```

**Tests à vérifier :**
- Calories totales du jour
- Répartition par repas
- Objectifs vs réalisé

### 2.3 Statistiques Hebdomadaires
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/stats/weekly`

**Query Parameters :**
```
user_id={{USER_ID}}
week_start=2025-01-06
```

### 2.4 Statistiques Mensuelles
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/stats/monthly`

**Query Parameters :**
```
user_id={{USER_ID}}
month=2025-01
```

### 2.5 Statistiques Personnalisées
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/stats/custom`

**Query Parameters :**
```
user_id={{USER_ID}}
start_date=2025-01-01
end_date=2025-01-31
group_by=day
```

---

## 🍎 ÉTAPE 3 : Fonctionnalités Avancées

### 3.1 Top Aliments
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/foods/top`

**Query Parameters :**
```
user_id={{USER_ID}}
limit=10
period=week
```

### 3.2 Repas Rapide
**POST** `{{BASE_URL}}{{API_VERSION}}/consumption/meals/quick`

**Body (JSON) :**
```json
{
  "user_id": "{{USER_ID}}",
  "foods": [
    {
      "food_id": "{{FOOD_ID}}",
      "quantity": 100
    },
    {
      "food_id": "507f1f77bcf86cd799439013",
      "quantity": 50
    }
  ],
  "meal_type": "dinner",
  "consumed_at": "2025-01-08T19:00:00.000Z"
}
```

### 3.3 Dupliquer une Entrée
**POST** `{{BASE_URL}}{{API_VERSION}}/consumption/entries/:entryId/duplicate`

**Body (JSON) :**
```json
{
  "consumed_at": "2025-01-09T08:30:00.000Z",
  "meal_type": "breakfast"
}
```

### 3.4 Résumé Calories du Jour
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/calories/today`

**Query Parameters :**
```
user_id={{USER_ID}}
```

---

## 📤 ÉTAPE 4 : Export et Administration

### 4.1 Export de Données
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/export`

**Query Parameters :**
```
user_id={{USER_ID}}
format=json
start_date=2025-01-01
end_date=2025-01-31
```

**Tests formats :**
- `format=json`
- `format=csv`

### 4.2 Statistiques Globales (Admin)
**GET** `{{BASE_URL}}{{API_VERSION}}/consumption/admin/stats/global`

**Tests à vérifier :**
- Accès admin uniquement
- Statistiques agrégées
- Métriques de performance

---

## 🔧 ÉTAPE 5 : Tests d'Erreurs et Limites

### 5.1 Validation des Données
Testez avec des données invalides :
```json
{
  "user_id": "invalid_id",
  "quantity": -50,
  "meal_type": "invalid_meal",
  "consumed_at": "invalid_date"
}
```

### 5.2 Rate Limiting
Testez les limites configurées :
- Création d'entrées : 30/minute
- Export de données : 5/15 minutes
- Dashboard : 60/minute

### 5.3 Gestion d'Erreurs
- Status 400 pour données invalides
- Status 404 pour ressources inexistantes
- Status 429 pour rate limiting
- Status 500 pour erreurs serveur

---

## 📝 Checklist de Validation

### ✅ Fonctionnalités de Base
- [ ] Création d'entrées
- [ ] Lecture d'entrées (liste et détail)
- [ ] Modification d'entrées
- [ ] Suppression (soft delete)
- [ ] Pagination fonctionnelle

### ✅ Dashboard et Analytics
- [ ] Dashboard complet
- [ ] Statistiques temporelles
- [ ] Calculs nutritionnels corrects
- [ ] Filtres et agrégations

### ✅ Fonctionnalités Avancées
- [ ] Repas rapides
- [ ] Duplication d'entrées
- [ ] Top aliments
- [ ] Export de données

### ✅ Sécurité et Performance
- [ ] Validation des données
- [ ] Rate limiting
- [ ] Gestion d'erreurs
- [ ] Authentification (si activée)

### ✅ Compatibilité MongoDB
- [ ] ObjectIds valides
- [ ] Requêtes optimisées
- [ ] Indexes fonctionnels
- [ ] Agrégations MongoDB

---

## 🐛 Debugging

### Logs à Surveiller
```bash
# Logs API
tail -f logs/api.log

# Logs MongoDB
tail -f logs/mongodb.log

# Logs d'erreurs
tail -f logs/error.log
```

### Vérification MongoDB
```javascript
// Connexion MongoDB
use nounou_consumption;

// Vérifier les entrées créées
db.consumption_entries.find().pretty();

// Vérifier les indexes
db.consumption_entries.getIndexes();
```

---

**🎯 Ordre de Test Recommandé :**
1. Configuration et variables
2. CRUD basique (créer → lire → modifier → supprimer)
3. Dashboard et statistiques
4. Fonctionnalités avancées
5. Tests d'erreurs et limites
6. Performance et rate limiting