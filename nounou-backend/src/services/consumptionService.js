const { ConsumptionModel, ConsumptionEntry, DailySummary, FoodSuggestion } = require('../models/consumptionModel');
const { ValidationError, NotFoundError, BusinessError } = require('../utils/errors');
const UserService = require('./userService');
const mongoose = require('mongoose');

class ConsumptionService {
  
  // Créer une nouvelle entrée de consommation
  async createConsumptionEntry(userId, entryData) {
    try {
      // Validation des données obligatoires
      this.validateEntryData(entryData);

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      // Calculer les valeurs nutritionnelles si nécessaire
      const calculatedNutrition = await this.calculateNutrition(entryData);

      // Préparer les données pour MongoDB
      const consumptionData = {
        userId: new mongoose.Types.ObjectId(userId),
        foodId: new mongoose.Types.ObjectId(entryData.foodId),
        quantity: entryData.quantity,
        unit: entryData.unit || 'g',
        mealType: entryData.mealType || 'other',
        consumedAt: entryData.consumedAt || new Date(),
        entryMethod: entryData.entryMethod || 'manual',
        confidenceScore: entryData.confidenceScore || null,
        nutrition: calculatedNutrition,
        deviceInfo: entryData.deviceInfo || {},
        location: entryData.location || {},
        notes: entryData.notes || '',
        tags: entryData.tags || [],
        recipeContext: entryData.recipeContext || {},
        aiAnalysis: entryData.aiAnalysis || {}
      };

      const newEntry = await ConsumptionModel.create(consumptionData);
      
      // Recalculer le résumé quotidien
      await this.updateDailySummary(userId, newEntry.consumedAt);

      // Log activity
      await UserService.logActivity(userId, {
        action: 'consumption_entry_created',
        resource: 'consumption',
        metadata: {
          entryId: newEntry._id.toString(),
          foodId: entryData.foodId,
          mealType: newEntry.mealType,
          calories: calculatedNutrition.calories,
          entryMethod: newEntry.entryMethod
        }
      });
      
      return {
        entry: newEntry,
        nutritionSummary: this.getNutritionSummary(newEntry)
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError('Failed to create consumption entry', error);
    }
  }

  // Obtenir les entrées de consommation d'un utilisateur
  async getUserConsumptions(userId, filters = {}) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      const {
        page = 1,
        limit = 20,
        mealType,
        dateFrom,
        dateTo,
        entryMethod,
        search,
        tags,
        sortBy = 'consumedAt',
        sortOrder = 'desc',
        minCalories,
        maxCalories,
        includeNutrition = true,
        includeFood = true
      } = filters;

      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        mealType,
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
        entryMethod,
        search,
        tags,
        sortBy,
        sortOrder: sortOrder === 'desc' ? -1 : 1,
        minCalories: minCalories ? parseFloat(minCalories) : null,
        maxCalories: maxCalories ? parseFloat(maxCalories) : null,
        includeNutrition,
        includeFood
      };

      const entries = await ConsumptionModel.findByUserId(userId, options);
      const totalCount = await ConsumptionModel.countUserEntries(userId, {
        mealType,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        entryMethod
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
        }
      };
    } catch (error) {
      throw new BusinessError('Failed to retrieve user consumptions', error);
    }
  }

  // Obtenir une entrée spécifique
  async getConsumptionById(entryId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      const entry = await ConsumptionModel.findById(entryId);
      
      if (!entry) {
        throw new NotFoundError('Consumption entry not found');
      }

      // Vérifier que l'entrée appartient à l'utilisateur
      if (entry.userId.toString() !== userId) {
        throw new NotFoundError('Consumption entry not found');
      }

      return {
        entry,
        nutritionSummary: this.getNutritionSummary(entry),
        relatedEntries: await this.getRelatedEntries(entry, userId)
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError('Failed to retrieve consumption entry', error);
    }
  }

  // Mettre à jour une entrée de consommation
  async updateConsumptionEntry(entryId, userId, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      // Vérifier que l'entrée existe et appartient à l'utilisateur
      const existingEntry = await ConsumptionModel.findById(entryId);
      
      if (!existingEntry || existingEntry.userId.toString() !== userId) {
        throw new NotFoundError('Consumption entry not found');
      }

      // Validation des nouvelles données
      if (updateData.quantity !== undefined || updateData.foodId !== undefined) {
        const recalculatedNutrition = await this.calculateNutrition({
          foodId: updateData.foodId || existingEntry.foodId.toString(),
          quantity: updateData.quantity || existingEntry.quantity,
          entryMethod: updateData.entryMethod || existingEntry.entryMethod,
          ...updateData
        });
        
        updateData.nutrition = recalculatedNutrition;
      }

      const updatedEntry = await ConsumptionModel.update(entryId, updateData);
      
      if (!updatedEntry) {
        throw new NotFoundError('Failed to update consumption entry');
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
          reason: updateData.lastModified?.reason
        }
      });

      return {
        entry: updatedEntry,
        nutritionSummary: this.getNutritionSummary(updatedEntry)
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError('Failed to update consumption entry', error);
    }
  }

  // Supprimer une entrée de consommation (soft delete)
  async deleteConsumptionEntry(entryId, userId, options = {}) {
    try {
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      const { reason = 'user_delete', hardDelete = false } = options;

      if (hardDelete) {
        // Hard delete - remove completely
        const deletedEntry = await ConsumptionEntry.findOneAndDelete({
          _id: entryId,
          userId: userId
        });
        
        if (!deletedEntry) {
          throw new NotFoundError('Consumption entry not found');
        }

        await this.updateDailySummary(userId, deletedEntry.consumedAt);
        
        return {
          message: 'Consumption entry permanently deleted',
          entryId: deletedEntry._id.toString()
        };
      } else {
        // Soft delete
        const deletedEntry = await ConsumptionModel.softDelete(entryId, userId);
        
        if (!deletedEntry) {
          throw new NotFoundError('Consumption entry not found');
        }

        await this.updateDailySummary(userId, deletedEntry.consumedAt);

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
          entryId: deletedEntry._id.toString(),
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

  // Restaurer une entrée supprimée
  async restoreConsumptionEntry(entryId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      const restoredEntry = await ConsumptionModel.restore(entryId, userId);
      
      if (!restoredEntry) {
        throw new NotFoundError('Consumption entry not found or cannot be restored');
      }

      await this.updateDailySummary(userId, restoredEntry.consumedAt);

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
        entry: restoredEntry,
        nutritionSummary: this.getNutritionSummary(restoredEntry)
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError('Failed to restore consumption entry', error);
    }
  }

  // Dupliquer une entrée
  async duplicateConsumptionEntry(entryId, userId, duplicateData = {}) {
    try {
      const originalEntry = await this.getConsumptionById(entryId, userId);
      
      const newEntryData = {
        foodId: originalEntry.entry.foodId.toString(),
        quantity: duplicateData.quantity || originalEntry.entry.quantity,
        unit: duplicateData.unit || originalEntry.entry.unit,
        mealType: duplicateData.mealType || originalEntry.entry.mealType,
        consumedAt: duplicateData.consumedAt || new Date(),
        entryMethod: 'manual',
        notes: duplicateData.notes || originalEntry.entry.notes,
        tags: originalEntry.entry.tags || [],
        isDuplicate: true,
        originalEntryId: entryId,
        // Copy nutrition values
        nutrition: originalEntry.entry.nutrition
      };

      return await this.createConsumptionEntry(userId, newEntryData);
    } catch (error) {
      throw new BusinessError('Failed to duplicate consumption entry', error);
    }
  }

  // Ajouter un repas rapide
  async addQuickMeal(userId, mealData) {
    try {
      const { foods, mealType = 'other', recipeName, mealNotes, tags, consumedAt = new Date() } = mealData;

      if (!foods || !Array.isArray(foods) || foods.length === 0) {
        throw new ValidationError('Foods array is required and cannot be empty');
      }

      const results = [];
      let totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      
      // Créer une entrée pour chaque aliment
      for (const food of foods) {
        const entryData = {
          ...food,
          mealType,
          consumedAt,
          entryMethod: 'recipe',
          notes: food.notes || mealNotes,
          tags: [...(food.tags || []), ...(tags || [])],
          recipeContext: {
            recipeName,
            mealNotes,
            isQuickMeal: true
          }
        };
        
        const result = await this.createConsumptionEntry(userId, entryData);
        results.push(result);

        // Calculate totals
        const nutrition = result.nutritionSummary;
        totalNutrition.calories += nutrition.calories || 0;
        totalNutrition.protein += nutrition.protein || 0;
        totalNutrition.carbs += nutrition.carbs || 0;
        totalNutrition.fat += nutrition.fat || 0;
      }

      // Log quick meal creation
      await UserService.logActivity(userId, {
        action: 'quick_meal_created',
        resource: 'consumption',
        metadata: {
          mealType,
          recipeName,
          itemsCount: results.length,
          totalCalories: totalNutrition.calories
        }
      });

      return {
        entries: results,
        mealSummary: {
          totalItems: results.length,
          totalNutrition,
          mealType,
          recipeName,
          consumedAt
        }
      };
    } catch (error) {
      throw new BusinessError('Failed to add quick meal', error);
    }
  }

  // Obtenir les statistiques nutritionnelles pour le dashboard
  async getNutritionDashboard(userId, period = 'today', options = {}) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      const { 
        includeComparison = false, 
        includeGoals = true, 
        includeInsights = false,
        weekOffset = 0,
        monthOffset = 0
      } = options;

      const { dateFrom, dateTo } = this.getDateRange(period, { weekOffset, monthOffset });
      
      // Get daily summary if it's a single day
      let dailySummary = null;
      if (period === 'today') {
        dailySummary = await DailySummary.findOne({
          userId: new mongoose.Types.ObjectId(userId),
          date: dateFrom
        });
        
        if (!dailySummary) {
          dailySummary = await DailySummary.recalculateForDate(userId, dateFrom);
        }
      }

      // Statistiques par type de repas
      const mealStats = await ConsumptionModel.getTodayMealStats(userId);
      
      // Statistiques nutritionnelles détaillées
      const nutritionStats = await ConsumptionModel.getNutritionStats(userId, dateFrom, dateTo);
      
      // Total des calories pour la période
      const totalCalories = await ConsumptionModel.getTotalCalories(userId, dateFrom, dateTo);
      
      // Aliments les plus consommés
      const topFoods = await ConsumptionModel.getMostConsumedFoods(userId, 5);

      // Goals comparison
      let goals = null;
      if (includeGoals) {
        goals = await this.getUserNutritionGoals(userId);
      }

      // Previous period comparison
      let comparison = null;
      if (includeComparison) {
        comparison = await this.getPeriodComparison(userId, period, { weekOffset, monthOffset });
      }

      // Insights
      let insights = null;
      if (includeInsights) {
        insights = await this.generateNutritionInsights(userId, period);
      }

      return {
        period,
        dateRange: { from: dateFrom, to: dateTo },
        totalCalories: totalCalories.totalCalories || 0,
        totalEntries: totalCalories.totalEntries || 0,
        mealBreakdown: this.formatMealStats(mealStats),
        nutritionBreakdown: this.formatNutritionStats(nutritionStats),
        topConsumedFoods: topFoods,
        summary: this.generateDashboardSummary(mealStats, totalCalories),
        dailySummary,
        goals,
        progress: goals ? this.calculateGoalsProgress(totalCalories, goals) : null,
        comparison,
        insights,
        lastEntry: await this.getLastEntry(userId)
      };
    } catch (error) {
      throw new BusinessError('Failed to generate nutrition dashboard', error);
    }
  }

  // Obtenir les statistiques pour une période personnalisée
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

      const stats = await ConsumptionModel.getNutritionStats(
        userId, 
        new Date(dateFrom), 
        new Date(dateTo)
      );
      
      const totalCalories = await ConsumptionModel.getTotalCalories(
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
        totalCalories: totalCalories.totalCalories || 0,
        totalEntries: totalCalories.totalEntries || 0,
        breakdown: groupedStats,
        averages: this.calculateAverages(groupedStats),
        trends: this.calculateTrends(groupedStats)
      };
    } catch (error) {
      throw new BusinessError('Failed to get custom period statistics', error);
    }
  }

  // Rechercher des entrées
  async searchConsumptionEntries(userId, searchOptions = {}) {
    try {
      return await ConsumptionModel.searchEntries(userId, searchOptions);
    } catch (error) {
      throw new BusinessError('Failed to search consumption entries', error);
    }
  }

  // Suggestions d'aliments
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
        const topFoods = await ConsumptionModel.getTopFoods(userId, { 
          limit: limit * 2,
          mealType 
        });
        
        suggestions = topFoods.map(food => ({
          food: food.food,
          reason: 'frequently_eaten',
          confidence: Math.min(food.consumptionCount / 10, 1),
          metadata: {
            consumptionCount: food.consumptionCount,
            lastConsumed: food.lastConsumed
          }
        }));
      }

      // TODO: Add goal-based suggestions
      // TODO: Add time-pattern suggestions
      // TODO: Add similar-users suggestions

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

  // Opérations en lot
  async batchOperations(userId, options = {}) {
    try {
      const { operation, entryIds, updateData, performedBy, performedAt } = options;

      if (!['delete', 'update', 'duplicate'].includes(operation)) {
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

  // Export des données
  async exportUserConsumptions(userId, options = {}) {
    try {
      const { 
        format = 'json', 
        dateFrom, 
        dateTo, 
        includeNutrition = true,
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
          foodId: entry.foodId,
          quantity: entry.quantity,
          unit: entry.unit,
          mealType: entry.mealType,
          consumedAt: entry.consumedAt,
          entryMethod: entry.entryMethod,
          ...(includeNutrition && { nutrition: entry.nutrition }),
          ...(includeMetadata && { 
            deviceInfo: entry.deviceInfo,
            location: entry.location,
            notes: entry.notes,
            tags: entry.tags
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

  // Helper methods

  async calculateNutrition(entryData) {
    // Pour l'instant, on utilise des valeurs par défaut ou celles fournies
    // Plus tard, ceci pourrait faire appel à une API externe ou à une base de données d'aliments
    
    const {
      quantity = 100,
      nutrition = {},
      caloriesCalculated = 0,
      proteinCalculated = 0,
      carbsCalculated = 0,
      fatCalculated = 0,
      fiberCalculated = 0,
      sugarCalculated = 0,
      sodiumCalculated = 0
    } = entryData;

    return {
      calories: parseFloat(nutrition.calories || caloriesCalculated) || 0,
      protein: parseFloat(nutrition.protein || proteinCalculated) || 0,
      carbs: parseFloat(nutrition.carbs || carbsCalculated) || 0,
      fat: parseFloat(nutrition.fat || fatCalculated) || 0,
      fiber: parseFloat(nutrition.fiber || fiberCalculated) || 0,
      sugar: parseFloat(nutrition.sugar || sugarCalculated) || 0,
      sodium: parseFloat(nutrition.sodium || sodiumCalculated) || 0,
      cholesterol: parseFloat(nutrition.cholesterol) || 0,
      saturatedFat: parseFloat(nutrition.saturatedFat) || 0,
      transFat: parseFloat(nutrition.transFat) || 0
    };
  }

  validateEntryData(entryData) {
    const required = ['foodId', 'quantity'];
    const missing = required.filter(field => !entryData[field]);
    
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!mongoose.Types.ObjectId.isValid(entryData.foodId)) {
      throw new ValidationError('Invalid food ID format');
    }

    if (entryData.quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (entryData.mealType && !validMealTypes.includes(entryData.mealType)) {
      throw new ValidationError(`Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`);
    }

    const validEntryMethods = ['barcode_scan', 'image_analysis', 'manual', 'recipe', 'voice'];
    if (entryData.entryMethod && !validEntryMethods.includes(entryData.entryMethod)) {
      throw new ValidationError(`Invalid entry method. Must be one of: ${validEntryMethods.join(', ')}`);
    }

    const validUnits = ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];
    if (entryData.unit && !validUnits.includes(entryData.unit)) {
      throw new ValidationError(`Invalid unit. Must be one of: ${validUnits.join(', ')}`);
    }
  }

  getNutritionSummary(entry) {
    const nutrition = entry.nutrition || {};
    return {
      calories: nutrition.calories || 0,
      protein: nutrition.protein || 0,
      carbs: nutrition.carbs || 0,
      fat: nutrition.fat || 0,
      fiber: nutrition.fiber || 0,
      sugar: nutrition.sugar || 0,
      sodium: nutrition.sodium || 0
    };
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
        
      case 'year':
        dateFrom = new Date(now.getFullYear(), 0, 1);
        dateTo = new Date(now.getFullYear() + 1, 0, 1);
        break;
        
      default:
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateTo = new Date(dateFrom);
        dateTo.setDate(dateTo.getDate() + 1);
    }

    return { dateFrom, dateTo };
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
      formatted[stat._id] = {
        calories: parseFloat(stat.totalCalories) || 0,
        protein: parseFloat(stat.totalProtein) || 0,
        carbs: parseFloat(stat.totalCarbs) || 0,
        fat: parseFloat(stat.totalFat) || 0,
        entries: parseInt(stat.entriesCount) || 0
      };
    });

    return formatted;
  }

  formatNutritionStats(nutritionStats) {
    return nutritionStats.map(stat => ({
      date: stat._id.date,
      mealType: stat._id.mealType,
      calories: parseFloat(stat.totalCalories) || 0,
      protein: parseFloat(stat.totalProtein) || 0,
      carbs: parseFloat(stat.totalCarbs) || 0,
      fat: parseFloat(stat.totalFat) || 0,
      fiber: parseFloat(stat.totalFiber) || 0,
      entries: parseInt(stat.entriesCount) || 0
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
          meals: {}
        };
      }
      
      dailyStats[date].meals[stat._id.mealType] = {
        calories: parseFloat(stat.totalCalories) || 0,
        protein: parseFloat(stat.totalProtein) || 0,
        carbs: parseFloat(stat.totalCarbs) || 0,
        fat: parseFloat(stat.totalFat) || 0,
        entries: parseInt(stat.entriesCount) || 0
      };
      
      dailyStats[date].totalCalories += parseFloat(stat.totalCalories) || 0;
      dailyStats[date].totalProtein += parseFloat(stat.totalProtein) || 0;
      dailyStats[date].totalCarbs += parseFloat(stat.totalCarbs) || 0;
      dailyStats[date].totalFat += parseFloat(stat.totalFat) || 0;
      dailyStats[date].totalEntries += parseInt(stat.entriesCount) || 0;
    });

    return Object.values(dailyStats);
  }

  generateDashboardSummary(mealStats, totalCalories) {
    const totalMeals = mealStats.length;
    const avgCaloriesPerMeal = totalMeals > 0 ? (totalCalories.totalCalories || 0) / totalMeals : 0;
    
    return {
      totalMeals,
      avgCaloriesPerMeal: Math.round(avgCaloriesPerMeal),
      hasBreakfast: mealStats.some(m => m._id === 'breakfast'),
      hasLunch: mealStats.some(m => m._id === 'lunch'),
      hasDinner: mealStats.some(m => m._id === 'dinner'),
      totalCalories: totalCalories.totalCalories || 0,
      totalEntries: totalCalories.totalEntries || 0
    };
  }

  async updateDailySummary(userId, date) {
    try {
      await DailySummary.recalculateForDate(userId, date);
    } catch (error) {
      console.error('Error updating daily summary:', error);
    }
  }

  async getRelatedEntries(entry, userId, limit = 5) {
    try {
      return await ConsumptionEntry.find({
        userId: userId,
        foodId: entry.foodId,
        _id: { $ne: entry._id },
        isDeleted: false
      })
      .sort({ consumedAt: -1 })
      .limit(limit)
      .select('consumedAt mealType quantity nutrition');
    } catch (error) {
      return [];
    }
  }

  async getLastEntry(userId) {
    try {
      return await ConsumptionEntry.findOne({
        userId: userId,
        isDeleted: false
      })
      .sort({ consumedAt: -1 })
      .populate('foodId', 'name brand')
      .select('consumedAt mealType nutrition foodId');
    } catch (error) {
      return null;
    }
  }

  async getUserNutritionGoals(userId) {
    try {
      const goals = await UserService.getUserGoals(userId);
      return goals.find(goal => goal.isActive) || null;
    } catch (error) {
      return null;
    }
  }

  calculateGoalsProgress(totalNutrition, goals) {
    if (!goals || !totalNutrition) return null;

    return {
      calories: goals.dailyCaloriesTarget ? Math.round((totalNutrition.totalCalories / goals.dailyCaloriesTarget) * 100) : 0,
      protein: goals.dailyProteinTarget ? Math.round((totalNutrition.totalProtein / goals.dailyProteinTarget) * 100) : 0,
      carbs: goals.dailyCarbsTarget ? Math.round((totalNutrition.totalCarbs / goals.dailyCarbsTarget) * 100) : 0,
      fat: goals.dailyFatTarget ? Math.round((totalNutrition.totalFat / goals.dailyFatTarget) * 100) : 0
    };
  }

  // Obtenir les statistiques globales (pour admin)
  async getGlobalConsumptionStats(options = {}) {
    try {
      const { period = 'month', includeUserBreakdown = false } = options;
      
      const stats = await ConsumptionModel.getGlobalStats();
      
      return {
        ...stats[0],
        period,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new BusinessError('Failed to get global consumption statistics', error);
    }
  }
}

module.exports = new ConsumptionService();