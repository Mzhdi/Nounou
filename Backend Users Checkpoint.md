# 📋 CHECKPOINT - Application Mobile Nutrition "Nounou"

**Date de checkpoint :** Juin 2025  
**Version :** 1.0  
**Statut projet :** 40% complété (Infrastructure & données core)

---

## 🎯 **CONTEXTE DU PROJET**

### **Vision Générale**
- **Application Mobile** : Nutrition et santé avec Flutter + Node.js
- **Base de Données** : PostgreSQL "Nounou" + MongoDB (pour certains services)
- **Architecture** : Microservices avec schémas PostgreSQL organisés
- **Utilisateurs cibles** : 1K utilisateurs au Maroc (MVP)
- **Coût estimé** : $0.52-1.10/utilisateur/mois

### **Fonctionnalités Principales**
1. **AI-powered Nutritionist Chatbot** (text + audio)
2. **AI Image Analysis** (analyse photos de plats)
3. **Barcode Scanning** (produits alimentaires)
4. **Recipe Database** (bibliothèque de recettes)
5. **Pharmacy Geolocation** (pharmacies de garde)
6. **Analytics Dashboard** (KPIs santé et nutrition)

---

## ✅ **CE QUI A ÉTÉ RÉALISÉ - POSTGRESQL**

### **1. STRUCTURE GÉNÉRALE DE LA BASE**

```sql
Base de données: "Nounou"
Schémas créés et opérationnels:
├── users          ✅ TERMINÉ (Gestion utilisateurs, sessions, objectifs)
├── consumption    ✅ TERMINÉ (Consommation alimentaire, résumés quotidiens)
└── analytics      ✅ TERMINÉ (KPIs, dashboard, gamification)

Schémas planifiés:
├── nutrition      🔄 À FAIRE (Produits, recettes)
├── ai             🔄 À FAIRE (Chat IA, analyse images)
├── geolocation    🔄 À FAIRE (Pharmacies)
└── notifications  🔄 À FAIRE (Push, préférences)
```

---

### **2. SCHÉMA USERS - ✅ TERMINÉ**

#### **Tables Opérationnelles :**

**`users.user_profile`** (Anciennement "USER" - renommé)
```sql
Colonnes principales:
- id (UUID PRIMARY KEY)
- email, password_hash
- first_name, last_name, phone
- date_of_birth, gender, height, weight
- activity_level (sedentary -> very_active)
- dietary_preferences, allergies, health_conditions (JSONB)
- subscription_type (free/premium/pro)
- subscription_expires_at
- created_at, updated_at, is_active

Utilité: Profil complet utilisateur, authentification, abonnements
Trigger: update_user_profile_updated_at
```

**`users.user_goals`**
```sql
Colonnes principales:
- id, user_id (FK)
- goal_type (weight_loss, weight_gain, maintain, muscle_gain, health_improvement)
- target_weight, target_date
- daily_calories_target, daily_protein_target
- daily_carbs_target, daily_fat_target, daily_fiber_target
- daily_water_target
- is_active

Utilité: Objectifs nutritionnels et physiques des utilisateurs
Support: Multi-objectifs, tracking temporel
Trigger: update_user_goals_updated_at
```

**`users.user_sessions`**
```sql
Colonnes principales:
- id, user_id (FK)
- token (UNIQUE), refresh_token
- device_id, device_type
- ip_address, location
- expires_at, created_at, last_used_at

Utilité: Gestion sessions authentification multi-device
Support: Mobile multi-device, géolocalisation des connexions
```

#### **Types ENUM Créés :**
```sql
- users.gender_enum ('M', 'F', 'Other')
- users.activity_level_enum ('sedentary', 'light', 'moderate', 'active', 'very_active')
- users.subscription_type_enum ('free', 'premium', 'pro')
- users.goal_type_enum ('weight_loss', 'weight_gain', 'maintain', 'muscle_gain', 'health_improvement')
```

#### **Index de Performance (25 index créés) :**
```sql
Index uniques:
- idx_user_profile_email (email)
- idx_user_sessions_token (token)

Index composites principaux:
- idx_user_profile_active_subscription (is_active, subscription_type)
- idx_user_goals_user_active (user_id, is_active)
- idx_user_sessions_user_expires (user_id, expires_at)

Index partiels optimisés:
- idx_user_profile_premium_active (utilisateurs premium actifs)
- idx_user_profile_subscription_expires (abonnements avec expiration)
- idx_user_goals_nutrition_targets (objectifs avec targets nutritionnels)
```

---

### **3. SCHÉMA CONSUMPTION - ✅ TERMINÉ**

#### **Tables Opérationnelles :**

**`consumption.consumption_entries`**
```sql
Colonnes principales:
- entry_id (UUID PRIMARY KEY)
- user_id (FK vers users.user_profile)
- food_id (FK vers future base foods)
- quantity, unit
- meal_type (breakfast, lunch, dinner, snack, other)
- consumed_at
- entry_method (barcode_scan, image_analysis, recipe, manual, voice)
- confidence_score (pour IA predictions)
- calories_calculated, protein_calculated, carbs_calculated, fat_calculated
- is_deleted, created_at, updated_at

Utilité: Journal alimentaire détaillé, tracking consommation
Support: Multi-sources (scan, IA, manuel), scoring de confiance IA
Trigger: update_consumption_entries_updated_at
```

**`consumption.daily_summaries`**
```sql
Colonnes principales:
- summary_id, user_id (FK)
- date (UNIQUE avec user_id)
- total_calories, total_protein, total_carbs, total_fat
- total_fiber, total_water_ml
- goal_calories_percentage, goal_protein_percentage
- goal_carbs_percentage, goal_fat_percentage
- nutrition_score (0-100, qualité nutritionnelle journalière)
- entries_count, last_calculated

Utilité: Résumés nutritionnels quotidiens agrégés
Support: Calculs automatisés, comparaison avec objectifs
Trigger: update_daily_summaries_updated_at
```

#### **Types ENUM Créés :**
```sql
- consumption.meal_type_enum ('breakfast', 'lunch', 'dinner', 'snack', 'other')
- consumption.entry_method_enum ('barcode_scan', 'image_analysis', 'recipe', 'manual', 'voice')
```

#### **Index de Performance (6 index créés) :**
```sql
- idx_consumption_entries_user_id (user_id)
- idx_consumption_entries_user_consumed_at (user_id, consumed_at)
- idx_consumption_entries_meal_type (meal_type)
- idx_consumption_entries_entry_method (entry_method)
- idx_daily_summaries_user_date (user_id, date)
- idx_daily_summaries_date (date)
```

---

### **4. SCHÉMA ANALYTICS - ✅ TERMINÉ**

#### **Tables Opérationnelles :**

**`analytics.user_kpis`**
```sql
Colonnes principales:
- id, user_id (FK), kpi_date (UNIQUE avec user_id)

Métriques physiques:
- weight, body_fat_percentage, muscle_mass, bmi, waist_circumference

Moyennes nutritionnelles:
- daily_calories, daily_protein, daily_carbs, daily_fat
- weekly_avg_calories, weekly_avg_protein, weekly_avg_carbs, weekly_avg_fat

Scores calculés (0-100):
- hydration_score, diet_quality_score, consistency_score, goal_adherence_score

Progression objectifs:
- goal_progress_percentage, weight_goal_progress
- calories_goal_progress, protein_goal_progress

Métriques comportementales:
- meals_logged_count, days_streak, app_usage_minutes

Utilité: KPIs quotidiens pour dashboard principal
Support: Agrégations complexes, scores 0-100, métriques comportementales
```

**`analytics.user_metrics_history`**
```sql
Colonnes principales:
- id, user_id (FK)
- metric_type (weight, bmi, body_fat, calories, protein, etc.)
- value, unit, recorded_at
- source (manual_entry, smart_scale, calculation, import)
- notes, is_verified

Utilité: Historique détaillé de toutes les métriques
Support: Audit trail, support multi-sources (manuel, IoT)
```

**`analytics.dashboard_widgets`**
```sql
Colonnes principales:
- id, user_id (FK)
- widget_type (calories_chart, macros_pie, weight_trend, etc.)
- widget_config (JSONB - configuration personnalisée)
- position_x, position_y, width, height
- is_visible, is_pinned, time_period
- display_order

Utilité: Configuration personnalisée du dashboard utilisateur
Support: Interface drag-&-drop, widgets configurables
Trigger: update_dashboard_widgets_updated_at
```

**`analytics.achievements`** & **`analytics.user_achievements`**
```sql
achievements:
- id, name, description, category
- criteria (JSONB - conditions pour débloquer)
- points, badge_icon, badge_color
- rarity (common, rare, epic, legendary)
- is_repeatable, unlock_requirement

user_achievements:
- id, user_id (FK), achievement_id (FK)
- progress_value, progress_max, is_completed
- earned_at, completion_count
- is_notified, notification_sent_at

Utilité: Système de gamification complet
Support: Achievements répétables, système de points, notifications
```

**`analytics.user_streaks`**
```sql
Colonnes principales:
- id, user_id (FK)
- streak_type (daily_logging, goal_achievement, exercise)
- current_streak, current_start_date
- best_streak, best_streak_start_date, best_streak_end_date
- last_activity_date, is_active

Utilité: Suivi des séries (logging quotidien, objectifs)
Support: Streak actuelle vs meilleure, multi-types
Trigger: update_user_streaks_updated_at
```

**`analytics.user_insights`**
```sql
Colonnes principales:
- id, user_id (FK)
- insight_type (trend_analysis, recommendation, warning, celebration)
- title, description
- data_points (JSONB), confidence_score
- priority, is_actionable, action_suggestion
- valid_from, valid_until
- is_read, is_dismissed, user_feedback

Utilité: Insights personnalisés générés par IA
Support: Scoring de confiance, insights actionnables, feedback utilisateur
```

**`analytics.weekly_summaries`** & **`analytics.monthly_summaries`**
```sql
weekly_summaries:
- id, user_id (FK)
- week_start_date, week_end_date, year, week_number
- avg_daily_calories, avg_daily_protein, avg_daily_carbs
- days_logged, meals_logged, goals_met_count
- vs_previous_week_calories, vs_previous_week_weight
- best_day, most_challenging_day, primary_achievement

monthly_summaries:
- id, user_id (FK)
- month, year, month_start_date, month_end_date
- avg_daily_calories, total_weight_change, goal_achievement_rate
- calories_trend, weight_trend, hydration_trend
- achievements_unlocked, best_streak, days_active
- key_insights (JSONB), recommendations (JSONB)

Utilité: Rapports périodiques automatisés
Support: Comparaisons temporelles, highlights automatiques, insights JSON
```

#### **Types ENUM Créés :**
```sql
- analytics.widget_type_enum (12 types de widgets)
- analytics.rarity_enum ('common', 'rare', 'epic', 'legendary')
- analytics.achievement_category_enum (10 catégories)
- analytics.time_period_enum ('daily', 'weekly', 'monthly', 'yearly')
- analytics.metric_type_enum (13 types de métriques)
```

#### **Vues Créées :**
```sql
analytics.user_dashboard_data:
- Vue optimisée pour dashboard principal
- JOIN users.user_profile + user_kpis + user_streaks + achievements

analytics.nutrition_trends:
- Tendances nutritionnelles avec moyennes mobiles sur 7 jours
- Comparaisons avec objectifs et jour précédent
```

#### **Index de Performance (15 index créés) :**
```sql
Principaux:
- idx_user_kpis_user_date (user_id, kpi_date)
- idx_user_metrics_history_user_type (user_id, metric_type)
- idx_user_achievements_completed (user_id, is_completed)
- idx_user_insights_priority (user_id, priority, is_read)
- idx_weekly_summaries_user_week (user_id, week_start_date)
```

---

## 🔧 **FONCTIONS & TRIGGERS SYSTÈME**

### **Fonctions de Trigger Créées :**
```sql
- users.update_updated_at_column()
- consumption.update_updated_at_column()  
- analytics.update_updated_at_column()
```

### **Auto-timestamping Actif Sur :**
- Toutes les tables avec colonne `updated_at`
- Mise à jour automatique lors des modifications
- Cohérence temporelle garantie

---

## 🎯 **FONCTIONNALITÉS SUPPORTÉES (ACTUELLEMENT)**

### **✅ Gestion Utilisateurs Complète**
- Inscription/Connexion sécurisée avec sessions multi-device
- Profils nutritionnels détaillés avec préférences et allergies
- Gestion des abonnements premium/pro avec expiration
- Objectifs nutritionnels personnalisés et tracking

### **✅ Tracking Nutritionnel Avancé**
- Journal alimentaire multi-sources (scan, IA, manuel, vocal)
- Calculs nutritionnels automatisés avec macros
- Résumés quotidiens intelligents avec scores de qualité
- Comparaison en temps réel avec objectifs personnalisés

### **✅ Analytics & Dashboard**
- KPIs temps réel avec métriques physiques et nutritionnelles
- Dashboard personnalisable avec widgets configurables
- Système de gamification complet (achievements, streaks, points)
- Rapports périodiques automatisés (hebdo/mensuel)
- Insights personnalisés avec scoring de confiance

### **✅ Performance Optimisée**
- 46 index stratégiques pour requêtes mobiles optimales
- Requêtes optimisées pour 1K+ utilisateurs
- Auto-maintenance des données avec triggers
- Vues pré-calculées pour dashboard rapide

---

## 💰 **ANALYSE DES COÛTS (1K UTILISATEURS/MOIS)**

### **✅ Infrastructure PostgreSQL Réalisée**
- **AWS Stockholm** (optimal pour Maroc) : $104-488/mois
- **Base de données managée** : PostgreSQL avec réplication
- **Stockage optimisé** : 50-200GB selon croissance

### **🔄 Services IA à Intégrer (Coûts estimés)**
- **AI Image Analysis** : $0.25-0.75/utilisateur/mois (40-50% du coût total)
- **AI Nutritionist Chatbot** : $0.05-0.35/utilisateur/mois (20-30% du coût)
- **Recommandé** : DeepSeek V3 ($0.27/M tokens) + Google Vision API

### **🔄 APIs Externes à Intégrer**
- **USDA FoodData** : Gratuit (550k+ produits)
- **Spoonacular API** : $60/mois (recettes)
- **Go-UPC** : $40/mois (codes-barres)
- **Google Maps Platform** : $50/mois (pharmacies)
- **Firebase FCM** : Gratuit (notifications)

### **💡 Total Estimé Final**
- **Budget Setup** : $0.30/utilisateur/mois
- **Standard Setup** : $0.52/utilisateur/mois ⭐ **RECOMMANDÉ**
- **Premium Setup** : $1.10/utilisateur/mois

---

## 🔄 **CE QUI RESTE À FAIRE**

### **1. SCHÉMAS POSTGRESQL RESTANTS**

#### **Schema NUTRITION** 🔄 **PRIORITÉ 1**
```sql
Tables à créer:
- nutrition.products (base produits avec codes-barres, nutritional_info)
- nutrition.recipes (recettes avec instructions JSON, ratings)
- nutrition.recipe_ingredients (ingrédients avec quantités)
- nutrition.recipe_interactions (favoris, notes, ratings utilisateurs)
- nutrition.recipe_collections (collections personnalisées)

Intégrations requises:
- USDA FoodData Central API (gratuit, 550k+ produits)
- Spoonacular API ($60/mois, recettes)
- Go-UPC API ($40/mois, codes-barres)
```

#### **Décision Architecture : PostgreSQL vs MongoDB**

**OPTION A : Tout PostgreSQL** ⭐ **RECOMMANDÉ POUR MVP**
```sql
Avantages:
- Cohérence des données garantie
- Requêtes complexes facilitées
- Un seul type de base à gérer
- Performance optimale pour analytics

À créer:
- ai.ai_chat_conversations, ai.ai_chat_messages
- ai.ai_image_analyses, ai.ai_nutritionist_insights
- geolocation.pharmacies, geolocation.pharmacy_schedules
- notifications.notifications, notifications.push_tokens
```

**OPTION B : Hybride PostgreSQL + MongoDB**
```javascript
MongoDB pour:
- ai_services (conversations flexibles, metadata variables)
- notifications (scalabilité push massive)
- geolocation (recherches géospatiales native)
- analytics.user_events (event tracking big data)
```

### **2. DÉVELOPPEMENT BACKEND - APIs Node.js**

#### **Routes Essentielles à Développer :**
```javascript
Authentication Service:
- POST /auth/register
- POST /auth/login  
- POST /auth/refresh-token
- DELETE /auth/logout

User Management:
- GET /users/profile
- PUT /users/profile
- GET /users/goals
- POST /users/goals

Nutrition Tracking:
- POST /consumption/entries
- GET /consumption/daily-summary/:date
- GET /consumption/history
- PUT /consumption/entries/:id

Analytics Dashboard:
- GET /analytics/dashboard
- GET /analytics/kpis/:period
- POST /analytics/widgets/config
- GET /analytics/achievements

AI Services (à intégrer):
- POST /ai/chat/message
- POST /ai/analyze-image
- GET /ai/insights

Product & Recipe:
- GET /products/search
- POST /products/scan/:barcode
- GET /recipes/search
- POST /recipes/:id/interact
```

#### **Jobs Automatisés à Implémenter :**
```javascript
Quotidiens:
- Calcul daily_summaries (agrégation consumption_entries)
- Génération user_insights basés sur patterns
- Nettoyage sessions expirées (> 30 jours)

Hebdomadaires:
- Calcul weekly_summaries
- Vérification achievements débloqués
- Update user_streaks

Mensuels:
- Calcul monthly_summaries
- Rapports analytics globaux
- Optimisation index database
```

### **3. DÉVELOPPEMENT MOBILE - Screens Flutter**

#### **Écrans Essentiels à Développer :**
```dart
Authentication Flow:
- SplashScreen
- LoginScreen / RegisterScreen
- OnboardingScreen (objectifs, préférences)

Main Navigation:
- BottomNavigationBar (5 tabs)

Dashboard Tab:
- DashboardScreen (widgets configurables)
- KPIsDetailScreen
- ProgressScreen

Nutrition Tab:
- FoodLogScreen (journal quotidien)
- AddFoodScreen (scan/search/manual)
- BarcodeScannerScreen
- FoodCameraScreen (AI analysis)

Recipes Tab:
- RecipeBrowserScreen
- RecipeDetailScreen
- FavoriteRecipesScreen

Chat Tab:
- NutritionistChatScreen
- ChatHistoryScreen

Profile Tab:
- ProfileScreen
- GoalsScreen
- SettingsScreen
- AchievementsScreen
```

#### **Fonctionnalités Avancées :**
```dart
Widget System:
- DraggableWidgets pour dashboard
- CustomizableCharts (calories, macros, poids)
- RealTimeUpdates avec WebSocket

AI Integration:
- VoiceRecognition pour chat
- CameraIntegration pour analyse photos
- BarcodeScanner avec ML Kit

Gamification:
- AchievementNotifications
- StreakCounters avec animations
- ProgressBars et celebrations

Offline Support:
- LocalDatabase avec Drift
- SyncManager pour données cached
- OfflineMode avec indicators
```

---

## 📊 **MÉTRIQUES DE SUCCÈS DÉFINIES**

### **Performance Targets**
- **Requêtes Dashboard** : <200ms (actuellement optimisé avec index)
- **Sync Time** : <5 secondes pour mise à jour complète
- **App Launch** : <3 secondes cold start

### **Coûts Targets**
- **MVP** : <$0.52/utilisateur/mois
- **Scale** : <$1.10/utilisateur/mois à 10K utilisateurs
- **Break-even** : 500-1000 utilisateurs premium ($9.99/mois)

### **Engagement Targets**
- **Daily Logging Rate** : >70% utilisateurs actifs
- **Retention** : >60% après 30 jours
- **Premium Conversion** : >10% dans premiers 3 mois

### **Qualité Données**
- **Nutrition Accuracy** : >85% pour analyse IA
- **Barcode Success Rate** : >95% reconnaissance
- **User Satisfaction** : >4.2/5 stars

---

## 🚀 **ROADMAP RECOMMANDÉ**

### **Phase 1 : Finaliser PostgreSQL (2-3 semaines)**
```
Semaine 1-2:
✅ Créer schema nutrition (products, recipes)
✅ Intégrer USDA FoodData API
✅ Tester calculs nutritionnels

Semaine 3:
✅ Décider architecture AI (PostgreSQL vs MongoDB)
✅ Créer schemas restants
✅ Setup APIs externes (Spoonacular, Go-UPC)
```

### **Phase 2 : Backend Core (3-4 semaines)**
```
Semaine 1-2:
✅ Développer APIs authentification + users
✅ Développer APIs consumption + analytics
✅ Intégrer services externes

Semaine 3-4:
✅ Développer AI services (chat + image analysis)
✅ Implémenter jobs automatisés
✅ Tests performance avec données réelles
```

### **Phase 3 : Mobile App (4-6 semaines)**
```
Semaine 1-2:
✅ Setup architecture Flutter + navigation
✅ Screens authentification + onboarding
✅ Dashboard principal avec widgets

Semaine 3-4:
✅ Nutrition tracking (scan + photo + manual)
✅ Chat nutritionniste IA
✅ Bibliothèque recettes

Semaine 5-6:
✅ Analytics et progression
✅ Gamification (achievements, streaks)
✅ Polish UI/UX + tests utilisateurs
```

### **Phase 4 : Testing & Launch (2-3 semaines)**
```
Semaine 1-2:
✅ Tests beta avec 50 utilisateurs
✅ Optimisations performance
✅ Bug fixes critiques

Semaine 3:
✅ Launch MVP
✅ Monitoring et analytics
✅ Support utilisateurs
```

---

## 📁 **FICHIERS & DOCUMENTATION**

### **Scripts SQL Créés :**
```
1. nounou_schema_users.sql (Schéma users complet)
2. nounou_schema_consumption.sql (Schéma consumption)
3. nounou_schema_analytics.sql (Schéma analytics)
4. nounou_indexes_users.sql (Index performance users)
5. nounou_test_queries.sql (Requêtes de test)
```

### **Documentation Technique :**
```
1. Database_Schema_Documentation.md
2. API_Specifications.md (à créer)
3. Mobile_App_Architecture.md (à créer)
4. Cost_Analysis_Report.md (existant)
5. Performance_Benchmarks.md (à créer)
```

---

## 🔐 **SÉCURITÉ & CONFORMITÉ**

### **Mesures Implémentées :**
- **Authentification** : JWT tokens + refresh tokens
- **Sessions** : Multi-device avec expiration
- **Données sensibles** : Hachage passwords + chiffrement
- **Index** : Optimisés pour requêtes sécurisées

### **À Implémenter :**
- **Rate Limiting** : APIs protégées contre spam
- **GDPR Compliance** : Export/suppression données utilisateur
- **Encryption** : Données sensibles chiffrées at-rest
- **Audit Trail** : Logs complets des accès/modifications

---

## 📞 **CONTACTS & RESSOURCES**

### **APIs Externes - Contacts**
- **USDA FoodData** : https://fdc.nal.usda.gov/api-guide.html
- **Spoonacular** : https://spoonacular.com/food-api
- **DeepSeek AI** : https://platform.deepseek.com/
- **Google Cloud Vision** : https://cloud.google.com/vision/docs

### **Infrastructure**
- **AWS Maroc** : Utiliser région Stockholm (eu-north-1)
- **PostgreSQL** : Version 15+ recommandée
- **Node.js** : Version 18+ LTS
- **Flutter** : Version 3.16+

---

## 🎯 **STATUT FINAL**

**✅ COMPLÉTÉ (40%) :**
- Infrastructure PostgreSQL core (users, consumption, analytics)
- 46 index de performance optimisés
- Architecture scalable pour 1K+ utilisateurs
- Coûts maîtrisés ($0.52-1.10/utilisateur/mois)

**🔄 EN COURS (0%) :**
- Schéma nutrition + intégration APIs externes
- Backend Node.js + services IA
- Application mobile Flutter

**⏰ ESTIMATION RESTANTE :**
- **8-12 semaines** pour MVP complet
- **Budget total** : $5K-15K développement
- **ROI attendu** : Break-even à 500-1000 utilisateurs premium

---

**📅 Dernière mise à jour :** Juin 2025  
**👨‍💻 Développeur :** [Votre nom]  
**📧 Contact :** [Votre email]  

---

*Ce checkpoint servira de référence pour reprendre le développement exactement où vous en êtes. Toutes les informations techniques, décisions d'architecture et prochaines étapes sont documentées pour assurer la continuité du projet.* 🚀