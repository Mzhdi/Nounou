const ConsumptionService = require('../services/consumptionService');
const ApiResponse = require('../utils/responses');
const { SUCCESS, ERRORS } = require('../config/constants');

class ConsumptionController {

  // Créer une nouvelle entrée de consommation
  async createEntry(req, res, next) {
    try {
      const entryData = req.validatedData;
      const userId = req.user.id;

      // Ajouter des métadonnées pour le tracking
      const enrichedData = {
        ...entryData,
        userId,
        deviceInfo: {
          deviceId: req.user.deviceId,
          deviceType: entryData.deviceType || 'mobile',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        },
        consumedAt: entryData.consumedAt || new Date()
      };

      const result = await ConsumptionService.createConsumptionEntry(userId, enrichedData);
      
      return ApiResponse.success(res, result, 'Consumption entry created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les entrées de consommation d'un utilisateur
  async getUserEntries(req, res, next) {
    try {
      const userId = req.user.id;
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        mealType: req.query.mealType,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        entryMethod: req.query.entryMethod,
        search: req.query.search,
        tags: req.query.tags ? req.query.tags.split(',') : undefined,
        sortBy: req.query.sortBy || 'consumedAt',
        sortOrder: req.query.sortOrder || 'desc',
        minCalories: req.query.minCalories ? parseFloat(req.query.minCalories) : undefined,
        maxCalories: req.query.maxCalories ? parseFloat(req.query.maxCalories) : undefined,
        includeNutrition: req.query.includeNutrition !== 'false',
        includeFood: req.query.includeFood !== 'false'
      };

      const result = await ConsumptionService.getUserConsumptions(userId, filters);
      
      return ApiResponse.success(res, result, 'User consumption entries retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir une entrée spécifique par ID
  async getEntryById(req, res, next) {
    try {
      const { entryId } = req.params;
      const userId = req.user.id;

      const result = await ConsumptionService.getConsumptionById(entryId, userId);
      
      return ApiResponse.success(res, result, 'Consumption entry retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour une entrée de consommation
  async updateEntry(req, res, next) {
    try {
      const { entryId } = req.params;
      const userId = req.user.id;
      const updateData = req.validatedData;

      // Ajouter des métadonnées de mise à jour
      const enrichedUpdateData = {
        ...updateData,
        lastModified: {
          at: new Date(),
          by: userId,
          reason: req.body.updateReason || 'user_edit'
        }
      };

      const result = await ConsumptionService.updateConsumptionEntry(entryId, userId, enrichedUpdateData);
      
      return ApiResponse.success(res, result, 'Consumption entry updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Supprimer une entrée de consommation (soft delete)
  async deleteEntry(req, res, next) {
    try {
      const { entryId } = req.params;
      const userId = req.user.id;
      const { reason = 'user_delete', hardDelete = false } = req.body;

      const result = await ConsumptionService.deleteConsumptionEntry(entryId, userId, {
        reason,
        hardDelete,
        deletedBy: userId,
        deletedAt: new Date()
      });
      
      return ApiResponse.success(res, result, 'Consumption entry deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Restaurer une entrée supprimée
  async restoreEntry(req, res, next) {
    try {
      const { entryId } = req.params;
      const userId = req.user.id;

      const result = await ConsumptionService.restoreConsumptionEntry(entryId, userId);
      
      return ApiResponse.success(res, result, 'Consumption entry restored successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir le dashboard nutritionnel
  async getDashboard(req, res, next) {
    try {
      const userId = req.user.id;
      const period = req.query.period || 'today'; // today, week, month, year
      const includeComparison = req.query.includeComparison === 'true';
      const includeGoals = req.query.includeGoals !== 'false';

      const dashboard = await ConsumptionService.getNutritionDashboard(userId, period, {
        includeComparison,
        includeGoals,
        includeInsights: true
      });
      
      return ApiResponse.success(res, dashboard, 'Nutrition dashboard retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les statistiques pour une période personnalisée
  async getCustomStats(req, res, next) {
    try {
      const userId = req.user.id;
      const { dateFrom, dateTo, groupBy = 'day', metrics, includeComparison } = req.query;

      if (!dateFrom || !dateTo) {
        return ApiResponse.badRequestError(res, 'dateFrom and dateTo are required');
      }

      const stats = await ConsumptionService.getCustomPeriodStats(userId, {
        dateFrom,
        dateTo,
        groupBy,
        metrics: metrics ? metrics.split(',') : ['calories', 'protein', 'carbs', 'fat'],
        includeComparison: includeComparison === 'true'
      });
      
      return ApiResponse.success(res, stats, 'Custom period statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les statistiques par type de repas pour aujourd'hui
  async getTodayMealStats(req, res, next) {
    try {
      const userId = req.user.id;
      
      const dashboard = await ConsumptionService.getNutritionDashboard(userId, 'today');
      
      return ApiResponse.success(res, {
        mealBreakdown: dashboard.mealBreakdown,
        totalCalories: dashboard.totalCalories,
        summary: dashboard.summary,
        goals: dashboard.goals,
        progress: dashboard.progress
      }, 'Today meal statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les aliments les plus consommés
  async getTopFoods(req, res, next) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;
      const period = req.query.period || 'month'; // week, month, year, all
      const mealType = req.query.mealType;

      const topFoods = await ConsumptionService.getTopConsumedFoods(userId, {
        limit,
        period,
        mealType
      });
      
      return ApiResponse.success(res, {
        topFoods,
        period,
        limit,
        generatedAt: new Date()
      }, 'Top consumed foods retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir un résumé rapide des calories d'aujourd'hui
  async getTodayCaloriesSummary(req, res, next) {
    try {
      const userId = req.user.id;
      
      const dashboard = await ConsumptionService.getNutritionDashboard(userId, 'today');
      
      return ApiResponse.success(res, {
        totalCalories: dashboard.totalCalories,
        totalEntries: dashboard.totalEntries,
        caloriesGoal: dashboard.goals?.dailyCalories,
        remainingCalories: dashboard.goals?.dailyCalories - dashboard.totalCalories,
        progressPercentage: dashboard.progress?.calories,
        mealBreakdown: dashboard.mealBreakdown,
        summary: dashboard.summary,
        lastEntry: dashboard.lastEntry
      }, 'Today calories summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Ajouter un repas rapide (pour les favoris ou recettes)
  async addQuickMeal(req, res, next) {
    try {
      const userId = req.user.id;
      const { foods, mealType = 'other', recipeName, mealNotes, tags } = req.validatedData;

      if (!foods || !Array.isArray(foods) || foods.length === 0) {
        return ApiResponse.badRequestError(res, 'foods array is required and cannot be empty');
      }

      const mealData = {
        foods,
        mealType,
        recipeName,
        mealNotes,
        tags,
        consumedAt: new Date(),
        entryMethod: 'recipe',
        deviceInfo: {
          deviceId: req.user.deviceId,
          deviceType: req.body.deviceType || 'mobile'
        }
      };

      const result = await ConsumptionService.addQuickMeal(userId, mealData);

      return ApiResponse.success(res, result, 'Quick meal added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // Dupliquer une entrée (pour des aliments récurrents)
  async duplicateEntry(req, res, next) {
    try {
      const { entryId } = req.params;
      const userId = req.user.id;
      const { mealType, consumedAt, quantity, notes } = req.body;

      const duplicateData = {
        mealType,
        consumedAt: consumedAt || new Date(),
        quantity,
        notes,
        entryMethod: 'manual',
        isDuplicate: true,
        originalEntryId: entryId
      };

      const result = await ConsumptionService.duplicateConsumptionEntry(entryId, userId, duplicateData);
      
      return ApiResponse.success(res, result, 'Entry duplicated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les statistiques hebdomadaires
  async getWeeklyStats(req, res, next) {
    try {
      const userId = req.user.id;
      const weekOffset = parseInt(req.query.weekOffset) || 0; // 0 = cette semaine, -1 = semaine dernière
      
      const stats = await ConsumptionService.getNutritionDashboard(userId, 'week', {
        weekOffset,
        includeComparison: true,
        includeGoals: true
      });
      
      return ApiResponse.success(res, stats, 'Weekly statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les statistiques mensuelles
  async getMonthlyStats(req, res, next) {
    try {
      const userId = req.user.id;
      const monthOffset = parseInt(req.query.monthOffset) || 0; // 0 = ce mois, -1 = mois dernier
      
      const stats = await ConsumptionService.getNutritionDashboard(userId, 'month', {
        monthOffset,
        includeComparison: true,
        includeGoals: true,
        includeInsights: true
      });
      
      return ApiResponse.success(res, stats, 'Monthly statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les tendances nutritionnelles
  async getNutritionTrends(req, res, next) {
    try {
      const userId = req.user.id;
      const { period = 'month', metric = 'calories' } = req.query;

      const trends = await ConsumptionService.getNutritionTrends(userId, {
        period,
        metric,
        includeMovingAverage: true,
        includeSeasonality: true
      });
      
      return ApiResponse.success(res, trends, 'Nutrition trends retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Recherche d'entrées avec filtres avancés
  async searchEntries(req, res, next) {
    try {
      const userId = req.user.id;
      const { q, page = 1, limit = 20, fields } = req.query;

      if (!q || q.length < 2) {
        return ApiResponse.badRequestError(res, 'Search query must be at least 2 characters');
      }

      const results = await ConsumptionService.searchConsumptionEntries(userId, {
        query: q,
        page: parseInt(page),
        limit: parseInt(limit),
        fields: fields ? fields.split(',') : ['foodName', 'brandName', 'notes']
      });
      
      return ApiResponse.success(res, results, 'Search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  // Analyse nutritionnelle personnalisée
  async getNutritionAnalysis(req, res, next) {
    try {
      const userId = req.user.id;
      const { period = 'week', analysisType = 'comprehensive' } = req.query;

      const analysis = await ConsumptionService.getNutritionAnalysis(userId, {
        period,
        analysisType,
        includeRecommendations: true,
        includeDeficiencies: true,
        includeExcesses: true
      });
      
      return ApiResponse.success(res, analysis, 'Nutrition analysis completed successfully');
    } catch (error) {
      next(error);
    }
  }

  // Export des données de consommation
  async exportData(req, res, next) {
    try {
      const userId = req.user.id;
      const { format = 'json', dateFrom, dateTo, includeNutrition = true, includeMetadata = false } = req.query;

      const filters = {
        includeNutrition: includeNutrition === 'true',
        includeMetadata: includeMetadata === 'true'
      };
      
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const data = await ConsumptionService.exportUserConsumptions(userId, {
        ...filters,
        format,
        limit: 10000 // Large limit for export
      });

      if (format === 'json') {
        return ApiResponse.success(res, data, 'Data exported successfully');
      } else {
        // Pour CSV/XLSX, définir les headers appropriés
        const filename = `consumption_data_${userId}_${new Date().toISOString().split('T')[0]}.${format}`;
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(data);
      }
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les suggestions basées sur l'historique
  async getFoodSuggestions(req, res, next) {
    try {
      const userId = req.user.id;
      const { mealType, timeOfDay, limit = 10 } = req.query;

      const suggestions = await ConsumptionService.getFoodSuggestions(userId, {
        mealType,
        timeOfDay,
        limit: parseInt(limit),
        basedOnHistory: true,
        basedOnGoals: true
      });
      
      return ApiResponse.success(res, {
        suggestions,
        generatedAt: new Date(),
        basedOn: ['user_history', 'nutrition_goals', 'meal_timing']
      }, 'Food suggestions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Opérations en lot
  async batchOperations(req, res, next) {
    try {
      const userId = req.user.id;
      const { operation, entryIds, updateData } = req.validatedData;

      if (!['delete', 'update', 'duplicate'].includes(operation)) {
        return ApiResponse.badRequestError(res, 'Invalid batch operation');
      }

      const result = await ConsumptionService.batchOperations(userId, {
        operation,
        entryIds,
        updateData,
        performedBy: userId,
        performedAt: new Date()
      });
      
      return ApiResponse.success(res, result, `Batch ${operation} completed successfully`);
    } catch (error) {
      next(error);
    }
  }

  // ====== MISSING METHODS - ADDED ======

  // ADDED: Create meal from recipe
  async createMealFromRecipe(req, res, next) {
    try {
      const { recipeId } = req.params;
      const userId = req.user.id;
      const { servings = 1, mealType = 'other', consumedAt, notes } = req.body;

      const result = await ConsumptionService.createMealFromRecipe(userId, recipeId, {
        servings,
        mealType,
        consumedAt: consumedAt || new Date(),
        notes
      });
      
      return ApiResponse.success(res, result, 'Meal created from recipe successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get personalized insights
  async getPersonalizedInsights(req, res, next) {
    try {
      const userId = req.user.id;
      
      const insights = await ConsumptionService.getPersonalizedInsights(userId);
      
      return ApiResponse.success(res, {
        insights,
        generatedAt: new Date(),
        type: 'personalized_nutrition_insights'
      }, 'Personalized insights retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: AI image analysis
  async analyzeImageWithAI(req, res, next) {
    try {
      const userId = req.user.id;
      const { imageData, imageUrl } = req.body;

      if (!imageData && !imageUrl) {
        return ApiResponse.badRequestError(res, 'Image data or URL is required');
      }

      const result = await ConsumptionService.analyzeImageWithAI(userId, {
        imageData,
        imageUrl,
        timestamp: new Date(),
        deviceInfo: {
          deviceId: req.user.deviceId,
          userAgent: req.get('User-Agent')
        }
      });
      
      return ApiResponse.success(res, result, 'Image analysis completed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Barcode scanning
  async scanBarcode(req, res, next) {
    try {
      const userId = req.user.id;
      const { barcode, scannerType = 'mobile' } = req.body;

      if (!barcode) {
        return ApiResponse.badRequestError(res, 'Barcode is required');
      }

      const result = await ConsumptionService.scanBarcode(userId, {
        barcode,
        scannerType,
        timestamp: new Date(),
        deviceInfo: {
          deviceId: req.user.deviceId,
          userAgent: req.get('User-Agent')
        }
      });
      
      return ApiResponse.success(res, result, 'Barcode scanned successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Process voice entry
  async processVoiceEntry(req, res, next) {
    try {
      const userId = req.user.id;
      const { audioData, audioUrl, transcription } = req.body;

      if (!audioData && !audioUrl && !transcription) {
        return ApiResponse.badRequestError(res, 'Audio data, URL, or transcription is required');
      }

      const result = await ConsumptionService.processVoiceEntry(userId, {
        audioData,
        audioUrl,
        transcription,
        timestamp: new Date(),
        deviceInfo: {
          deviceId: req.user.deviceId,
          userAgent: req.get('User-Agent')
        }
      });
      
      return ApiResponse.success(res, result, 'Voice entry processed successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Generate weekly report
  async generateWeeklyReport(req, res, next) {
    try {
      const userId = req.user.id;
      const { dateFrom, dateTo } = req.validatedQuery;

      const report = await ConsumptionService.generateWeeklyReport(userId, {
        dateFrom,
        dateTo
      });
      
      return ApiResponse.success(res, {
        report,
        period: { from: dateFrom, to: dateTo },
        generatedAt: new Date()
      }, 'Weekly report generated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Generate monthly report
  async generateMonthlyReport(req, res, next) {
    try {
      const userId = req.user.id;
      const { dateFrom, dateTo } = req.validatedQuery;

      const report = await ConsumptionService.generateMonthlyReport(userId, {
        dateFrom,
        dateTo
      });
      
      return ApiResponse.success(res, {
        report,
        period: { from: dateFrom, to: dateTo },
        generatedAt: new Date()
      }, 'Monthly report generated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get goals progress
  async getGoalsProgress(req, res, next) {
    try {
      const userId = req.user.id;
      
      const progress = await ConsumptionService.getGoalsProgress(userId);
      
      return ApiResponse.success(res, {
        progress,
        lastUpdated: new Date()
      }, 'Goals progress retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Update goal progress
  async updateGoalProgress(req, res, next) {
    try {
      const userId = req.user.id;
      const { goalId, progress, notes } = req.body;

      const result = await ConsumptionService.updateGoalProgress(userId, goalId, {
        progress,
        notes,
        updatedAt: new Date()
      });
      
      return ApiResponse.success(res, result, 'Goal progress updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Share meal
  async shareMeal(req, res, next) {
    try {
      const { entryId } = req.params;
      const userId = req.user.id;
      const { shareType = 'public', message, expiresAt } = req.body;

      const result = await ConsumptionService.shareMeal(userId, entryId, {
        shareType,
        message,
        expiresAt,
        sharedAt: new Date()
      });
      
      return ApiResponse.success(res, {
        shareLink: result.shareLink,
        shareId: result.shareId,
        expiresAt: result.expiresAt
      }, 'Meal shared successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: View shared meal
  async viewSharedMeal(req, res, next) {
    try {
      const { shareId } = req.params;
      
      const result = await ConsumptionService.viewSharedMeal(shareId);
      
      return ApiResponse.success(res, result, 'Shared meal retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get service metadata
  async getServiceMetadata(req, res, next) {
    try {
      const metadata = {
        service: 'consumption-service',
        version: process.env.API_VERSION || '1.0.0',
        features: {
          aiAnalysis: true,
          barcodeScanning: true,
          voiceInput: true,
          bulkOperations: true,
          advancedAnalytics: true,
          socialSharing: true,
          customReports: true
        },
        supportedFormats: {
          import: ['json', 'csv'],
          export: ['json', 'csv', 'xlsx', 'pdf']
        },
        limits: {
          maxEntriesPerDay: 200,
          maxBatchSize: 50,
          maxExportEntries: 10000
        },
        subscriptionFeatures: {
          free: ['basic_tracking', 'simple_stats'],
          premium: ['ai_analysis', 'advanced_stats', 'bulk_operations'],
          pro: ['custom_reports', 'advanced_analytics', 'unlimited_exports']
        }
      };
      
      return ApiResponse.success(res, metadata, 'Service metadata retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get top consumers (Admin)
  async getTopConsumers(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.validatedQuery;
      
      const result = await ConsumptionService.getTopConsumers({
        page,
        limit
      });
      
      return ApiResponse.success(res, result, 'Top consumers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Cleanup consumption data (Admin)
  async cleanupConsumptionData(req, res, next) {
    try {
      const { olderThan, includeDeleted = true, dryRun = false } = req.body;
      
      const result = await ConsumptionService.cleanupConsumptionData({
        olderThan,
        includeDeleted,
        dryRun,
        performedBy: req.user.id,
        performedAt: new Date()
      });
      
      return ApiResponse.success(res, result, 'Data cleanup completed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get data quality reports (Admin)
  async getDataQualityReports(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.validatedQuery;
      
      const reports = await ConsumptionService.getDataQualityReports({
        dateFrom,
        dateTo
      });
      
      return ApiResponse.success(res, {
        reports,
        period: { from: dateFrom, to: dateTo },
        generatedAt: new Date()
      }, 'Data quality reports retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ====== ADMIN ENDPOINTS ======

  // Obtenir les statistiques globales (admin uniquement)
  async getGlobalStats(req, res, next) {
    try {
      // Cette route devrait être protégée par un middleware admin
      const { period = 'month', includeUserBreakdown = false } = req.query;
      
      const stats = await ConsumptionService.getGlobalConsumptionStats({
        period,
        includeUserBreakdown: includeUserBreakdown === 'true'
      });
      
      return ApiResponse.success(res, stats, 'Global consumption statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Analyser les tendances globales (admin uniquement)
  async getGlobalTrends(req, res, next) {
    try {
      const { metric = 'calories', period = 'month', limit = 100 } = req.query;
      
      const trends = await ConsumptionService.getGlobalTrends({
        metric,
        period,
        limit: parseInt(limit)
      });
      
      return ApiResponse.success(res, trends, 'Global trends analysis completed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConsumptionController();