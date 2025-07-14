const { ConsumptionEntry, DailySummary, FoodSuggestion } = require('../models/consumptionModel');
const { ValidationError, NotFoundError, BusinessError } = require('../utils/errors');
const mongoose = require('mongoose');

// Import des services existants
const FoodService = require('./foodService');
const RecipeService = require('./recipeService');
const UserService = require('./userService');

class ConsumptionService {

  // ========================================
  // CRÉATION D'ENTRÉES UNIFIÉES
  // ========================================

  /**
   * Créer une entrée de consommation (Food OU Recipe)
   */
  async createConsumptionEntry(userId, entryData) {
    try {
      this.validateEntryData(entryData);

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      // Déterminer le type d'item et valider l'existence
      const { itemType, itemId } = await this.validateAndResolveItem(entryData);

      // Préparer les données de base
      const consumptionData = {
        userId: new mongoose.Types.ObjectId(userId),
        consumedItem: {
          itemType,
          itemId: new mongoose.Types.ObjectId(itemId),
          refPath: itemType === 'food' ? 'Food' : 'Recipe'
        },
        mealType: entryData.mealType || 'other',
        consumedAt: entryData.consumedAt || new Date(),
        entryMethod: entryData.entryMethod || 'manual',
        
        // Quantité selon le type
        ...(itemType === 'food' && {
          quantity: entryData.quantity,
          unit: entryData.unit || 'g'
        }),
        ...(itemType === 'recipe' && {
          servings: entryData.servings || 1
        }),

        // Métadonnées
        metadata: {
          deviceInfo: entryData.deviceInfo || {},
          location: entryData.location || {},
          userInput: {
            notes: entryData.notes || '',
            tags: entryData.tags || [],
            rating: entryData.rating,
            mood: entryData.mood
          },
          aiAnalysis: entryData.aiAnalysis || {}
        },

        context: entryData.context || {}
      };

      // Créer l'entrée
      const newEntry = new ConsumptionEntry(consumptionData);

      // ✅ CALCUL AUTOMATIQUE DE LA NUTRITION
      await newEntry.calculateNutritionFromSource();
      
      // Sauvegarder
      await newEntry.save();

      // Populate les données de l'item
      await newEntry.populate('consumedItemRef');

      // Recalculer le résumé quotidien
      await this.updateDailySummary(userId, newEntry.consumedAt);

      // Log activity
      await UserService.logActivity(userId, {
        action: 'consumption_entry_created',
        resource: 'consumption',
        metadata: {
          entryId: newEntry._id.toString(),
          itemType,
          itemId,
          mealType: newEntry.mealType,
          calories: newEntry.calculatedNutrition?.calories || 0,
          entryMethod: newEntry.entryMethod
        }
      });
      
      return {
        entry: newEntry,
        nutritionSummary: this.getNutritionSummary(newEntry),
        itemDetails: newEntry.consumedItemRef
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError('Failed to create consumption entry', error);
    }
  }

  /**
   * Créer un repas depuis une recette (endpoint spécifique)
   */
  async createMealFromRecipe(userId, recipeId, options = {}) {
    try {
      const { servings = 1, mealType = 'other', consumedAt, notes } = options;

      // Valider que la recette existe
      const recipe = await RecipeService.getRecipeById(recipeId, false);
      if (!recipe) {
        throw new NotFoundError('Recipe not found');
      }

      const entryData = {
        itemType: 'recipe',
        itemId: recipeId,
        servings,
        mealType,
        consumedAt: consumedAt || new Date(),
        entryMethod: 'recipe',
        notes,
        context: {
          originalRecipe: {
            name: recipe.name,
            totalServings: recipe.servings
          }
        }
      };

      return await this.createConsumptionEntry(userId, entryData);
    } catch (error) {
      throw new BusinessError('Failed to create meal from recipe', error);
    }
  }

  /**
   * Ajouter un repas rapide avec aliments multiples
   */
  async addQuickMeal(userId, mealData) {
    try {
      const { 
        items, // Array de {itemType, itemId, quantity?, servings?, notes?}
        mealType = 'other', 
        mealName,
        mealNotes, 
        tags, 
        consumedAt = new Date() 
      } = mealData;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Items array is required and cannot be empty');
      }

      if (items.length > 20) {
        throw new ValidationError('Cannot add more than 20 items in one meal');
      }

      const results = [];
      let totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      
      // Générer un ID de session pour grouper les items
      const mealSessionId = new mongoose.Types.ObjectId().toString();
      
      // Créer une entrée pour chaque item
      for (const item of items) {
        const entryData = {
          ...item,
          mealType,
          consumedAt,
          entryMethod: 'quick_meal',
          notes: item.notes || mealNotes,
          tags: [...(item.tags || []), ...(tags || [])],
          context: {
            meal: {
              isPartOfLargerMeal: true,
              mealSessionId,
              mealName
            }
          }
        };
        
        const result = await this.createConsumptionEntry(userId, entryData);
        results.push(result);

        // Accumuler la nutrition
        const nutrition = result.nutritionSummary;
        totalNutrition.calories += nutrition.calories || 0;
        totalNutrition.protein += nutrition.protein || 0;
        totalNutrition.carbs += nutrition.carbs || 0;
        totalNutrition.fat += nutrition.fat || 0;
      }

      // Log du repas complet
      await UserService.logActivity(userId, {
        action: 'quick_meal_created',
        resource: 'consumption',
        metadata: {
          mealType,
          mealName,
          mealSessionId,
          itemsCount: results.length,
          totalCalories: totalNutrition.calories
        }
      });

      return {
        entries: results,
        mealSummary: {
          mealSessionId,
          totalItems: results.length,
          totalNutrition,
          mealType,
          mealName,
          consumedAt
        }
      };
    } catch (error) {
      throw new BusinessError('Failed to add quick meal', error);
    }
  }

  // ========================================
  // RÉCUPÉRATION ET RECHERCHE
  // ========================================

  /**
   * Obtenir les entrées avec support food + recipe
   */
  async getUserConsumptions(userId, filters = {}) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      const {
        page = 1,
        limit = 20,
        mealType,
        itemType, // 'food', 'recipe', ou undefined
        dateFrom,
        dateTo,
        entryMethod,
        search,
        tags,
        sortBy = 'consumedAt',
        sortOrder = 'desc',
        minCalories,
        maxCalories,
        includeDeleted = false
      } = filters;

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        mealType,
        itemType,
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
        entryMethod,
        includeDeleted,
        sortBy,
        sortOrder: sortOrder === 'desc' ? -1 : 1
      };

      let query = ConsumptionEntry.findByUserWithDetails(userId, options);

      // Filtres additionnels
      if (search) {
        query = query.find({ $text: { $search: search } });
      }

      if (tags) {
        const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
        query = query.find({ 'metadata.userInput.tags': { $in: tagsArray } });
      }

      if (minCalories || maxCalories) {
        const calorieFilter = {};
        if (minCalories) calorieFilter.$gte = parseFloat(minCalories);
        if (maxCalories) calorieFilter.$lte = parseFloat(maxCalories);
        query = query.find({ 'calculatedNutrition.calories': calorieFilter });
      }

      const entries = await query;

      const totalCount = await ConsumptionEntry.countDocuments({
        userId,
        'tracking.isDeleted': includeDeleted ? undefined : false,
        ...(mealType && { mealType }),
        ...(itemType && { 'consumedItem.itemType': itemType }),
        ...(options.dateFrom && { consumedAt: { $gte: options.dateFrom } }),
        ...(options.dateTo && { consumedAt: { $lte: options.dateTo } })
      });

      return {
        entries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          hasNext: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        },
        filters: {
          applied: Object.keys(filters).length > 0,
          ...filters
        },
        summary: {
          totalCalories: entries.reduce((sum, entry) => sum + (entry.calculatedNutrition?.calories || 0), 0),
          itemTypeCounts: this.getItemTypeCounts(entries)
        }
      };
    } catch (error) {
      throw new BusinessError('Failed to retrieve user consumptions', error);
    }
  }

  /**
   * Obtenir une entrée spécifique par ID
   */
  async getConsumptionById(entryId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      const entry = await ConsumptionEntry.findOne({
        _id: entryId,
        userId,
        'tracking.isDeleted': false
      }).populate('consumedItemRef');

      if (!entry) {
        throw new NotFoundError('Consumption entry not found');
      }

      return {
        entry,
        nutritionSummary: this.getNutritionSummary(entry),
        itemDetails: entry.consumedItemRef,
        relatedEntries: await this.getRelatedEntries(entry, userId)
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError('Failed to retrieve consumption entry', error);
    }
  }

  /**
   * Recherche intelligente dans foods ET recipes
   */
  async searchConsumptionEntries(userId, searchOptions = {}) {
    try {
      const { 
        query, 
        page = 1, 
        limit = 20, 
        itemType, // filter par 'food' ou 'recipe'
        fields = ['metadata.userInput.notes', 'metadata.userInput.tags', 'context.originalRecipe.name'] 
      } = searchOptions;
      
      if (!query || query.length < 2) {
        throw new ValidationError('Search query must be at least 2 characters');
      }

      const searchQuery = {
        userId: new mongoose.Types.ObjectId(userId),
        'tracking.isDeleted': false,
        $text: { $search: query }
      };

      if (itemType) {
        searchQuery['consumedItem.itemType'] = itemType;
      }

      const results = await ConsumptionEntry.find(searchQuery)
        .populate('consumedItemRef')
        .sort({ score: { $meta: 'textScore' }, consumedAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const totalCount = await ConsumptionEntry.countDocuments(searchQuery);

      return {
        results,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        searchQuery: query,
        filters: { itemType }
      };
    } catch (error) {
      throw new BusinessError('Failed to search consumption entries', error);
    }
  }

  // ========================================
  // MISE À JOUR ET SUPPRESSION
  // ========================================

  /**
   * Mettre à jour une entrée de consommation
   */
  async updateConsumptionEntry(entryId, userId, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      // Vérifier que l'entrée existe et appartient à l'utilisateur
      const existingEntry = await ConsumptionEntry.findOne({
        _id: entryId,
        userId,
        'tracking.isDeleted': false
      });
      
      if (!existingEntry) {
        throw new NotFoundError('Consumption entry not found');
      }

      // Validation des nouvelles données selon le type
      if (updateData.quantity !== undefined && existingEntry.consumedItem.itemType === 'food') {
        if (updateData.quantity <= 0) {
          throw new ValidationError('Quantity must be positive for food items');
        }
      }

      if (updateData.servings !== undefined && existingEntry.consumedItem.itemType === 'recipe') {
        if (updateData.servings <= 0) {
          throw new ValidationError('Servings must be positive for recipe items');
        }
      }

      // Préparer les données de mise à jour
      const updateFields = {};
      
      // Champs directs
      if (updateData.mealType) updateFields.mealType = updateData.mealType;
      if (updateData.consumedAt) updateFields.consumedAt = new Date(updateData.consumedAt);
      if (updateData.quantity) updateFields.quantity = updateData.quantity;
      if (updateData.servings) updateFields.servings = updateData.servings;
      if (updateData.unit) updateFields.unit = updateData.unit;

      // Métadonnées
      if (updateData.notes) updateFields['metadata.userInput.notes'] = updateData.notes;
      if (updateData.tags) updateFields['metadata.userInput.tags'] = updateData.tags;
      if (updateData.rating) updateFields['metadata.userInput.rating'] = updateData.rating;
      if (updateData.mood) updateFields['metadata.userInput.mood'] = updateData.mood;

      // Tracking des modifications
      updateFields['tracking.versions'] = {
        $push: {
          changedAt: new Date(),
          changedBy: userId,
          changes: Object.keys(updateData),
          reason: updateData.updateReason || 'user_edit'
        }
      };

      // Mise à jour
      const updatedEntry = await ConsumptionEntry.findByIdAndUpdate(
        entryId,
        updateFields,
        { new: true, runValidators: true }
      ).populate('consumedItemRef');

      // Recalculer la nutrition si nécessaire
      if (updateData.quantity || updateData.servings) {
        await updatedEntry.calculateNutritionFromSource();
        await updatedEntry.save();
      }

      // Recalculer le résumé quotidien
      await this.updateDailySummary(userId, updatedEntry.consumedAt);

      // Log activity
      await UserService.logActivity(userId, {
        action: 'consumption_entry_updated',
        resource: 'consumption',
        metadata: {
          entryId: entryId,
          changes: Object.keys(updateData),
          reason: updateData.updateReason
        }
      });

      return {
        entry: updatedEntry,
        nutritionSummary: this.getNutritionSummary(updatedEntry),
        itemDetails: updatedEntry.consumedItemRef
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError('Failed to update consumption entry', error);
    }
  }

  /**
   * Supprimer une entrée de consommation (soft delete)
   */
  async deleteConsumptionEntry(entryId, userId, options = {}) {
    try {
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      const { reason = 'user_delete', hardDelete = false } = options;

      const entry = await ConsumptionEntry.findOne({
        _id: entryId,
        userId,
        'tracking.isDeleted': false
      });

      if (!entry) {
        throw new NotFoundError('Consumption entry not found');
      }

      if (hardDelete) {
        // Hard delete - remove completely
        await ConsumptionEntry.findByIdAndDelete(entryId);
        
        await this.updateDailySummary(userId, entry.consumedAt);
        
        return {
          message: 'Consumption entry permanently deleted',
          entryId: entryId
        };
      } else {
        // Soft delete
        await entry.softDelete(userId, reason);
        
        await this.updateDailySummary(userId, entry.consumedAt);

        // Log activity
        await UserService.logActivity(userId, {
          action: 'consumption_entry_deleted',
          resource: 'consumption',
          metadata: {
            entryId: entryId,
            reason,
            deletionType: 'soft'
          }
        });

        return {
          message: 'Consumption entry deleted successfully',
          entryId: entryId,
          canRestore: true
        };
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError('Failed to delete consumption entry', error);
    }
  }

  /**
   * Restaurer une entrée supprimée
   */
  async restoreConsumptionEntry(entryId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      const entry = await ConsumptionEntry.findOne({
        _id: entryId,
        userId,
        'tracking.isDeleted': true
      });

      if (!entry) {
        throw new NotFoundError('Consumption entry not found or cannot be restored');
      }

      await entry.restore(userId);
      await this.updateDailySummary(userId, entry.consumedAt);

      // Log activity
      await UserService.logActivity(userId, {
        action: 'consumption_entry_restored',
        resource: 'consumption',
        metadata: {
          entryId: entryId
        }
      });

      return {
        message: 'Consumption entry restored successfully',
        entry,
        nutritionSummary: this.getNutritionSummary(entry)
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError('Failed to restore consumption entry', error);
    }
  }

  /**
   * Dupliquer une entrée
   */
  async duplicateConsumptionEntry(entryId, userId, duplicateData = {}) {
    try {
      const originalEntry = await this.getConsumptionById(entryId, userId);
      
      const newEntryData = {
        itemType: originalEntry.entry.consumedItem.itemType,
        itemId: originalEntry.entry.consumedItem.itemId.toString(),
        mealType: duplicateData.mealType || originalEntry.entry.mealType,
        consumedAt: duplicateData.consumedAt || new Date(),
        entryMethod: 'manual',
        notes: duplicateData.notes || originalEntry.entry.metadata?.userInput?.notes,
        tags: originalEntry.entry.metadata?.userInput?.tags || [],
        
        // Copier la quantité selon le type
        ...(originalEntry.entry.consumedItem.itemType === 'food' && {
          quantity: duplicateData.quantity || originalEntry.entry.quantity,
          unit: duplicateData.unit || originalEntry.entry.unit
        }),
        ...(originalEntry.entry.consumedItem.itemType === 'recipe' && {
          servings: duplicateData.servings || originalEntry.entry.servings
        }),

        context: {
          ...originalEntry.entry.context,
          isDuplicate: true,
          originalEntryId: entryId
        }
      };

      return await this.createConsumptionEntry(userId, newEntryData);
    } catch (error) {
      throw new BusinessError('Failed to duplicate consumption entry', error);
    }
  }

  // ========================================
  // ANALYTICS ET DASHBOARD
  // ========================================

  /**
   * Dashboard unifié avec food + recipe analytics
   */
  async getNutritionDashboard(userId, period = 'today', options = {}) {
    try {
      const { dateFrom, dateTo } = this.getDateRange(period, options);
      
      // Statistiques par type d'item
      const itemTypeStats = await ConsumptionEntry.getNutritionStatsByType(userId, dateFrom, dateTo);
      
      // Top items consommés (foods + recipes)
      const topItems = await ConsumptionEntry.getTopConsumedItems(userId, { 
        limit: 10, 
        period: period === 'today' ? 'week' : period 
      });
      
      // Stats par repas
      const mealStats = await this.getMealStatsByType(userId, dateFrom, dateTo);
      
      // Totaux
      const totals = await this.calculateTotalNutrition(userId, dateFrom, dateTo);

      // Goals et progress
      const goals = await this.getUserNutritionGoals(userId);
      const progress = goals ? this.calculateGoalsProgress(totals, goals) : null;

      return {
        period,
        dateRange: { from: dateFrom, to: dateTo },
        totals,
        breakdown: {
          byItemType: this.formatItemTypeStats(itemTypeStats),
          byMealType: this.formatMealStats(mealStats),
          topItems: this.formatTopItems(topItems)
        },
        goals,
        progress,
        insights: await this.generateInsights(userId, totals, goals),
        lastEntry: await this.getLastEntry(userId)
      };
    } catch (error) {
      throw new BusinessError('Failed to generate nutrition dashboard', error);
    }
  }

  /**
   * Obtenir les statistiques pour une période personnalisée
   */
  async getCustomPeriodStats(userId, options = {}) {
    try {
      const { 
        dateFrom, 
        dateTo, 
        groupBy = 'day', 
        metrics = ['calories', 'protein', 'carbs', 'fat'],
        includeComparison = false 
      } = options;

      if (!dateFrom || !dateTo) {
        throw new ValidationError('dateFrom and dateTo are required');
      }

      const stats = await ConsumptionEntry.getNutritionStatsByType(
        userId, 
        new Date(dateFrom), 
        new Date(dateTo)
      );
      
      const totals = await this.calculateTotalNutrition(
        userId, 
        new Date(dateFrom), 
        new Date(dateTo)
      );

      let groupedStats = this.formatDailyStats(stats);
      
      // Group by week or month if requested
      if (groupBy === 'week') {
        groupedStats = this.groupStatsByWeek(groupedStats);
      } else if (groupBy === 'month') {
        groupedStats = this.groupStatsByMonth(groupedStats);
      }

      // Filter metrics
      if (metrics.length < 4) {
        groupedStats = this.filterMetrics(groupedStats, metrics);
      }
      
      return {
        period: 'custom',
        dateFrom,
        dateTo,
        groupBy,
        metrics,
        totals,
        breakdown: groupedStats,
        averages: this.calculateAverages(groupedStats),
        trends: this.calculateTrends(groupedStats)
      };
    } catch (error) {
      throw new BusinessError('Failed to get custom period statistics', error);
    }
  }

  /**
   * Top items consommés (unified food + recipe)
   */
  async getTopConsumedItems(userId, options = {}) {
    try {
      const results = await ConsumptionEntry.getTopConsumedItems(userId, options);
      
      return {
        items: results.map(item => ({
          id: item._id.itemId,
          type: item._id.itemType,
          name: item.foodData[0]?.name || item.recipeData[0]?.name || 'Unknown',
          consumptionCount: item.consumptionCount,
          totalCalories: Math.round(item.totalCalories),
          avgCaloriesPerServing: Math.round(item.avgCaloriesPerServing),
          lastConsumed: item.lastConsumed,
          totalQuantity: item.totalQuantity,
          details: item.foodData[0] || item.recipeData[0] || null
        })),
        generatedAt: new Date(),
        period: options.period || 'month',
        filters: options
      };
    } catch (error) {
      throw new BusinessError('Failed to get top consumed items', error);
    }
  }

  // ========================================
  // OPÉRATIONS EN LOT
  // ========================================

  /**
   * Opérations en lot
   */
  async batchOperations(userId, options = {}) {
    try {
      const { operation, entryIds, updateData, performedBy, performedAt } = options;

      if (!['delete', 'update', 'duplicate', 'recalculate'].includes(operation)) {
        throw new ValidationError('Invalid batch operation');
      }

      if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
        throw new ValidationError('Entry IDs array is required');
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const entryId of entryIds) {
        try {
          let result;
          
          switch (operation) {
            case 'delete':
              result = await this.deleteConsumptionEntry(entryId, userId, {
                reason: 'batch_delete'
              });
              break;
              
            case 'update':
              result = await this.updateConsumptionEntry(entryId, userId, updateData);
              break;
              
            case 'duplicate':
              result = await this.duplicateConsumptionEntry(entryId, userId);
              break;

            case 'recalculate':
              result = await this.recalculateNutrition(entryId, userId);
              break;
          }
          
          results.push({ entryId, success: true, result });
          successCount++;
          
        } catch (error) {
          results.push({ entryId, success: false, error: error.message });
          errorCount++;
        }
      }

      // Log batch operation
      await UserService.logActivity(userId, {
        action: `batch_${operation}`,
        resource: 'consumption',
        metadata: {
          totalItems: entryIds.length,
          successCount,
          errorCount,
          performedBy,
          performedAt
        }
      });

      return {
        operation,
        totalProcessed: entryIds.length,
        successCount,
        errorCount,
        results
      };
    } catch (error) {
      throw new BusinessError('Failed to perform batch operations', error);
    }
  }

  /**
   * Recalculer la nutrition d'une entrée
   */
  async recalculateNutrition(entryId, userId) {
    try {
      const entry = await ConsumptionEntry.findOne({
        _id: entryId,
        userId,
        'tracking.isDeleted': false
      });

      if (!entry) {
        throw new NotFoundError('Consumption entry not found');
      }

      await entry.calculateNutritionFromSource();
      await entry.save();

      return {
        message: 'Nutrition recalculated successfully',
        entry,
        nutritionSummary: this.getNutritionSummary(entry)
      };
    } catch (error) {
      throw new BusinessError('Failed to recalculate nutrition', error);
    }
  }

  // ========================================
  // SUGGESTIONS ET RECOMMANDATIONS
  // ========================================

  /**
   * Suggestions d'aliments
   */
  async getFoodSuggestions(userId, options = {}) {
    try {
      const { 
        mealType, 
        timeOfDay, 
        limit = 10, 
        basedOnHistory = true, 
        basedOnGoals = true 
      } = options;

      let suggestions = [];

      if (basedOnHistory) {
        // Get frequently consumed foods
        const topFoods = await ConsumptionEntry.getTopConsumedItems(userId, { 
          limit: limit * 2,
          itemType: 'food',
          mealType 
        });
        
        suggestions = topFoods.map(item => ({
          item: item.foodData[0] || item.recipeData[0],
          type: 'food',
          reason: 'frequently_eaten',
          confidence: Math.min(item.consumptionCount / 10, 1),
          metadata: {
            consumptionCount: item.consumptionCount,
            lastConsumed: item.lastConsumed
          }
        }));
      }

      return {
        suggestions: suggestions.slice(0, limit),
        generatedAt: new Date(),
        basedOn: [
          ...(basedOnHistory ? ['user_history'] : []),
          ...(basedOnGoals ? ['nutrition_goals'] : [])
        ]
      };
    } catch (error) {
      throw new BusinessError('Failed to get food suggestions', error);
    }
  }

  /**
   * Suggestions de recettes
   */
  async getRecipeSuggestions(userId, options = {}) {
    try {
      const { 
        mealType, 
        limit = 10, 
        basedOnHistory = true,
        basedOnIngredients = false
      } = options;

      let suggestions = [];

      if (basedOnHistory) {
        // Get frequently consumed recipes
        const topRecipes = await ConsumptionEntry.getTopConsumedItems(userId, { 
          limit: limit * 2,
          itemType: 'recipe',
          mealType 
        });
        
        suggestions = topRecipes.map(item => ({
          item: item.recipeData[0] || item.foodData[0],
          type: 'recipe',
          reason: 'frequently_made',
          confidence: Math.min(item.consumptionCount / 5, 1),
          metadata: {
            consumptionCount: item.consumptionCount,
            lastConsumed: item.lastConsumed
          }
        }));
      }

      if (basedOnIngredients) {
        // TODO: Implémenter suggestions basées sur les ingrédients fréquemment consommés
      }

      return {
        suggestions: suggestions.slice(0, limit),
        generatedAt: new Date(),
        basedOn: [
          ...(basedOnHistory ? ['recipe_history'] : []),
          ...(basedOnIngredients ? ['ingredient_patterns'] : [])
        ]
      };
    } catch (error) {
      throw new BusinessError('Failed to get recipe suggestions', error);
    }
  }

  // ========================================
  // EXPORT ET RAPPORTS
  // ========================================

  /**
   * Export des données unifiées
   */
  async exportUserConsumptions(userId, options = {}) {
    try {
      const { 
        format = 'json', 
        dateFrom, 
        dateTo, 
        includeNutrition = true,
        includeItemDetails = true,
        includeMetadata = false,
        limit = 10000 
      } = options;

      const filters = { limit };
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const data = await this.getUserConsumptions(userId, filters);

      const exportData = {
        user: userId,
        exportedAt: new Date().toISOString(),
        format,
        filters: { dateFrom, dateTo },
        totalEntries: data.entries.length,
        entries: data.entries.map(entry => ({
          id: entry._id,
          itemType: entry.consumedItem?.itemType,
          itemId: entry.consumedItem?.itemId,
          ...(entry.consumedItem?.itemType === 'food' && {
            quantity: entry.quantity,
            unit: entry.unit
          }),
          ...(entry.consumedItem?.itemType === 'recipe' && {
            servings: entry.servings
          }),
          mealType: entry.mealType,
          consumedAt: entry.consumedAt,
          entryMethod: entry.entryMethod,
          ...(includeNutrition && { 
            nutrition: entry.calculatedNutrition,
            nutritionConfidence: entry.calculatedNutrition?.confidence
          }),
          ...(includeItemDetails && { 
            itemDetails: entry.consumedItemRef
          }),
          ...(includeMetadata && { 
            metadata: entry.metadata,
            context: entry.context,
            tracking: entry.tracking
          })
        }))
      };

      if (format === 'json') {
        return exportData;
      }

      // TODO: Implement CSV/XLSX export
      return exportData;
    } catch (error) {
      throw new BusinessError('Failed to export consumption data', error);
    }
  }

  // ========================================
  // MAINTENANCE ET SYNCHRONISATION
  // ========================================

  /**
   * Valider qu'un aliment existe encore
   */
  async validateFoodExists(foodId) {
    try {
      const food = await FoodService.getFoodById(foodId);
      return {
        exists: !!food,
        food: food || null,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        exists: false,
        food: null,
        error: error.message,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Valider qu'une recette existe encore
   */
  async validateRecipeExists(recipeId) {
    try {
      const recipe = await RecipeService.getRecipeById(recipeId, false);
      return {
        exists: !!recipe,
        recipe: recipe || null,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        exists: false,
        recipe: null,
        error: error.message,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Synchroniser les données nutritionnelles
   */
  async syncNutritionData(userId, options = {}) {
    try {
      const { force = false, itemType } = options;
      
      const filters = {
        userId,
        'tracking.isDeleted': false
      };

      if (itemType) {
        filters['consumedItem.itemType'] = itemType;
      }

      const entries = await ConsumptionEntry.find(filters);
      
      let updated = 0;
      let errors = 0;

      for (const entry of entries) {
        try {
          const oldCalories = entry.calculatedNutrition?.calories || 0;
          
          await entry.calculateNutritionFromSource();
          
          if (force || Math.abs(oldCalories - entry.calculatedNutrition.calories) > 5) {
            await entry.save();
            updated++;
          }
        } catch (error) {
          console.error(`Error syncing entry ${entry._id}:`, error);
          errors++;
        }
      }

      return {
        message: 'Nutrition data synchronization completed',
        totalEntries: entries.length,
        updated,
        errors,
        syncedAt: new Date()
      };
    } catch (error) {
      throw new BusinessError('Failed to sync nutrition data', error);
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Valider et résoudre l'item (food ou recipe)
   */
  async validateAndResolveItem(entryData) {
    // Option 1: itemType et itemId fournis explicitement
    if (entryData.itemType && entryData.itemId) {
      const { itemType, itemId } = entryData;
      
      if (!['food', 'recipe'].includes(itemType)) {
        throw new ValidationError('itemType must be "food" or "recipe"');
      }

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        throw new ValidationError('Invalid itemId format');
      }

      // Vérifier l'existence
      if (itemType === 'food') {
        const validation = await this.validateFoodExists(itemId);
        if (!validation.exists) {
          throw new NotFoundError('Food not found');
        }
      } else {
        const validation = await this.validateRecipeExists(itemId);
        if (!validation.exists) {
          throw new NotFoundError('Recipe not found');
        }
      }

      return { itemType, itemId };
    }

    // Option 2: Legacy - foodId fourni (backward compatibility)
    if (entryData.foodId) {
      const validation = await this.validateFoodExists(entryData.foodId);
      if (!validation.exists) {
        throw new NotFoundError('Food not found');
      }
      return { itemType: 'food', itemId: entryData.foodId };
    }

    // Option 3: recipeId fourni
    if (entryData.recipeId) {
      const validation = await this.validateRecipeExists(entryData.recipeId);
      if (!validation.exists) {
        throw new NotFoundError('Recipe not found');
      }
      return { itemType: 'recipe', itemId: entryData.recipeId };
    }

    throw new ValidationError('Either itemType+itemId, foodId, or recipeId must be provided');
  }

  /**
   * Validation des données d'entrée
   */
  validateEntryData(entryData) {
    // Validation de base
    if (!entryData.itemType && !entryData.foodId && !entryData.recipeId) {
      throw new ValidationError('Item identification is required (itemType+itemId, foodId, or recipeId)');
    }

    // Validation conditionnelle
    if (entryData.itemType === 'food' || entryData.foodId) {
      if (!entryData.quantity || entryData.quantity <= 0) {
        throw new ValidationError('Valid quantity is required for food items');
      }
      
      const validUnits = ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];
      if (entryData.unit && !validUnits.includes(entryData.unit)) {
        throw new ValidationError(`Invalid unit. Must be one of: ${validUnits.join(', ')}`);
      }
    }

    if (entryData.itemType === 'recipe' || entryData.recipeId) {
      if (!entryData.servings || entryData.servings <= 0) {
        throw new ValidationError('Valid servings count is required for recipe items');
      }
    }

    // Validation des enums
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (entryData.mealType && !validMealTypes.includes(entryData.mealType)) {
      throw new ValidationError(`Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`);
    }

    const validEntryMethods = ['barcode_scan', 'image_analysis', 'manual', 'recipe', 'voice', 'quick_meal'];
    if (entryData.entryMethod && !validEntryMethods.includes(entryData.entryMethod)) {
      throw new ValidationError(`Invalid entry method. Must be one of: ${validEntryMethods.join(', ')}`);
    }
  }

  getNutritionSummary(entry) {
    const nutrition = entry.calculatedNutrition || {};
    return {
      calories: nutrition.calories || 0,
      protein: nutrition.protein || 0,
      carbs: nutrition.carbs || 0,
      fat: nutrition.fat || 0,
      fiber: nutrition.fiber || 0,
      sugar: nutrition.sugar || 0,
      sodium: nutrition.sodium || 0,
      confidence: nutrition.confidence || 1,
      calculationSource: nutrition.calculationSource || 'unknown'
    };
  }

  getItemTypeCounts(entries) {
    return entries.reduce((counts, entry) => {
      const type = entry.consumedItem?.itemType || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
  }

  async calculateTotalNutrition(userId, dateFrom, dateTo) {
    const result = await ConsumptionEntry.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          consumedAt: { $gte: dateFrom, $lte: dateTo },
          'tracking.isDeleted': false
        }
      },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$calculatedNutrition.calories' },
          totalProtein: { $sum: '$calculatedNutrition.protein' },
          totalCarbs: { $sum: '$calculatedNutrition.carbs' },
          totalFat: { $sum: '$calculatedNutrition.fat' },
          totalFiber: { $sum: '$calculatedNutrition.fiber' },
          totalSugar: { $sum: '$calculatedNutrition.sugar' },
          totalSodium: { $sum: '$calculatedNutrition.sodium' },
          totalEntries: { $sum: 1 },
          avgConfidence: { $avg: '$calculatedNutrition.confidence' }
        }
      }
    ]);

    return result[0] || {
      totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
      totalFiber: 0, totalSugar: 0, totalSodium: 0, totalEntries: 0, avgConfidence: 1
    };
  }

  async getMealStatsByType(userId, dateFrom, dateTo) {
    return await ConsumptionEntry.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          consumedAt: { $gte: dateFrom, $lte: dateTo },
          'tracking.isDeleted': false
        }
      },
      {
        $group: {
          _id: '$mealType',
          calories: { $sum: '$calculatedNutrition.calories' },
          protein: { $sum: '$calculatedNutrition.protein' },
          carbs: { $sum: '$calculatedNutrition.carbs' },
          fat: { $sum: '$calculatedNutrition.fat' },
          entries: { $sum: 1 }
        }
      }
    ]);
  }

  formatItemTypeStats(stats) {
    const formatted = {
      food: { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0, confidence: 0 },
      recipe: { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0, confidence: 0 }
    };

    stats.forEach(stat => {
      const type = stat._id.itemType;
      if (formatted[type]) {
        formatted[type].calories += stat.totalCalories || 0;
        formatted[type].protein += stat.totalProtein || 0;
        formatted[type].carbs += stat.totalCarbs || 0;
        formatted[type].fat += stat.totalFat || 0;
        formatted[type].entries += stat.entriesCount || 0;
        formatted[type].confidence += stat.avgConfidence || 0;
      }
    });

    // Calculate average confidence
    Object.keys(formatted).forEach(type => {
      if (formatted[type].entries > 0) {
        formatted[type].confidence = formatted[type].confidence / formatted[type].entries;
      }
    });

    return formatted;
  }

  formatMealStats(mealStats) {
    const formatted = {
      breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 },
      lunch: { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 },
      dinner: { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 },
      snack: { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 },
      other: { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 }
    };

    mealStats.forEach(stat => {
      if (formatted[stat._id]) {
        formatted[stat._id] = {
          calories: Math.round(stat.calories || 0),
          protein: Math.round(stat.protein || 0),
          carbs: Math.round(stat.carbs || 0),
          fat: Math.round(stat.fat || 0),
          entries: stat.entries || 0
        };
      }
    });

    return formatted;
  }

  formatTopItems(topItems) {
    return topItems.map(item => ({
      id: item._id.itemId,
      type: item._id.itemType,
      name: item.foodData[0]?.name || item.recipeData[0]?.name || 'Unknown',
      consumptionCount: item.consumptionCount,
      totalCalories: Math.round(item.totalCalories),
      avgCaloriesPerServing: Math.round(item.avgCaloriesPerServing),
      lastConsumed: item.lastConsumed
    }));
  }

  formatDailyStats(stats) {
    const dailyStats = {};
    
    stats.forEach(stat => {
      const date = stat._id.date;
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalEntries: 0,
          byItemType: { food: {}, recipe: {} },
          byMealType: {}
        };
      }
      
      const itemType = stat._id.itemType;
      const mealType = stat._id.mealType;
      
      dailyStats[date].byItemType[itemType][mealType] = {
        calories: parseFloat(stat.totalCalories) || 0,
        protein: parseFloat(stat.totalProtein) || 0,
        carbs: parseFloat(stat.totalCarbs) || 0,
        fat: parseFloat(stat.totalFat) || 0,
        entries: parseInt(stat.entriesCount) || 0
      };
      
      if (!dailyStats[date].byMealType[mealType]) {
        dailyStats[date].byMealType[mealType] = { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 };
      }
      
      dailyStats[date].byMealType[mealType].calories += parseFloat(stat.totalCalories) || 0;
      dailyStats[date].byMealType[mealType].protein += parseFloat(stat.totalProtein) || 0;
      dailyStats[date].byMealType[mealType].carbs += parseFloat(stat.totalCarbs) || 0;
      dailyStats[date].byMealType[mealType].fat += parseFloat(stat.totalFat) || 0;
      dailyStats[date].byMealType[mealType].entries += parseInt(stat.entriesCount) || 0;
      
      dailyStats[date].totalCalories += parseFloat(stat.totalCalories) || 0;
      dailyStats[date].totalProtein += parseFloat(stat.totalProtein) || 0;
      dailyStats[date].totalCarbs += parseFloat(stat.totalCarbs) || 0;
      dailyStats[date].totalFat += parseFloat(stat.totalFat) || 0;
      dailyStats[date].totalEntries += parseInt(stat.entriesCount) || 0;
    });

    return Object.values(dailyStats);
  }

  getDateRange(period, options = {}) {
    const now = new Date();
    const { weekOffset = 0, monthOffset = 0 } = options;
    let dateFrom, dateTo;

    switch (period) {
      case 'today':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateTo = new Date(dateFrom);
        dateTo.setDate(dateTo.getDate() + 1);
        break;
        
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + (weekOffset * 7));
        weekStart.setHours(0, 0, 0, 0);
        dateFrom = weekStart;
        dateTo = new Date(weekStart);
        dateTo.setDate(dateTo.getDate() + 7);
        break;
        
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
        dateTo = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
        break;
        
      default:
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateTo = new Date(dateFrom);
        dateTo.setDate(dateTo.getDate() + 1);
    }

    return { dateFrom, dateTo };
  }

  async generateInsights(userId, totals, goals) {
    const insights = [];

    // Insight sur les calories
    if (goals?.dailyCaloriesTarget) {
      const progress = (totals.totalCalories / goals.dailyCaloriesTarget) * 100;
      if (progress < 80) {
        insights.push({
          type: 'warning',
          message: `You've consumed ${Math.round(progress)}% of your daily calorie goal. Consider adding a healthy snack.`,
          priority: 'medium'
        });
      } else if (progress > 120) {
        insights.push({
          type: 'info',
          message: `You've exceeded your daily calorie goal by ${Math.round(progress - 100)}%. Consider lighter meals tomorrow.`,
          priority: 'high'
        });
      }
    }

    // Insight sur les macros
    const totalMacros = totals.totalProtein + totals.totalCarbs + totals.totalFat;
    if (totalMacros > 0) {
      const proteinPercent = (totals.totalProtein / totalMacros) * 100;
      if (proteinPercent < 15) {
        insights.push({
          type: 'suggestion',
          message: 'Your protein intake seems low. Consider adding lean proteins to your meals.',
          priority: 'medium'
        });
      }
    }

    return insights;
  }

  async getRelatedEntries(entry, userId, limit = 5) {
    try {
      return await ConsumptionEntry.find({
        userId: userId,
        'consumedItem.itemId': entry.consumedItem.itemId,
        'consumedItem.itemType': entry.consumedItem.itemType,
        _id: { $ne: entry._id },
        'tracking.isDeleted': false
      })
      .sort({ consumedAt: -1 })
      .limit(limit)
      .select('consumedAt mealType calculatedNutrition quantity servings');
    } catch (error) {
      return [];
    }
  }

  async getLastEntry(userId) {
    try {
      return await ConsumptionEntry.findOne({
        userId,
        'tracking.isDeleted': false
      })
      .sort({ consumedAt: -1 })
      .populate('consumedItemRef')
      .select('consumedAt mealType calculatedNutrition consumedItem');
    } catch (error) {
      return null;
    }
  }

  async getUserNutritionGoals(userId) {
    try {
      // Cette méthode devrait récupérer les objectifs de l'utilisateur
      return await UserService.getUserNutritionGoals(userId);
    } catch (error) {
      return null;
    }
  }

  calculateGoalsProgress(totals, goals) {
    if (!goals || !totals) return null;

    return {
      calories: goals.dailyCaloriesTarget ? 
        Math.round((totals.totalCalories / goals.dailyCaloriesTarget) * 100) : 0,
      protein: goals.dailyProteinTarget ? 
        Math.round((totals.totalProtein / goals.dailyProteinTarget) * 100) : 0,
      carbs: goals.dailyCarbsTarget ? 
        Math.round((totals.totalCarbs / goals.dailyCarbsTarget) * 100) : 0,
      fat: goals.dailyFatTarget ? 
        Math.round((totals.totalFat / goals.dailyFatTarget) * 100) : 0
    };
  }

  calculateAverages(groupedStats) {
    if (!groupedStats || groupedStats.length === 0) return {};

    const totals = groupedStats.reduce((acc, day) => {
      acc.calories += day.totalCalories || 0;
      acc.protein += day.totalProtein || 0;
      acc.carbs += day.totalCarbs || 0;
      acc.fat += day.totalFat || 0;
      acc.entries += day.totalEntries || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 });

    const count = groupedStats.length;
    return {
      avgCalories: Math.round(totals.calories / count),
      avgProtein: Math.round(totals.protein / count),
      avgCarbs: Math.round(totals.carbs / count),
      avgFat: Math.round(totals.fat / count),
      avgEntries: Math.round(totals.entries / count)
    };
  }

  calculateTrends(groupedStats) {
    if (!groupedStats || groupedStats.length < 2) return {};

    const first = groupedStats[0];
    const last = groupedStats[groupedStats.length - 1];

    return {
      caloriesTrend: last.totalCalories - first.totalCalories,
      proteinTrend: last.totalProtein - first.totalProtein,
      carbsTrend: last.totalCarbs - first.totalCarbs,
      fatTrend: last.totalFat - first.totalFat
    };
  }

  filterMetrics(groupedStats, metrics) {
    return groupedStats.map(day => {
      const filtered = { date: day.date };
      metrics.forEach(metric => {
        filtered[`total${metric.charAt(0).toUpperCase() + metric.slice(1)}`] = day[`total${metric.charAt(0).toUpperCase() + metric.slice(1)}`] || 0;
      });
      return filtered;
    });
  }

  groupStatsByWeek(dailyStats) {
    // TODO: Implémenter le groupement par semaine
    return dailyStats;
  }

  groupStatsByMonth(dailyStats) {
    // TODO: Implémenter le groupement par mois
    return dailyStats;
  }

  async updateDailySummary(userId, date) {
    try {
      // TODO: Implémenter la mise à jour du résumé quotidien
      // Utiliser votre logique de DailySummary existante
      console.log(`Updating daily summary for user ${userId} on ${date}`);
    } catch (error) {
      console.error('Error updating daily summary:', error);
    }
  }

  // ========================================
  // MÉTHODES LEGACY (BACKWARD COMPATIBILITY)
  // ========================================

  async getUserRecipes(userId, pagination) {
    return this.getUserConsumptions(userId, {
      ...pagination,
      itemType: 'recipe'
    });
  }

  async getPublicRecipes(pagination) {
    // Cette méthode était dans l'ancien service mais ne correspond pas vraiment 
    // au domaine consumption. Elle devrait être dans RecipeService.
    throw new BusinessError('Use RecipeService.getPublicRecipes instead');
  }

  async getNutritionTrends(userId, options) {
    // TODO: Implémenter l'analyse des tendances nutritionnelles
    return this.getCustomPeriodStats(userId, options);
  }

  async getNutritionAnalysis(userId, options) {
    // TODO: Implémenter l'analyse nutritionnelle avancée
    return this.getNutritionDashboard(userId, options.period, options);
  }

  async getPersonalizedInsights(userId) {
    try {
      const today = new Date();
      const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
      
      const totals = await this.calculateTotalNutrition(userId, weekAgo, today);
      const goals = await this.getUserNutritionGoals(userId);
      
      return await this.generateInsights(userId, totals, goals);
    } catch (error) {
      throw new BusinessError('Failed to get personalized insights', error);
    }
  }

  async analyzeImageWithAI(userId, imageData) {
    // TODO: Implémenter l'analyse d'image IA
    throw new BusinessError('AI image analysis not yet implemented');
  }

  async scanBarcode(userId, barcodeData) {
    // TODO: Implémenter le scan de code-barres
    throw new BusinessError('Barcode scanning not yet implemented');
  }

  async processVoiceEntry(userId, voiceData) {
    // TODO: Implémenter l'entrée vocale
    throw new BusinessError('Voice entry not yet implemented');
  }

  async generateWeeklyReport(userId, options) {
    return this.getCustomPeriodStats(userId, {
      ...options,
      groupBy: 'week'
    });
  }

  async generateMonthlyReport(userId, options) {
    return this.getCustomPeriodStats(userId, {
      ...options,
      groupBy: 'month'
    });
  }

  async getGoalsProgress(userId) {
    try {
      const today = new Date();
      const totals = await this.calculateTotalNutrition(userId, today, today);
      const goals = await this.getUserNutritionGoals(userId);
      
      return {
        progress: this.calculateGoalsProgress(totals, goals),
        totals,
        goals,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new BusinessError('Failed to get goals progress', error);
    }
  }

  async updateGoalProgress(userId, goalId, progressData) {
    // TODO: Implémenter la mise à jour du progrès des objectifs
    throw new BusinessError('Goal progress update should be handled by UserService');
  }

  async shareMeal(userId, entryId, shareOptions) {
    // TODO: Implémenter le partage de repas
    throw new BusinessError('Meal sharing not yet implemented');
  }

  async viewSharedMeal(shareId) {
    // TODO: Implémenter la visualisation de repas partagés
    throw new BusinessError('Shared meal viewing not yet implemented');
  }

  async getTopConsumers(options) {
    // TODO: Implémenter pour les admins
    throw new BusinessError('Admin analytics not yet implemented');
  }

  async cleanupConsumptionData(options) {
    // TODO: Implémenter le nettoyage des données
    throw new BusinessError('Data cleanup not yet implemented');
  }

  async getDataQualityReports(options) {
    // TODO: Implémenter les rapports de qualité
    throw new BusinessError('Data quality reports not yet implemented');
  }

  async getGlobalConsumptionStats(options = {}) {
    try {
      const { period = 'month', includeUserBreakdown = false } = options;
      
      const stats = await ConsumptionEntry.aggregate([
        { 
          $match: { 
            'tracking.isDeleted': false 
          } 
        },
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            totalCaloriesTracked: { $sum: '$calculatedNutrition.calories' },
            foodEntries: { 
              $sum: { $cond: [{ $eq: ['$consumedItem.itemType', 'food'] }, 1, 0] } 
            },
            recipeEntries: { 
              $sum: { $cond: [{ $eq: ['$consumedItem.itemType', 'recipe'] }, 1, 0] } 
            },
            barcodeEntries: { 
              $sum: { $cond: [{ $eq: ['$entryMethod', 'barcode_scan'] }, 1, 0] } 
            },
            imageEntries: { 
              $sum: { $cond: [{ $eq: ['$entryMethod', 'image_analysis'] }, 1, 0] } 
            },
            manualEntries: { 
              $sum: { $cond: [{ $eq: ['$entryMethod', 'manual'] }, 1, 0] } 
            },
            avgConfidence: { $avg: '$calculatedNutrition.confidence' }
          }
        },
        {
          $project: {
            totalEntries: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            totalCaloriesTracked: 1,
            foodEntries: 1,
            recipeEntries: 1,
            barcodeEntries: 1,
            imageEntries: 1,
            manualEntries: 1,
            avgConfidence: 1
          }
        }
      ]);
      
      return {
        ...stats[0],
        period,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new BusinessError('Failed to get global consumption statistics', error);
    }
  }

  async getGlobalTrends(options) {
    // TODO: Implémenter les tendances globales
    throw new BusinessError('Global trends not yet implemented');
  }
}

module.exports = new ConsumptionService();