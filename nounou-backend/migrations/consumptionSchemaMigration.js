// migrations/consumptionSchemaMigration.js
// Script pour migrer de l'ancien schema vers le nouveau schema unifié Food + Recipe

const mongoose = require('mongoose');
const path = require('path');

// Configuration
const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/nounou',
  BATCH_SIZE: 100,
  BACKUP_PREFIX: 'consumption_backup_',
  DRY_RUN: process.env.DRY_RUN === 'true'
};

// Ancien schema pour la lecture
const oldConsumptionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  foodId: mongoose.Schema.Types.ObjectId,
  quantity: Number,
  unit: String,
  mealType: String,
  consumedAt: Date,
  entryMethod: String,
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number,
    sugar: Number,
    sodium: Number
  },
  recipeContext: {
    recipeId: mongoose.Schema.Types.ObjectId,
    recipeName: String,
    servingSize: Number,
    totalServings: Number
  },
  notes: String,
  tags: [String],
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deviceInfo: mongoose.Schema.Types.Mixed,
  location: mongoose.Schema.Types.Mixed,
  aiAnalysis: mongoose.Schema.Types.Mixed
}, { 
  timestamps: true,
  collection: 'consumptionentries' 
});

// Nouveau schema (import du modèle refactorisé)
let ConsumptionEntry;
try {
  ConsumptionEntry = require('../src/models/consumptionModel').ConsumptionEntry;
} catch (error) {
  console.warn('⚠️  Could not import new ConsumptionEntry model. Make sure the path is correct.');
}

const OldConsumptionEntry = mongoose.model('OldConsumptionEntry', oldConsumptionSchema);

class ConsumptionSchemaMigration {
  
  constructor() {
    this.stats = {
      totalProcessed: 0,
      successfullyMigrated: 0,
      errors: 0,
      skipped: 0,
      startTime: null,
      endTime: null
    };
    this.backupCollectionName = null;
  }

  async run() {
    try {
      console.log('🚀 Starting Consumption Schema Migration...');
      console.log(`📡 Connecting to: ${config.MONGODB_URI}`);
      
      this.stats.startTime = new Date();
      
      await mongoose.connect(config.MONGODB_URI);
      console.log('✅ Connected to MongoDB successfully');

      // Étape 1: Analyser les données existantes
      const analysis = await this.analyzeExistingData();
      console.log('📊 Data Analysis Complete:', JSON.stringify(analysis, null, 2));

      if (analysis.totalEntries === 0) {
        console.log('ℹ️  No existing consumption entries found. Migration not needed.');
        return this.generateReport();
      }

      // Étape 2: Validation des prérequis
      await this.validatePrerequisites();

      // Étape 3: Créer une sauvegarde
      if (!config.DRY_RUN) {
        this.backupCollectionName = await this.createBackup();
      }

      // Étape 4: Exécuter la migration
      await this.executeMigration(analysis);

      // Étape 5: Vérifier l'intégrité
      await this.verifyMigration(analysis);

      console.log('🎉 Migration completed successfully!');
      return this.generateReport();

    } catch (error) {
      console.error('❌ Migration failed:', error);
      await this.handleMigrationError(error);
      throw error;
    } finally {
      this.stats.endTime = new Date();
      await mongoose.disconnect();
      console.log('📊 Disconnected from MongoDB');
    }
  }

  async analyzeExistingData() {
    console.log('🔍 Analyzing existing consumption data...');

    try {
      const totalEntries = await OldConsumptionEntry.countDocuments();
      
      // Analyser les types d'entrées
      const foodOnlyEntries = await OldConsumptionEntry.countDocuments({
        foodId: { $exists: true, $ne: null },
        'recipeContext.recipeId': { $exists: false }
      });

      const recipeOnlyEntries = await OldConsumptionEntry.countDocuments({
        'recipeContext.recipeId': { $exists: true, $ne: null },
        foodId: { $exists: false }
      });

      const hybridEntries = await OldConsumptionEntry.countDocuments({
        foodId: { $exists: true, $ne: null },
        'recipeContext.recipeId': { $exists: true, $ne: null }
      });

      const invalidEntries = await OldConsumptionEntry.countDocuments({
        $and: [
          { $or: [{ foodId: { $exists: false } }, { foodId: null }] },
          { $or: [{ 'recipeContext.recipeId': { $exists: false } }, { 'recipeContext.recipeId': null }] }
        ]
      });

      // Analyser les méthodes d'entrée
      const entryMethods = await OldConsumptionEntry.aggregate([
        { $group: { _id: '$entryMethod', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Analyser les types de repas
      const mealTypes = await OldConsumptionEntry.aggregate([
        { $group: { _id: '$mealType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Analyser la plage de dates
      const dateRange = await OldConsumptionEntry.aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: '$consumedAt' },
            maxDate: { $max: '$consumedAt' },
            avgDate: { $avg: '$consumedAt' }
          }
        }
      ]);

      // Analyser la qualité des données
      const dataQuality = {
        entriesWithNutrition: await OldConsumptionEntry.countDocuments({
          'nutrition.calories': { $exists: true, $gt: 0 }
        }),
        entriesWithValidQuantity: await OldConsumptionEntry.countDocuments({
          quantity: { $exists: true, $gt: 0 }
        }),
        entriesWithNotes: await OldConsumptionEntry.countDocuments({
          notes: { $exists: true, $ne: '' }
        }),
        entriesWithTags: await OldConsumptionEntry.countDocuments({
          tags: { $exists: true, $not: { $size: 0 } }
        }),
        deletedEntries: await OldConsumptionEntry.countDocuments({
          isDeleted: true
        })
      };

      // Analyser les utilisateurs uniques
      const uniqueUsers = await OldConsumptionEntry.distinct('userId');

      return {
        totalEntries,
        breakdown: {
          foodOnlyEntries,
          recipeOnlyEntries,
          hybridEntries,
          invalidEntries
        },
        entryMethods,
        mealTypes,
        dateRange: dateRange[0] || {},
        dataQuality,
        uniqueUsersCount: uniqueUsers.length,
        migrationComplexity: this.assessMigrationComplexity({
          totalEntries,
          hybridEntries,
          invalidEntries
        })
      };
    } catch (error) {
      console.error('Error analyzing data:', error);
      throw new Error(`Data analysis failed: ${error.message}`);
    }
  }

  assessMigrationComplexity(breakdown) {
    const { totalEntries, hybridEntries, invalidEntries } = breakdown;
    
    if (totalEntries === 0) return 'none';
    if (totalEntries < 1000 && hybridEntries === 0 && invalidEntries === 0) return 'simple';
    if (totalEntries < 10000 && hybridEntries < totalEntries * 0.1) return 'moderate';
    return 'complex';
  }

  async validatePrerequisites() {
    console.log('🔍 Validating migration prerequisites...');

    // Vérifier que le nouveau modèle est disponible
    if (!ConsumptionEntry) {
      throw new Error('New ConsumptionEntry model not available. Check import path.');
    }

    // Vérifier l'espace disque (approximatif)
    const collections = await mongoose.connection.db.listCollections().toArray();
    const consumptionCollection = collections.find(c => c.name === 'consumptionentries');
    
    if (consumptionCollection) {
      const stats = await mongoose.connection.db.collection('consumptionentries').stats();
      console.log(`📊 Current collection size: ${Math.round(stats.size / 1024 / 1024)} MB`);
      
      if (stats.size > 1024 * 1024 * 1024) { // > 1GB
        console.warn('⚠️  Large collection detected. Migration may take significant time.');
      }
    }

    // Vérifier les services de référence (Food et Recipe)
    try {
      const foodCollectionExists = await mongoose.connection.db.collection('foods').countDocuments({}, { limit: 1 });
      const recipeCollectionExists = await mongoose.connection.db.collection('recipes').countDocuments({}, { limit: 1 });
      
      console.log(`📊 Reference collections: Foods=${foodCollectionExists > 0}, Recipes=${recipeCollectionExists > 0}`);
    } catch (error) {
      console.warn('⚠️  Could not verify reference collections:', error.message);
    }

    console.log('✅ Prerequisites validation completed');
  }

  async createBackup() {
    console.log('💾 Creating backup of existing data...');
    
    const timestamp = Date.now();
    const backupName = `${config.BACKUP_PREFIX}${timestamp}`;
    
    try {
      // Utiliser aggregation pour copier la collection
      await OldConsumptionEntry.aggregate([
        { $match: {} },
        { $out: backupName }
      ]);

      // Vérifier la sauvegarde
      const backupCount = await mongoose.connection.db.collection(backupName).countDocuments();
      const originalCount = await OldConsumptionEntry.countDocuments();

      if (backupCount !== originalCount) {
        throw new Error(`Backup verification failed: ${backupCount} != ${originalCount}`);
      }

      console.log(`✅ Backup created successfully: ${backupName} (${backupCount} documents)`);
      return backupName;
    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  async executeMigration(analysis) {
    console.log('🔄 Starting migration execution...');
    console.log(`📊 Processing ${analysis.totalEntries} entries in batches of ${config.BATCH_SIZE}`);

    let skip = 0;
    let processedInBatch = 0;

    while (true) {
      const batch = await OldConsumptionEntry.find({})
        .skip(skip)
        .limit(config.BATCH_SIZE)
        .lean();

      if (batch.length === 0) break;

      console.log(`Processing batch: ${skip + 1} to ${skip + batch.length}`);

      if (config.DRY_RUN) {
        // Mode dry run - juste valider la transformation
        for (const oldEntry of batch) {
          try {
            const transformed = await this.transformEntry(oldEntry);
            if (transformed) {
              this.stats.successfullyMigrated++;
            } else {
              this.stats.skipped++;
            }
            this.stats.totalProcessed++;
          } catch (error) {
            console.error(`Error transforming entry ${oldEntry._id}:`, error.message);
            this.stats.errors++;
            this.stats.totalProcessed++;
          }
        }
      } else {
        // Mode réel - transformer et sauvegarder
        const transformedEntries = [];
        
        for (const oldEntry of batch) {
          try {
            const transformed = await this.transformEntry(oldEntry);
            if (transformed) {
              transformedEntries.push(transformed);
            } else {
              this.stats.skipped++;
            }
            this.stats.totalProcessed++;
          } catch (error) {
            console.error(`Error transforming entry ${oldEntry._id}:`, error.message);
            this.stats.errors++;
            this.stats.totalProcessed++;
          }
        }

        // Insérer le batch transformé
        if (transformedEntries.length > 0) {
          try {
            await ConsumptionEntry.insertMany(transformedEntries, { ordered: false });
            this.stats.successfullyMigrated += transformedEntries.length;
          } catch (error) {
            console.error('Batch insert error:', error.message);
            
            // Essayer d'insérer individuellement en cas d'erreur de batch
            for (const entry of transformedEntries) {
              try {
                await new ConsumptionEntry(entry).save();
                this.stats.successfullyMigrated++;
              } catch (individualError) {
                console.error(`Individual insert error for entry:`, individualError.message);
                this.stats.errors++;
              }
            }
          }
        }
      }

      skip += config.BATCH_SIZE;
      processedInBatch += batch.length;

      // Progress logging
      if (skip % (config.BATCH_SIZE * 10) === 0) {
        const progress = ((this.stats.totalProcessed / analysis.totalEntries) * 100).toFixed(1);
        console.log(`📈 Progress: ${progress}% (${this.stats.totalProcessed}/${analysis.totalEntries})`);
        console.log(`   ✅ Migrated: ${this.stats.successfullyMigrated}, ❌ Errors: ${this.stats.errors}, ⏭️  Skipped: ${this.stats.skipped}`);
      }
    }

    console.log(`✅ Migration execution completed`);
    console.log(`📊 Final stats: ${this.stats.successfullyMigrated} migrated, ${this.stats.errors} errors, ${this.stats.skipped} skipped`);
  }

  async transformEntry(oldEntry) {
    try {
      // Déterminer le type d'item et les données associées
      let itemType, itemId, quantity, unit, servings;
      let contextData = {};

      // Cas 1: Entrée avec recette (priorité à la recette)
      if (oldEntry.recipeContext?.recipeId) {
        itemType = 'recipe';
        itemId = oldEntry.recipeContext.recipeId;
        servings = oldEntry.recipeContext.servingSize || 1;
        
        contextData.originalRecipe = {
          name: oldEntry.recipeContext.recipeName,
          totalServings: oldEntry.recipeContext.totalServings,
          portionConsumed: servings / (oldEntry.recipeContext.totalServings || 1)
        };
      }
      // Cas 2: Entrée avec aliment
      else if (oldEntry.foodId) {
        itemType = 'food';
        itemId = oldEntry.foodId;
        quantity = oldEntry.quantity || 100;
        unit = oldEntry.unit || 'g';
        
        contextData.preparation = {
          method: 'unknown',
          notes: oldEntry.notes || ''
        };
      }
      // Cas 3: Entrée invalide
      else {
        console.warn(`Skipping invalid entry ${oldEntry._id}: no foodId or recipeId`);
        return null;
      }

      // Construire la nouvelle structure
      const newEntry = {
        userId: oldEntry.userId,
        
        consumedItem: {
          itemType,
          itemId,
          refPath: itemType === 'food' ? 'Food' : 'Recipe'
        },

        // Quantité selon le type
        ...(itemType === 'food' && { quantity, unit }),
        ...(itemType === 'recipe' && { servings }),

        mealType: oldEntry.mealType || 'other',
        consumedAt: oldEntry.consumedAt || new Date(),
        entryMethod: oldEntry.entryMethod || 'manual',

        // Nutrition migrée
        calculatedNutrition: {
          calories: oldEntry.nutrition?.calories || 0,
          protein: oldEntry.nutrition?.protein || 0,
          carbs: oldEntry.nutrition?.carbs || 0,
          fat: oldEntry.nutrition?.fat || 0,
          fiber: oldEntry.nutrition?.fiber || 0,
          sugar: oldEntry.nutrition?.sugar || 0,
          sodium: oldEntry.nutrition?.sodium || 0,
          cholesterol: oldEntry.nutrition?.cholesterol || 0,
          saturatedFat: oldEntry.nutrition?.saturatedFat || 0,
          calculatedAt: new Date(),
          calculationSource: 'migration_transfer',
          confidence: this.calculateMigrationConfidence(oldEntry)
        },

        // Contexte enrichi
        context: contextData,

        // Métadonnées
        metadata: {
          deviceInfo: oldEntry.deviceInfo || {},
          location: oldEntry.location || {},
          userInput: {
            notes: oldEntry.notes || '',
            tags: oldEntry.tags || [],
            rating: null,
            mood: null
          },
          aiAnalysis: oldEntry.aiAnalysis || {}
        },

        // Tracking
        tracking: {
          isDeleted: oldEntry.isDeleted || false,
          deletedAt: oldEntry.deletedAt,
          deletedBy: oldEntry.deletedBy,
          versions: [{
            changedAt: new Date(),
            changedBy: oldEntry.userId,
            changes: { migrated: true, originalId: oldEntry._id },
            reason: 'schema_migration_v2'
          }],
          isDuplicate: false,
          originalEntryId: null,
          qualityScore: this.calculateQualityScore(oldEntry),
          isVerified: false
        },

        // Timestamps
        createdAt: oldEntry.createdAt || oldEntry.consumedAt || new Date(),
        updatedAt: oldEntry.updatedAt || new Date()
      };

      return newEntry;
    } catch (error) {
      console.error(`Error transforming entry ${oldEntry._id}:`, error);
      return null;
    }
  }

  calculateMigrationConfidence(oldEntry) {
    let confidence = 0.8; // Base confidence for migrated data

    // Augmenter la confiance si les données semblent complètes
    if (oldEntry.nutrition?.calories > 0) confidence += 0.1;
    if (oldEntry.quantity > 0) confidence += 0.05;
    if (oldEntry.notes) confidence += 0.02;
    if (oldEntry.entryMethod && oldEntry.entryMethod !== 'manual') confidence += 0.03;

    return Math.min(confidence, 1.0);
  }

  calculateQualityScore(oldEntry) {
    let score = 50; // Base score

    // Données nutritionnelles
    if (oldEntry.nutrition?.calories > 0) score += 20;
    if (oldEntry.nutrition?.protein > 0) score += 5;
    if (oldEntry.nutrition?.carbs > 0) score += 5;
    if (oldEntry.nutrition?.fat > 0) score += 5;

    // Quantité valide
    if (oldEntry.quantity > 0) score += 10;

    // Métadonnées
    if (oldEntry.notes) score += 5;
    if (oldEntry.tags?.length > 0) score += 5;

    // Date de consommation valide
    if (oldEntry.consumedAt && oldEntry.consumedAt <= new Date()) score += 5;

    // Méthode d'entrée
    if (['barcode_scan', 'image_analysis'].includes(oldEntry.entryMethod)) score += 10;
    else if (oldEntry.entryMethod === 'manual') score += 5;

    // Contexte de recette
    if (oldEntry.recipeContext?.recipeName) score += 5;

    return Math.min(score, 100);
  }

  async verifyMigration(originalAnalysis) {
    console.log('🔍 Verifying migration integrity...');

    if (config.DRY_RUN) {
      console.log('ℹ️  Dry run mode - skipping database verification');
      return;
    }

    try {
      const newCount = await ConsumptionEntry.countDocuments();
      const originalCount = originalAnalysis.totalEntries;

      console.log(`📊 Migration verification:`);
      console.log(`   Original entries: ${originalCount}`);
      console.log(`   Migrated entries: ${newCount}`);
      console.log(`   Success rate: ${((newCount / originalCount) * 100).toFixed(1)}%`);

      // Vérifier les types d'items
      const itemTypeCounts = await ConsumptionEntry.aggregate([
        { $group: { _id: '$consumedItem.itemType', count: { $sum: 1 } } }
      ]);

      console.log('📊 Item type distribution:', itemTypeCounts);

      // Vérifier quelques entrées au hasard
      const sampleEntries = await ConsumptionEntry.find({})
        .limit(5)
        .populate('consumedItemRef');

      console.log('🔍 Sample migrated entries:');
      sampleEntries.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.consumedItem.itemType}: ${entry.consumedItemRef?.name || 'Unknown'} (${entry.calculatedNutrition.calories} cal)`);
      });

      // Vérifier l'intégrité nutritionnelle
      const nutritionStats = await ConsumptionEntry.aggregate([
        {
          $group: {
            _id: null,
            avgCalories: { $avg: '$calculatedNutrition.calories' },
            totalCalories: { $sum: '$calculatedNutrition.calories' },
            entriesWithCalories: {
              $sum: { $cond: [{ $gt: ['$calculatedNutrition.calories', 0] }, 1, 0] }
            },
            avgConfidence: { $avg: '$calculatedNutrition.confidence' },
            avgQualityScore: { $avg: '$tracking.qualityScore' }
          }
        }
      ]);

      console.log('📊 Nutrition integrity check:', nutritionStats[0]);

      // Vérifier les pertes de données significatives
      const dataLossPercentage = ((originalCount - newCount) / originalCount) * 100;
      if (dataLossPercentage > 10) {
        console.warn(`⚠️  Significant data loss detected: ${dataLossPercentage.toFixed(1)}%`);
      } else {
        console.log('✅ Migration integrity verified successfully');
      }

      // Vérifier la cohérence des références
      await this.verifyReferences();

    } catch (error) {
      console.error('❌ Migration verification failed:', error);
      throw error;
    }
  }

  async verifyReferences() {
    console.log('🔗 Verifying item references...');

    try {
      // Vérifier les références food
      const foodEntries = await ConsumptionEntry.countDocuments({
        'consumedItem.itemType': 'food'
      });

      // Vérifier les références recipe
      const recipeEntries = await ConsumptionEntry.countDocuments({
        'consumedItem.itemType': 'recipe'
      });

      console.log(`📊 Reference verification: ${foodEntries} food refs, ${recipeEntries} recipe refs`);

      // TODO: Vérifier que les IDs référencés existent réellement
      // Cela nécessiterait d'accéder aux collections Food et Recipe

    } catch (error) {
      console.warn('⚠️  Reference verification failed:', error.message);
    }
  }

  async handleMigrationError(error) {
    console.error('🚨 Handling migration error...');
    
    if (this.backupCollectionName && !config.DRY_RUN) {
      console.log('🔄 Consider running rollback if needed:');
      console.log(`   node migrations/consumptionSchemaMigration.js rollback ${this.backupCollectionName}`);
    }

    // Log détaillé de l'erreur
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      stats: this.stats
    });
  }

  generateReport() {
    const duration = this.stats.endTime - this.stats.startTime;
    const durationMinutes = Math.round(duration / 1000 / 60 * 100) / 100;

    const report = {
      migration: {
        status: this.stats.errors === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS',
        dryRun: config.DRY_RUN,
        duration: `${durationMinutes} minutes`,
        timestamp: new Date().toISOString()
      },
      statistics: {
        totalProcessed: this.stats.totalProcessed,
        successfullyMigrated: this.stats.successfullyMigrated,
        errors: this.stats.errors,
        skipped: this.stats.skipped,
        successRate: this.stats.totalProcessed > 0 ? 
          `${((this.stats.successfullyMigrated / this.stats.totalProcessed) * 100).toFixed(1)}%` : '0%'
      },
      backup: {
        created: !!this.backupCollectionName,
        collectionName: this.backupCollectionName
      },
      configuration: {
        batchSize: config.BATCH_SIZE,
        mongoUri: config.MONGODB_URI
      }
    };

    console.log('\n📋 MIGRATION REPORT:');
    console.log(JSON.stringify(report, null, 2));

    return report;
  }

  // Méthode de rollback
  async rollback(backupCollectionName) {
    console.log(`🔄 Rolling back migration using backup: ${backupCollectionName}`);
    
    try {
      await mongoose.connect(config.MONGODB_URI);
      
      // Vérifier que la sauvegarde existe
      const backupExists = await mongoose.connection.db.collection(backupCollectionName).countDocuments({}, { limit: 1 });
      if (backupExists === 0) {
        throw new Error(`Backup collection ${backupCollectionName} not found or empty`);
      }

      // Supprimer la nouvelle collection
      try {
        await ConsumptionEntry.collection.drop();
        console.log('✅ Dropped new collection');
      } catch (error) {
        console.log('ℹ️  New collection did not exist or was already dropped');
      }

      // Restaurer depuis la sauvegarde
      await mongoose.connection.db.collection(backupCollectionName)
        .aggregate([{ $out: 'consumptionentries' }]).toArray();
      
      // Vérifier la restauration
      const restoredCount = await OldConsumptionEntry.countDocuments();
      console.log(`✅ Rollback completed successfully: ${restoredCount} documents restored`);

      return {
        status: 'SUCCESS',
        restoredDocuments: restoredCount,
        backupUsed: backupCollectionName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
    }
  }

  // Méthode pour nettoyer les sauvegardes anciennes
  async cleanupOldBackups(olderThanDays = 30) {
    console.log(`🧹 Cleaning up backups older than ${olderThanDays} days...`);
    
    try {
      await mongoose.connect(config.MONGODB_URI);
      
      const collections = await mongoose.connection.db.listCollections({
        name: { $regex: `^${config.BACKUP_PREFIX}` }
      }).toArray();

      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      let deleted = 0;

      for (const collection of collections) {
        const timestamp = parseInt(collection.name.replace(config.BACKUP_PREFIX, ''));
        if (timestamp < cutoffTime) {
          await mongoose.connection.db.collection(collection.name).drop();
          console.log(`🗑️  Deleted old backup: ${collection.name}`);
          deleted++;
        }
      }

      console.log(`✅ Cleanup completed: ${deleted} old backups removed`);
      return { deletedBackups: deleted };
    } catch (error) {
      console.error('❌ Backup cleanup failed:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
    }
  }
}

// CLI Interface
if (require.main === module) {
  const migration = new ConsumptionSchemaMigration();
  
  const command = process.argv[2] || 'migrate';
  const arg1 = process.argv[3];
  
  (async () => {
    try {
      switch (command) {
        case 'migrate':
        case 'run':
          await migration.run();
          break;
          
        case 'analyze':
        case 'analysis':
          await mongoose.connect(config.MONGODB_URI);
          const analysis = await migration.analyzeExistingData();
          console.log('\n📊 ANALYSIS REPORT:');
          console.log(JSON.stringify(analysis, null, 2));
          await mongoose.disconnect();
          break;
          
        case 'rollback':
          if (!arg1) {
            console.error('❌ Please provide backup collection name for rollback');
            console.log('Usage: node consumptionSchemaMigration.js rollback <backup_collection_name>');
            process.exit(1);
          }
          await migration.rollback(arg1);
          break;
          
        case 'cleanup':
          const days = parseInt(arg1) || 30;
          await migration.cleanupOldBackups(days);
          break;
          
        case 'help':
        default:
          console.log(`
🔄 Consumption Schema Migration Tool v2.0

Usage: node consumptionSchemaMigration.js [command] [options]

Commands:
  migrate     - Run the migration (default)
  analyze     - Analyze existing data without migrating
  rollback    - Rollback to a backup (requires backup name)
  cleanup     - Clean up old backups (default: >30 days)
  help        - Show this help message

Environment Variables:
  MONGODB_URI  - MongoDB connection string
  DRY_RUN      - Set to 'true' for simulation mode

Examples:
  node consumptionSchemaMigration.js migrate
  node consumptionSchemaMigration.js analyze
  node consumptionSchemaMigration.js rollback consumption_backup_1234567890
  node consumptionSchemaMigration.js cleanup 60
  
  DRY_RUN=true node consumptionSchemaMigration.js migrate
          `);
      }
    } catch (error) {
      console.error('💥 Fatal error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = ConsumptionSchemaMigration;