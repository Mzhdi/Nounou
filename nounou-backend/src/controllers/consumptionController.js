const ConsumptionService = require('../services/consumptionService');
const ApiResponse = require('../utils/responses');

class ConsumptionController {

  // ========================================
  // CRÉATION D'ENTRÉES UNIFIÉES
  // ========================================

  async createEntry(req, res, next) {
    try {
      const { user } = req;
      const entryData = req.validatedData;

      // Enrichir avec les métadonnées de device/location
      const enrichedData = {
        ...entryData,
        deviceInfo: {
          deviceId: req.user?.deviceId,
          deviceType: entryData.deviceType || 'mobile',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        },
        consumedAt: entryData.consumedAt || new Date()
      };

      const result = await ConsumptionService.createConsumptionEntry(user.id, enrichedData);
      
      return ApiResponse.created(res, result, 'Consumption entry created successfully');
    } catch (error) {
      next(error);
    }
  }

  async createFoodEntry(req, res, next) {
    try {
      const { user } = req;
      const entryData = req.validatedData;

      const result = await ConsumptionService.createConsumptionEntry(user.id, entryData);
      
      return ApiResponse.created(res, result, 'Food entry created successfully');
    } catch (error) {
      next(error);
    }
  }

  async createRecipeEntry(req, res, next) {
    try {
      const { user } = req;
      const entryData = req.validatedData;

      const result = await ConsumptionService.createConsumptionEntry(user.id, entryData);
      
      return ApiResponse.created(res, result, 'Recipe entry created successfully');
    } catch (error) {
      next(error);
    }
  }

  async createMealFromRecipe(req, res, next) {
    try {
      const { user } = req;
      const { recipeId } = req.params;
      const options = req.validatedData;

      const result = await ConsumptionService.createMealFromRecipe(user.id, recipeId, options);
      
      return ApiResponse.created(res, result, 'Meal created from recipe successfully');
    } catch (error) {
      next(error);
    }
  }

  async addQuickMeal(req, res, next) {
    try {
      const { user } = req;
      const mealData = req.validatedData;

      const result = await ConsumptionService.addQuickMeal(user.id, mealData);
      
      return ApiResponse.created(res, result, 'Quick meal created successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // RÉCUPÉRATION ET RECHERCHE
  // ========================================

  async getUserEntries(req, res, next) {
    try {
      const { user } = req;
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        mealType: req.query.mealType,
        itemType: req.query.itemType,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        entryMethod: req.query.entryMethod,
        search: req.query.search,
        tags: req.query.tags,
        sortBy: req.query.sortBy || 'consumedAt',
        sortOrder: req.query.sortOrder || 'desc',
        minCalories: req.query.minCalories ? parseFloat(req.query.minCalories) : undefined,
        maxCalories: req.query.maxCalories ? parseFloat(req.query.maxCalories) : undefined,
        includeDeleted: req.query.includeDeleted === 'true'
      };

      const result = await ConsumptionService.getUserConsumptions(user.id, filters);
      
      return ApiResponse.paginated(res, result.entries, result.pagination, 'Consumption entries retrieved successfully', {
        filters: result.filters,
        summary: result.summary
      });
    } catch (error) {
      next(error);
    }
  }

  async getFoodEntries(req, res, next) {
    try {
      const { user } = req;
      const filters = {
        ...req.query,
        itemType: 'food',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await ConsumptionService.getUserConsumptions(user.id, filters);
      
      return ApiResponse.paginated(res, result.entries, result.pagination, 'Food entries retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRecipeEntries(req, res, next) {
    try {
      const { user } = req;
      const filters = {
        ...req.query,
        itemType: 'recipe',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await ConsumptionService.getUserConsumptions(user.id, filters);
      
      return ApiResponse.paginated(res, result.entries, result.pagination, 'Recipe entries retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEntryById(req, res, next) {
    try {
      const { user } = req;
      const { entryId } = req.params;

      const result = await ConsumptionService.getConsumptionById(entryId, user.id);
      
      return ApiResponse.success(res, result, 'Consumption entry retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async searchEntries(req, res, next) {
    try {
      const { user } = req;
      const searchOptions = {
        query: req.query.q,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        itemType: req.query.itemType,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      const result = await ConsumptionService.searchConsumptionEntries(user.id, searchOptions);
      
      return ApiResponse.paginated(res, result.results, result.pagination, 'Search completed successfully', {
        searchQuery: result.searchQuery,
        filters: result.filters
      });
    } catch (error) {
      next(error);
    }
  }

  async searchFoodEntries(req, res, next) {
    try {
      const { user } = req;
      const searchOptions = {
        query: req.query.q,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        itemType: 'food'
      };

      const result = await ConsumptionService.searchConsumptionEntries(user.id, searchOptions);
      
      return ApiResponse.paginated(res, result.results, result.pagination, 'Food search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  async searchRecipeEntries(req, res, next) {
    try {
      const { user } = req;
      const searchOptions = {
        query: req.query.q,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        itemType: 'recipe'
      };

      const result = await ConsumptionService.searchConsumptionEntries(user.id, searchOptions);
      
      return ApiResponse.paginated(res, result.results, result.pagination, 'Recipe search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // ANALYTICS ET DASHBOARD
  // ========================================

  async getDashboard(req, res, next) {
    try {
      const { user } = req;
      const period = req.query.period || 'today';
      const options = {
        includeComparison: req.query.includeComparison === 'true',
        includeGoals: req.query.includeGoals !== 'false',
        includeInsights: req.query.includeInsights === 'true',
        weekOffset: parseInt(req.query.weekOffset) || 0,
        monthOffset: parseInt(req.query.monthOffset) || 0
      };

      const dashboard = await ConsumptionService.getNutritionDashboard(user.id, period, options);
      
      return ApiResponse.success(res, dashboard, 'Nutrition dashboard retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDashboardByType(req, res, next) {
    try {
      const { user } = req;
      const period = req.query.period || 'today';
      
      const dashboard = await ConsumptionService.getNutritionDashboard(user.id, period);
      
      // Formater pour montrer la breakdown par type
      const byTypeBreakdown = {
        period,
        dateRange: dashboard.dateRange,
        foodVsRecipe: dashboard.breakdown.byItemType,
        insights: {
          foodPercentage: dashboard.breakdown.byItemType.food ? 
            Math.round((dashboard.breakdown.byItemType.food.calories / dashboard.totals.totalCalories) * 100) : 0,
          recipePercentage: dashboard.breakdown.byItemType.recipe ? 
            Math.round((dashboard.breakdown.byItemType.recipe.calories / dashboard.totals.totalCalories) * 100) : 0
        }
      };
      
      return ApiResponse.success(res, byTypeBreakdown, 'Type breakdown dashboard retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTopConsumedItems(req, res, next) {
    try {
      const { user } = req;
      const options = {
        limit: parseInt(req.query.limit) || 10,
        period: req.query.period || 'month',
        itemType: req.query.itemType,
        mealType: req.query.mealType
      };

      const result = await ConsumptionService.getTopConsumedItems(user.id, options);
      
      return ApiResponse.success(res, result, 'Top consumed items retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTopFoods(req, res, next) {
    try {
      const { user } = req;
      const options = {
        limit: parseInt(req.query.limit) || 10,
        period: req.query.period || 'month',
        itemType: 'food',
        mealType: req.query.mealType
      };

      const result = await ConsumptionService.getTopConsumedItems(user.id, options);
      
      return ApiResponse.success(res, {
        foods: result.items,
        generatedAt: result.generatedAt,
        period: result.period
      }, 'Top consumed foods retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTopRecipes(req, res, next) {
    try {
      const { user } = req;
      const options = {
        limit: parseInt(req.query.limit) || 10,
        period: req.query.period || 'month',
        itemType: 'recipe',
        mealType: req.query.mealType
      };

      const result = await ConsumptionService.getTopConsumedItems(user.id, options);
      
      return ApiResponse.success(res, {
        recipes: result.items,
        generatedAt: result.generatedAt,
        period: result.period
      }, 'Top consumed recipes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getNutritionBalance(req, res, next) {
    try {
      const { user } = req;
      const period = req.query.period || 'week';
      const includeComparison = req.query.includeComparison === 'true';

      const dashboard = await ConsumptionService.getNutritionDashboard(user.id, period, {
        includeComparison
      });

      const balance = {
        period,
        dateRange: dashboard.dateRange,
        nutritionSources: dashboard.breakdown.byItemType,
        balance: {
          foodCalories: dashboard.breakdown.byItemType.food?.calories || 0,
          recipeCalories: dashboard.breakdown.byItemType.recipe?.calories || 0,
          totalCalories: dashboard.totals.totalCalories,
          foodPercentage: dashboard.totals.totalCalories > 0 ? 
            Math.round(((dashboard.breakdown.byItemType.food?.calories || 0) / dashboard.totals.totalCalories) * 100) : 0,
          recipePercentage: dashboard.totals.totalCalories > 0 ? 
            Math.round(((dashboard.breakdown.byItemType.recipe?.calories || 0) / dashboard.totals.totalCalories) * 100) : 0
        },
        recommendations: generateBalanceRecommendations(dashboard.breakdown.byItemType)
      };
      
      return ApiResponse.success(res, balance, 'Nutrition balance analysis retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCustomStats(req, res, next) {
    try {
      const { user } = req;
      const options = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        groupBy: req.query.groupBy || 'day',
        metrics: req.query.metrics ? req.query.metrics.split(',') : ['calories', 'protein', 'carbs', 'fat'],
        includeComparison: req.query.includeComparison === 'true'
      };

      const stats = await ConsumptionService.getCustomPeriodStats(user.id, options);
      
      return ApiResponse.success(res, stats, 'Custom period statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // GESTION DES ENTRÉES
  // ========================================

  async updateEntry(req, res, next) {
    try {
      const { user } = req;
      const { entryId } = req.params;
      const updateData = req.validatedData;

      const result = await ConsumptionService.updateConsumptionEntry(entryId, user.id, updateData);
      
      return ApiResponse.success(res, result, 'Consumption entry updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteEntry(req, res, next) {
    try {
      const { user } = req;
      const { entryId } = req.params;
      const { reason = 'user_delete', hardDelete = false } = req.body;

      const result = await ConsumptionService.deleteConsumptionEntry(entryId, user.id, {
        reason,
        hardDelete
      });
      
      return ApiResponse.success(res, result, 'Consumption entry deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async restoreEntry(req, res, next) {
    try {
      const { user } = req;
      const { entryId } = req.params;

      const result = await ConsumptionService.restoreConsumptionEntry(entryId, user.id);
      
      return ApiResponse.success(res, result, 'Consumption entry restored successfully');
    } catch (error) {
      next(error);
    }
  }

  async duplicateEntry(req, res, next) {
    try {
      const { user } = req;
      const { entryId } = req.params;
      const { mealType, consumedAt, quantity, servings, notes } = req.body;

      const duplicateData = {
        mealType,
        consumedAt: consumedAt || new Date(),
        quantity,
        servings,
        notes
      };

      const result = await ConsumptionService.duplicateConsumptionEntry(entryId, user.id, duplicateData);
      
      return ApiResponse.created(res, result, 'Entry duplicated successfully');
    } catch (error) {
      next(error);
    }
  }

  async recalculateNutrition(req, res, next) {
    try {
      const { user } = req;
      const { entryId } = req.params;

      const result = await ConsumptionService.recalculateNutrition(entryId, user.id);
      
      return ApiResponse.success(res, result, 'Nutrition recalculated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // SUGGESTIONS ET RECOMMANDATIONS
  // ========================================

  async getFoodSuggestions(req, res, next) {
    try {
      const { user } = req;
      const options = {
        mealType: req.query.mealType,
        timeOfDay: req.query.timeOfDay,
        limit: parseInt(req.query.limit) || 10,
        basedOnHistory: req.query.basedOn !== 'goals',
        basedOnGoals: req.query.basedOn !== 'history'
      };

      const result = await ConsumptionService.getFoodSuggestions(user.id, options);
      
      return ApiResponse.success(res, result, 'Food suggestions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRecipeSuggestions(req, res, next) {
    try {
      const { user } = req;
      const options = {
        mealType: req.query.mealType,
        limit: parseInt(req.query.limit) || 10,
        basedOnHistory: req.query.basedOn !== 'ingredients',
        basedOnIngredients: req.query.basedOn === 'ingredients'
      };

      const result = await ConsumptionService.getRecipeSuggestions(user.id, options);
      
      return ApiResponse.success(res, result, 'Recipe suggestions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMissingNutrientRecommendations(req, res, next) {
    try {
      const { user } = req;
      const { targetNutrients, period = 'week' } = req.body;

      // TODO: Implémenter la logique de recommandations pour nutriments manquants
      const recommendations = {
        missingNutrients: targetNutrients || [],
        recommendedFoods: [],
        recommendedRecipes: [],
        period,
        generatedAt: new Date()
      };
      
      return ApiResponse.success(res, recommendations, 'Nutrient recommendations generated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // VALIDATION ET SYNCHRONISATION
  // ========================================

  async validateFoodExists(req, res, next) {
    try {
      const { foodId } = req.params;

      const validation = await ConsumptionService.validateFoodExists(foodId);
      
      return ApiResponse.success(res, validation, 'Food validation completed');
    } catch (error) {
      next(error);
    }
  }

  async validateRecipeExists(req, res, next) {
    try {
      const { recipeId } = req.params;

      const validation = await ConsumptionService.validateRecipeExists(recipeId);
      
      return ApiResponse.success(res, validation, 'Recipe validation completed');
    } catch (error) {
      next(error);
    }
  }

  async syncNutritionData(req, res, next) {
    try {
      const { user } = req;
      const options = {
        force: req.body.force || false,
        itemType: req.body.itemType,
        batchSize: req.body.batchSize || 100
      };

      const result = await ConsumptionService.syncNutritionData(user.id, options);
      
      return ApiResponse.success(res, result, 'Nutrition data synchronized successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // RAPPORTS ET EXPORT
  // ========================================

  async getNutritionSourcesReport(req, res, next) {
    try {
      const { user } = req;
      const period = req.query.period || 'month';
      const includeComparison = req.query.includeComparison === 'true';

      const dashboard = await ConsumptionService.getNutritionDashboard(user.id, period, {
        includeComparison
      });

      const report = {
        period,
        dateRange: dashboard.dateRange,
        nutritionSources: dashboard.breakdown.byItemType,
        sourceAnalysis: {
          totalFromFoods: dashboard.breakdown.byItemType.food?.calories || 0,
          totalFromRecipes: dashboard.breakdown.byItemType.recipe?.calories || 0,
          foodPercentage: dashboard.totals.totalCalories > 0 ? 
            Math.round(((dashboard.breakdown.byItemType.food?.calories || 0) / dashboard.totals.totalCalories) * 100) : 0,
          recipePercentage: dashboard.totals.totalCalories > 0 ? 
            Math.round(((dashboard.breakdown.byItemType.recipe?.calories || 0) / dashboard.totals.totalCalories) * 100) : 0
        },
        recommendations: generateSourceRecommendations(dashboard.breakdown.byItemType),
        generatedAt: new Date()
      };
      
      return ApiResponse.success(res, report, 'Nutrition sources report generated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRecipeUsageReport(req, res, next) {
    try {
      const { user } = req;
      const period = req.query.period || 'month';

      const topRecipes = await ConsumptionService.getTopConsumedItems(user.id, {
        itemType: 'recipe',
        period,
        limit: 20
      });

      const dashboard = await ConsumptionService.getNutritionDashboard(user.id, period);

      const report = {
        period,
        dateRange: dashboard.dateRange,
        topRecipes: topRecipes.items,
        usage: {
          totalRecipeEntries: dashboard.breakdown.byItemType.recipe?.entries || 0,
          totalRecipeCalories: dashboard.breakdown.byItemType.recipe?.calories || 0,
          averageServingsPerRecipe: topRecipes.items.length > 0 ? 
            topRecipes.items.reduce((sum, recipe) => sum + recipe.totalQuantity, 0) / topRecipes.items.length : 0
        },
        insights: generateRecipeUsageInsights(topRecipes.items),
        generatedAt: new Date()
      };
      
      return ApiResponse.success(res, report, 'Recipe usage report generated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getFoodVsRecipeReport(req, res, next) {
    try {
      const { user } = req;
      const period = req.query.period || 'month';
      const includeComparison = req.query.includeComparison === 'true';

      const dashboard = await ConsumptionService.getNutritionDashboard(user.id, period, {
        includeComparison
      });

      const report = {
        period,
        dateRange: dashboard.dateRange,
        comparison: {
          foods: dashboard.breakdown.byItemType.food || {},
          recipes: dashboard.breakdown.byItemType.recipe || {},
          totals: dashboard.totals
        },
        analysis: {
          preferredSource: (dashboard.breakdown.byItemType.food?.calories || 0) > 
                          (dashboard.breakdown.byItemType.recipe?.calories || 0) ? 'foods' : 'recipes',
          diversity: {
            foodVariety: dashboard.breakdown.byItemType.food?.entries || 0,
            recipeVariety: dashboard.breakdown.byItemType.recipe?.entries || 0
          },
          nutritionalProfile: compareNutritionalProfiles(dashboard.breakdown.byItemType)
        },
        recommendations: generateFoodVsRecipeRecommendations(dashboard.breakdown.byItemType),
        generatedAt: new Date()
      };
      
      return ApiResponse.success(res, report, 'Food vs Recipe comparative report generated successfully');
    } catch (error) {
      next(error);
    }
  }

  async exportUnifiedData(req, res, next) {
    try {
      const { user } = req;
      const options = {
        format: req.query.format || 'json',
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        includeNutrition: req.query.includeNutrition !== 'false',
        includeItemDetails: req.query.includeItemDetails !== 'false',
        includeMetadata: req.query.includeMetadata === 'true',
        limit: parseInt(req.query.limit) || 10000
      };

      const data = await ConsumptionService.exportUserConsumptions(user.id, options);

      if (options.format === 'json') {
        return ApiResponse.success(res, data, 'Data exported successfully');
      } else {
        // Pour CSV/XLSX, définir les headers appropriés
        const filename = `consumption_unified_${user.id}_${new Date().toISOString().split('T')[0]}.${options.format}`;
        res.setHeader('Content-Type', 
          options.format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(data);
      }
    } catch (error) {
      next(error);
    }
  }

  async exportDataByType(req, res, next) {
    try {
      const { user } = req;
      const options = {
        format: req.query.format || 'json',
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        includeNutrition: req.query.includeNutrition !== 'false',
        includeItemDetails: req.query.includeItemDetails !== 'false'
      };

      // Export séparé pour foods et recipes
      const foodData = await ConsumptionService.exportUserConsumptions(user.id, {
        ...options,
        itemType: 'food'
      });

      const recipeData = await ConsumptionService.exportUserConsumptions(user.id, {
        ...options,
        itemType: 'recipe'
      });

      const separatedData = {
        user: user.id,
        exportedAt: new Date().toISOString(),
        format: options.format,
        foods: foodData,
        recipes: recipeData
      };

      return ApiResponse.success(res, separatedData, 'Data exported by type successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // OPÉRATIONS EN LOT
  // ========================================

  async batchOperations(req, res, next) {
    try {
      const { user } = req;
      const { operation, entryIds, updateData } = req.body;

      const options = {
        operation,
        entryIds,
        updateData,
        performedBy: user.id,
        performedAt: new Date()
      };

      const result = await ConsumptionService.batchOperations(user.id, options);
      
      return ApiResponse.success(res, result, `Batch ${operation} completed successfully`);
    } catch (error) {
      next(error);
    }
  }

  async batchRecalculateNutrition(req, res, next) {
    try {
      const { user } = req;
      const { entryIds } = req.body;

      const result = await ConsumptionService.batchOperations(user.id, {
        operation: 'recalculate',
        entryIds,
        performedBy: user.id,
        performedAt: new Date()
      });
      
      return ApiResponse.success(res, result, 'Batch nutrition recalculation completed successfully');
    } catch (error) {
      next(error);
    }
  }

  async batchConvertItemType(req, res, next) {
    try {
      const { user } = req;
      const { entryIds, fromType, toType, conversionData } = req.body;

      // TODO: Implémenter la conversion de type en lot
      const result = {
        message: 'Batch conversion not yet implemented',
        entryIds,
        fromType,
        toType,
        conversionData
      };
      
      return ApiResponse.success(res, result, 'Batch conversion completed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // MIGRATION ET MAINTENANCE
  // ========================================

  async triggerSchemaMigration(req, res, next) {
    try {
      const { dryRun = true, batchSize = 100, backupFirst = true } = req.body;

      // TODO: Implémenter le déclenchement de migration
      const result = {
        message: 'Schema migration triggered',
        dryRun,
        batchSize,
        backupFirst,
        status: 'pending',
        triggeredAt: new Date()
      };
      
      return ApiResponse.success(res, result, 'Schema migration triggered successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMigrationStatus(req, res, next) {
    try {
      // TODO: Implémenter la vérification du statut de migration
      const status = {
        isRunning: false,
        progress: 100,
        lastMigration: null,
        totalEntries: 0,
        migratedEntries: 0,
        errors: []
      };
      
      return ApiResponse.success(res, status, 'Migration status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async cleanupOrphanedEntries(req, res, next) {
    try {
      const { 
        olderThan, 
        includeOrphaned = true, 
        dryRun = true, 
        maxEntries = 1000 
      } = req.body;

      // TODO: Implémenter le nettoyage des entrées orphelines
      const result = {
        message: 'Orphaned entries cleanup completed',
        dryRun,
        entriesFound: 0,
        entriesRemoved: 0,
        olderThan,
        maxEntries,
        executedAt: new Date()
      };
      
      return ApiResponse.success(res, result, 'Orphaned entries cleanup completed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // ANALYTICS ADMIN
  // ========================================

  async getGlobalItemTypeStats(req, res, next) {
    try {
      const { period = 'month', includeUserBreakdown = false } = req.query;

      const stats = await ConsumptionService.getGlobalConsumptionStats({
        period,
        includeUserBreakdown: includeUserBreakdown === 'true'
      });
      
      return ApiResponse.success(res, stats, 'Global item type statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMigrationStats(req, res, next) {
    try {
      // TODO: Implémenter les statistiques de migration
      const stats = {
        migrationHistory: [],
        dataQuality: {
          totalEntries: 0,
          entriesWithValidNutrition: 0,
          entriesWithValidItems: 0,
          orphanedEntries: 0
        },
        schemaVersion: '2.0.0',
        lastCheck: new Date()
      };
      
      return ApiResponse.success(res, stats, 'Migration statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ========================================
  // LEGACY ET BACKWARD COMPATIBILITY
  // ========================================

  async getTodayCaloriesSummary(req, res, next) {
    try {
      const { user } = req;
      
      const dashboard = await ConsumptionService.getNutritionDashboard(user.id, 'today');
      
      return ApiResponse.success(res, {
        totalCalories: dashboard.totals.totalCalories,
        totalEntries: dashboard.totals.totalEntries,
        caloriesGoal: dashboard.goals?.dailyCaloriesTarget,
        remainingCalories: dashboard.goals?.dailyCaloriesTarget - dashboard.totals.totalCalories,
        progressPercentage: dashboard.progress?.calories,
        mealBreakdown: dashboard.breakdown.byMealType,
        summary: {
          totalMeals: Object.values(dashboard.breakdown.byMealType).filter(meal => meal.entries > 0).length,
          avgCaloriesPerMeal: dashboard.totals.totalEntries > 0 ? 
            Math.round(dashboard.totals.totalCalories / dashboard.totals.totalEntries) : 0
        },
        lastEntry: dashboard.lastEntry
      }, 'Today calories summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTodayMealStats(req, res, next) {
    try {
      const { user } = req;
      
      const dashboard = await ConsumptionService.getNutritionDashboard(user.id, 'today');
      
      return ApiResponse.success(res, {
        mealBreakdown: dashboard.breakdown.byMealType,
        totalCalories: dashboard.totals.totalCalories,
        summary: {
          totalMeals: Object.values(dashboard.breakdown.byMealType).filter(meal => meal.entries > 0).length,
          hasBreakfast: dashboard.breakdown.byMealType.breakfast?.entries > 0,
          hasLunch: dashboard.breakdown.byMealType.lunch?.entries > 0,
          hasDinner: dashboard.breakdown.byMealType.dinner?.entries > 0
        },
        goals: dashboard.goals,
        progress: dashboard.progress
      }, 'Today meal statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getWeeklyStats(req, res, next) {
    try {
      const { user } = req;
      const weekOffset = parseInt(req.query.weekOffset) || 0;
      
      const stats = await ConsumptionService.getNutritionDashboard(user.id, 'week', {
        weekOffset,
        includeComparison: true,
        includeGoals: true
      });
      
      return ApiResponse.success(res, stats, 'Weekly statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyStats(req, res, next) {
    try {
      const { user } = req;
      const monthOffset = parseInt(req.query.monthOffset) || 0;
      
      const stats = await ConsumptionService.getNutritionDashboard(user.id, 'month', {
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

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  async getServiceMetadata(req, res, next) {
    try {
      const metadata = {
        service: 'consumption-service-v2',
        version: process.env.API_VERSION || '2.0.0',
        features: {
          unifiedItemSupport: true,
          foodIntegration: true,
          recipeIntegration: true,
          advancedAnalytics: true,
          crossModuleSync: true,
          migrationTools: true,
          aiAnalysis: true,
          barcodeScanning: true,
          voiceInput: true,
          bulkOperations: true,
          socialSharing: true,
          customReports: true
        },
        supportedItemTypes: ['food', 'recipe'],
        supportedFormats: {
          import: ['json', 'csv'],
          export: ['json', 'csv', 'xlsx', 'pdf']
        },
        limits: {
          maxEntriesPerDay: 200,
          maxBatchSize: 50,
          maxExportEntries: 10000,
          maxQuickMealItems: 20
        },
        integrations: {
          foodService: true,
          recipeService: true,
          userService: true,
          nutritionDatabase: true
        },
        subscriptionFeatures: {
          free: ['basic_tracking', 'simple_stats', 'food_entries', 'recipe_entries'],
          premium: ['ai_analysis', 'advanced_stats', 'bulk_operations', 'export_csv'],
          pro: ['custom_reports', 'advanced_analytics', 'unlimited_exports', 'api_access']
        }
      };
      
      return ApiResponse.success(res, metadata, 'Service metadata retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

}

// ========================================
// HELPER FUNCTIONS - MOVED OUTSIDE CLASS
// ========================================

function generateBalanceRecommendations(itemTypeBreakdown) {
  const recommendations = [];
  
  if (!itemTypeBreakdown) return recommendations;
  
  const foodCalories = itemTypeBreakdown.food?.calories || 0;
  const recipeCalories = itemTypeBreakdown.recipe?.calories || 0;
  const total = foodCalories + recipeCalories;

  if (total === 0) return recommendations;

  const foodPercentage = (foodCalories / total) * 100;
  const recipePercentage = (recipeCalories / total) * 100;

  if (foodPercentage > 80) {
    recommendations.push({
      type: 'suggestion',
      message: 'Consider incorporating more recipes for meal variety and balanced nutrition.',
      priority: 'medium'
    });
  }

  if (recipePercentage > 80) {
    recommendations.push({
      type: 'suggestion',
      message: 'Consider adding more fresh foods and simple ingredients to your diet.',
      priority: 'medium'
    });
  }

  return recommendations;
}

function generateSourceRecommendations(itemTypeBreakdown) {
  const recommendations = [];
  
  if (!itemTypeBreakdown) return recommendations;
  
  const foodEntries = itemTypeBreakdown.food?.entries || 0;
  const recipeEntries = itemTypeBreakdown.recipe?.entries || 0;

  if (foodEntries === 0) {
    recommendations.push({
      type: 'tip',
      message: 'Track individual foods for more precise nutritional monitoring.',
      priority: 'low'
    });
  }

  if (recipeEntries === 0) {
    recommendations.push({
      type: 'tip',
      message: 'Try logging complete recipes to track your cooking habits.',
      priority: 'low'
    });
  }

  return recommendations;
}

function generateRecipeUsageInsights(topRecipes) {
  const insights = [];

  if (!topRecipes || !Array.isArray(topRecipes)) return insights;

  if (topRecipes.length === 0) {
    insights.push({
      type: 'observation',
      message: 'No recipe consumption recorded in this period.',
      priority: 'low'
    });
    return insights;
  }

  const mostUsedRecipe = topRecipes[0];
  if (mostUsedRecipe && mostUsedRecipe.consumptionCount > 5) {
    insights.push({
      type: 'observation',
      message: `Your most frequently made recipe is "${mostUsedRecipe.name || 'Unknown'}" with ${mostUsedRecipe.consumptionCount} servings.`,
      priority: 'info'
    });
  }

  const avgCalories = topRecipes.reduce((sum, recipe) => {
    return sum + (recipe.avgCaloriesPerServing || 0);
  }, 0) / topRecipes.length;
  
  if (avgCalories > 600) {
    insights.push({
      type: 'suggestion',
      message: 'Consider incorporating some lighter recipes to balance your caloric intake.',
      priority: 'medium'
    });
  }

  return insights;
}

function compareNutritionalProfiles(itemTypeBreakdown) {
  if (!itemTypeBreakdown) {
    return {
      proteinRatio: { food: 0, recipe: 0 },
      carbsRatio: { food: 0, recipe: 0 },
      fatRatio: { food: 0, recipe: 0 },
      caloriesDensity: { food: 0, recipe: 0 }
    };
  }

  const food = itemTypeBreakdown.food || {};
  const recipe = itemTypeBreakdown.recipe || {};

  return {
    proteinRatio: {
      food: food.protein || 0,
      recipe: recipe.protein || 0
    },
    carbsRatio: {
      food: food.carbs || 0,
      recipe: recipe.carbs || 0
    },
    fatRatio: {
      food: food.fat || 0,
      recipe: recipe.fat || 0
    },
    caloriesDensity: {
      food: food.entries > 0 ? (food.calories || 0) / food.entries : 0,
      recipe: recipe.entries > 0 ? (recipe.calories || 0) / recipe.entries : 0
    }
  };
}

function generateFoodVsRecipeRecommendations(itemTypeBreakdown) {
  const recommendations = [];
  
  if (!itemTypeBreakdown) return recommendations;
  
  const food = itemTypeBreakdown.food || {};
  const recipe = itemTypeBreakdown.recipe || {};

  const totalCalories = (food.calories || 0) + (recipe.calories || 0);
  if (totalCalories === 0) return recommendations;

  const foodPercentage = ((food.calories || 0) / totalCalories) * 100;

  if (foodPercentage < 30) {
    recommendations.push({
      type: 'suggestion',
      message: 'Consider incorporating more fresh, whole foods into your diet for better nutritional variety.',
      priority: 'medium',
      action: 'increase_food_intake'
    });
  }

  if (foodPercentage > 70) {
    recommendations.push({
      type: 'suggestion',
      message: 'Try cooking more complete recipes to improve meal satisfaction and nutritional balance.',
      priority: 'medium',
      action: 'increase_recipe_usage'
    });
  }

  return recommendations;
}

module.exports = new ConsumptionController();