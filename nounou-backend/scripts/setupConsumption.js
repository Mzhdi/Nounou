// scripts/setupConsumption.js
// Script pour initialiser complètement le module Consumption

const mongoose = require('mongoose');
const config = require('../src/config/env');

class ConsumptionSetup {

  async run() {
    try {
      console.log('🚀 Setting up Consumption Module...');
      console.log('📡 Connecting to MongoDB:', config.MONGODB_URI || 'mongodb://localhost:27017/nounou');

      await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/nounou');
      console.log('✅ Connected to MongoDB successfully');

      // Étape 1: Vérifier les dépendances
      await this.checkDependencies();

      // Étape 2: Créer les indexes
      await this.createIndexes();

      // Étape 3: Initialiser les données de test (optionnel)
      if (process.argv.includes('--with-test-data')) {
        await this.createTestData();
      }

      // Étape 4: Vérifier l'intégrité
      await this.verifySetup();

      console.log('🎉 Consumption Module setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Start your server: npm run dev');
      console.log('   2. Test endpoints: POST /api/v1/consumption/entries');
      console.log('   3. Check dashboard: GET /api/v1/consumption/dashboard');

    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
      console.log('📊 Disconnected from MongoDB');
    }
  }

  async checkDependencies() {
    console.log('🔍 Checking dependencies...');

    // Vérifier que les collections Food et Recipe existent
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const requiredCollections = ['foods', 'recipes', 'users'];
    const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));

    if (missingCollections.length > 0) {
      console.warn(`⚠️  Missing collections: ${missingCollections.join(', ')}`);
      console.warn('   Make sure to setup Food and Recipe modules first');
    } else {
      console.log('✅ All required collections exist');
    }

    // Vérifier qu'il y a quelques données de référence
    try {
      const foodCount = await mongoose.connection.db.collection('foods').countDocuments();
      const recipeCount = await mongoose.connection.db.collection('recipes').countDocuments();
      const userCount = await mongoose.connection.db.collection('users').countDocuments();

      console.log(`📊 Reference data: ${foodCount} foods, ${recipeCount} recipes, ${userCount} users`);

      if (foodCount === 0 && recipeCount === 0) {
        console.warn('⚠️  No food or recipe data found. Consider adding some reference data first.');
      }
    } catch (error) {
      console.warn('⚠️  Could not check reference data:', error.message);
    }
  }

  async createIndexes() {
    console.log('📊 Creating optimized indexes...');

    try {
      // Import du modèle
      const { ConsumptionEntry } = require('../src/models/consumptionModel');

      // Les indexes sont définis dans le schema, mais on peut les créer explicitement
      await ConsumptionEntry.createIndexes();
      console.log('✅ ConsumptionEntry indexes created');

      // Indexes personnalisés pour les performances
      const collection = mongoose.connection.db.collection('consumptionentries');

      // Index composite pour les requêtes fréquentes de dashboard
      await collection.createIndex(
        { 
          userId: 1, 
          'tracking.isDeleted': 1, 
          consumedAt: -1 
        },
        { name: 'dashboard_query_idx' }
      );

      // Index pour les requêtes par type d'item
      await collection.createIndex(
        { 
          userId: 1, 
          'consumedItem.itemType': 1, 
          consumedAt: -1 
        },
        { name: 'item_type_query_idx' }
      );

      // Index pour les statistiques nutritionnelles
      await collection.createIndex(
        { 
          userId: 1, 
          mealType: 1, 
          consumedAt: -1,
          'tracking.isDeleted': 1
        },
        { name: 'nutrition_stats_idx' }
      );

      // Index pour les top items
      await collection.createIndex(
        { 
          'consumedItem.itemId': 1,
          'consumedItem.itemType': 1,
          'tracking.isDeleted': 1,
          consumedAt: -1
        },
        { name: 'top_items_idx' }
      );

      // Index pour la recherche textuelle (déjà défini dans le schema)
      // Vérifier qu'il existe
      const indexes = await collection.indexes();
      const hasTextIndex = indexes.some(idx => idx.name === 'metadata.userInput.notes_text_metadata.userInput.tags_text_context.originalRecipe.name_text');
      
      if (!hasTextIndex) {
        await collection.createIndex(
          {
            'metadata.userInput.notes': 'text',
            'metadata.userInput.tags': 'text',
            'context.originalRecipe.name': 'text'
          },
          { name: 'consumption_text_search_idx' }
        );
      }

      console.log('✅ All performance indexes created successfully');

    } catch (error) {
      console.error('❌ Index creation failed:', error);
      throw error;
    }
  }

async createTestData() {
    console.log('🧪 Creating test data...');

    try {
      // Vérifier qu'on a des utilisateurs et des aliments/recettes de référence
      const users = await mongoose.connection.db.collection('users').find({}).limit(2).toArray();
      const foods = await mongoose.connection.db.collection('foods').find({}).limit(5).toArray();
      const recipes = await mongoose.connection.db.collection('recipes').find({}).limit(3).toArray();

      if (users.length === 0) {
        console.warn('⚠️  No users found. Cannot create test data.');
        return;
      }

      if (foods.length === 0 && recipes.length === 0) {
        console.warn('⚠️  No foods or recipes found. Cannot create test data.');
        return;
      }

      const { ConsumptionEntry } = require('../src/models/consumptionModel');

      const testEntries = [];
      const testUser = users[0];

      // Créer des entrées de test pour la semaine dernière
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Entrée petit-déjeuner (food)
        if (foods.length > 0) {
          testEntries.push({
            userId: testUser._id,
            consumedItem: {
              itemType: 'food',
              itemId: foods[0]._id,
              refPath: 'Food'
            },
            quantity: 100 + Math.random() * 50,
            unit: 'g',
            mealType: 'breakfast',
            consumedAt: new Date(date.setHours(8, 0, 0, 0)),
            entryMethod: 'manual',
            calculatedNutrition: {
              calories: 200 + Math.random() * 100,
              protein: 10 + Math.random() * 5,
              carbs: 30 + Math.random() * 10,
              fat: 5 + Math.random() * 3,
              fiber: 2,
              sugar: 5,
              sodium: 100,
              calculatedAt: new Date(),
              calculationSource: 'food_database', // Valid enum value
              confidence: 1
            },
            metadata: {
              userInput: {
                notes: 'Test breakfast entry',
                tags: ['test', 'breakfast']
              }
            },
            tracking: {
              isDeleted: false,
              versions: [{
                changedAt: new Date(),
                changedBy: testUser._id,
                changes: { created: true },
                reason: 'test_data_creation'
              }],
              qualityScore: 85
            }
          });
        }

        // Entrée déjeuner (recipe)
        if (recipes.length > 0) {
          testEntries.push({
            userId: testUser._id,
            consumedItem: {
              itemType: 'recipe',
              itemId: recipes[0]._id,
              refPath: 'Recipe'
            },
            servings: 1,
            mealType: 'lunch',
            consumedAt: new Date(date.setHours(12, 30, 0, 0)),
            entryMethod: 'recipe',
            calculatedNutrition: {
              calories: 400 + Math.random() * 200,
              protein: 20 + Math.random() * 10,
              carbs: 50 + Math.random() * 20,
              fat: 15 + Math.random() * 5,
              fiber: 5,
              sugar: 8,
              sodium: 300,
              calculatedAt: new Date(),
              calculationSource: 'recipe_computation', // Valid enum value
              confidence: 0.95
            },
            context: {
              originalRecipe: {
                name: 'Test Recipe',
                totalServings: 2,
                portionConsumed: 0.5
              }
            },
            metadata: {
              userInput: {
                notes: 'Test lunch recipe',
                tags: ['test', 'recipe', 'lunch'],
                rating: 4
              }
            },
            tracking: {
              isDeleted: false,
              versions: [{
                changedAt: new Date(),
                changedBy: testUser._id,
                changes: { created: true },
                reason: 'test_data_creation'
              }],
              qualityScore: 90
            }
          });
        }

        // Entrée snack (food)
        if (foods.length > 1) {
          testEntries.push({
            userId: testUser._id,
            consumedItem: {
              itemType: 'food',
              itemId: foods[Math.min(1, foods.length - 1)]._id,
              refPath: 'Food'
            },
            quantity: 50 + Math.random() * 30,
            unit: 'g',
            mealType: 'snack',
            consumedAt: new Date(date.setHours(16, 0, 0, 0)),
            entryMethod: 'quick_add',
            calculatedNutrition: {
              calories: 150 + Math.random() * 75,
              protein: 3 + Math.random() * 2,
              carbs: 20 + Math.random() * 10,
              fat: 7 + Math.random() * 3,
              fiber: 1,
              sugar: 12,
              sodium: 50,
              calculatedAt: new Date(),
              calculationSource: 'food_database', // Valid enum value
              confidence: 0.9
            },
            metadata: {
              userInput: {
                notes: 'Afternoon snack',
                tags: ['test', 'snack']
              }
            },
            tracking: {
              isDeleted: false,
              versions: [{
                changedAt: new Date(),
                changedBy: testUser._id,
                changes: { created: true },
                reason: 'test_data_creation'
              }],
              qualityScore: 75
            }
          });
        }
      }

      // Ajouter quelques entrées avec d'autres sources de calcul
      if (foods.length > 0) {
        testEntries.push({
          userId: testUser._id,
          consumedItem: {
            itemType: 'food',
            itemId: foods[0]._id,
            refPath: 'Food'
          },
          quantity: 200,
          unit: 'g',
          mealType: 'dinner',
          consumedAt: new Date(),
          entryMethod: 'manual',
          calculatedNutrition: {
            calories: 300,
            protein: 25,
            carbs: 20,
            fat: 12,
            fiber: 3,
            sugar: 2,
            sodium: 200,
            calculatedAt: new Date(),
            calculationSource: 'user_input', // Another valid enum value
            confidence: 0.8
          },
          metadata: {
            userInput: {
              notes: 'Manual nutrition entry',
              tags: ['test', 'manual', 'dinner']
            }
          },
          tracking: {
            isDeleted: false,
            versions: [{
              changedAt: new Date(),
              changedBy: testUser._id,
              changes: { created: true },
              reason: 'test_data_creation'
            }],
            qualityScore: 70
          }
        });
      }

      // Insérer les données de test
      if (testEntries.length > 0) {
        await ConsumptionEntry.insertMany(testEntries);
        console.log(`✅ Created ${testEntries.length} test consumption entries`);
        
        // Afficher un résumé
        const breakdown = {
          food: testEntries.filter(e => e.consumedItem.itemType === 'food').length,
          recipe: testEntries.filter(e => e.consumedItem.itemType === 'recipe').length
        };
        console.log(`📊 Breakdown: ${breakdown.food} food entries, ${breakdown.recipe} recipe entries`);
      }

    } catch (error) {
      console.error('❌ Test data creation failed:', error);
      // Ne pas faire échouer le setup pour les données de test
    }
  }

  async verifySetup() {
    console.log('🔍 Verifying setup...');

    try {
      const { ConsumptionEntry } = require('../src/models/consumptionModel');

      // Vérifier que le modèle fonctionne
      const count = await ConsumptionEntry.countDocuments();
      console.log(`📊 Found ${count} consumption entries in database`);

      // Vérifier les indexes
      const indexes = await ConsumptionEntry.collection.indexes();
      console.log(`📊 Active indexes: ${indexes.length}`);

      // Test basique de création d'entrée (si on a des données de référence)
      const users = await mongoose.connection.db.collection('users').find({}).limit(1).toArray();
      const foods = await mongoose.connection.db.collection('foods').find({}).limit(1).toArray();

      if (users.length > 0 && foods.length > 0) {
        const testEntry = new ConsumptionEntry({
          userId: users[0]._id,
          consumedItem: {
            itemType: 'food',
            itemId: foods[0]._id,
            refPath: 'Food'
          },
          quantity: 100,
          unit: 'g',
          mealType: 'other',
          consumedAt: new Date(),
          entryMethod: 'manual',
          calculatedNutrition: {
            calories: 100,
            protein: 5,
            carbs: 10,
            fat: 2,
            calculatedAt: new Date(),
            calculationSource: 'test',
            confidence: 1
          },
          metadata: {
            userInput: {
              notes: 'Setup verification test',
              tags: ['setup', 'verification']
            }
          },
          tracking: {
            isDeleted: false,
            versions: [{
              changedAt: new Date(),
              changedBy: users[0]._id,
              changes: { created: true },
              reason: 'setup_verification'
            }],
            qualityScore: 80
          }
        });

        // Valider sans sauvegarder
        const validationError = testEntry.validateSync();
        if (validationError) {
          throw new Error(`Model validation failed: ${validationError.message}`);
        }

        console.log('✅ Model validation passed');
      }

      // Vérifier les services
      try {
        const ConsumptionService = require('../src/services/consumptionService');
        console.log('✅ ConsumptionService loaded successfully');
      } catch (error) {
        throw new Error(`Service loading failed: ${error.message}`);
      }

      // Vérifier les contrôleurs
      try {
        const ConsumptionController = require('../src/controllers/consumptionController');
        console.log('✅ ConsumptionController loaded successfully');
      } catch (error) {
        throw new Error(`Controller loading failed: ${error.message}`);
      }

      console.log('✅ Setup verification completed successfully');

    } catch (error) {
      console.error('❌ Setup verification failed:', error);
      throw error;
    }
  }

  async getSetupStatus() {
    try {
      await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/nounou');

      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      const status = {
        collections: {
          consumptionentries: collectionNames.includes('consumptionentries'),
          foods: collectionNames.includes('foods'),
          recipes: collectionNames.includes('recipes'),
          users: collectionNames.includes('users')
        },
        counts: {},
        indexes: {},
        lastCheck: new Date()
      };

      // Compter les documents
      for (const collection of ['consumptionentries', 'foods', 'recipes', 'users']) {
        if (status.collections[collection]) {
          try {
            status.counts[collection] = await mongoose.connection.db.collection(collection).countDocuments();
          } catch (error) {
            status.counts[collection] = 0;
          }
        }
      }

      // Vérifier les indexes de consumption
      if (status.collections.consumptionentries) {
        try {
          const indexes = await mongoose.connection.db.collection('consumptionentries').indexes();
          status.indexes.consumptionentries = indexes.length;
        } catch (error) {
          status.indexes.consumptionentries = 0;
        }
      }

      return status;
    } catch (error) {
      return {
        error: error.message,
        lastCheck: new Date()
      };
    } finally {
      await mongoose.disconnect();
    }
  }
}

// CLI Interface
if (require.main === module) {
  const setup = new ConsumptionSetup();
  
  const command = process.argv[2] || 'run';
  
  (async () => {
    try {
      switch (command) {
        case 'run':
        case 'setup':
          await setup.run();
          break;
          
        case 'status':
          const status = await setup.getSetupStatus();
          console.log('\n📊 SETUP STATUS:');
          console.log(JSON.stringify(status, null, 2));
          break;
          
        case 'test-data':
          await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/nounou');
          await setup.createTestData();
          await mongoose.disconnect();
          break;
          
        case 'indexes':
          await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/nounou');
          await setup.createIndexes();
          await mongoose.disconnect();
          break;
          
        case 'help':
        default:
          console.log(`
🚀 Consumption Module Setup Tool

Usage: node setupConsumption.js [command]

Commands:
  run        - Complete setup (default)
  status     - Check current setup status
  test-data  - Create test data only
  indexes    - Create indexes only
  help       - Show this help message

Options:
  --with-test-data  - Include test data creation during setup

Examples:
  node setupConsumption.js run
  node setupConsumption.js run --with-test-data
  node setupConsumption.js status
  node setupConsumption.js test-data
          `);
      }
    } catch (error) {
      console.error('💥 Fatal error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = ConsumptionSetup;