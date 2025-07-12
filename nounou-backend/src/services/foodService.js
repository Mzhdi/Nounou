const Food = require('../models/foodModel');
const FoodCategory = require('../models/foodCategoryModel');
const NutritionalValue = require('../models/nutritionalValueModel');
const FoodAllergen = require('../models/foodAllergenModel');
const FoodImage = require('../models/foodImageModel');

class FoodService {
  // Créer un aliment complet avec toutes ses données
  async createCompleteFood(foodData, userId) {
    const {
      food,
      nutritional_values,
      allergens = [],
      images = []
    } = foodData;

    try {
      // 1. Créer l'aliment principal
      const newFood = new Food({
        ...food,
        created_by: userId
      });
      await newFood.save();

      // 2. Créer les valeurs nutritionnelles
      if (nutritional_values) {
        const nutrition = new NutritionalValue({
          ...nutritional_values,
          food_id: newFood._id.toString()  // CORRIGÉ : utilise _id
        });
        await nutrition.save();
      }

      // 3. Créer les allergènes
      if (allergens.length > 0) {
        const allergenDocs = allergens.map(allergen => ({
          food_id: newFood._id.toString(),  // CORRIGÉ : utilise _id
          ...allergen
        }));
        await FoodAllergen.insertMany(allergenDocs);
      }

      // 4. Créer les images
      if (images.length > 0) {
        const imageDocs = images.map(image => ({
          food_id: newFood._id.toString(),  // CORRIGÉ : utilise _id
          uploaded_by: userId,
          ...image
        }));
        await FoodImage.insertMany(imageDocs);
      }

      // Retourner l'aliment complet
      return await this.getFoodById(newFood._id.toString(), {  // CORRIGÉ : utilise _id
        includeNutrition: true,
        includeAllergens: true,
        includeImages: true
      });

    } catch (error) {
      console.error('Erreur création aliment complet:', error);
      throw new Error('Erreur lors de la création de l\'aliment');
    }
  }

  // Récupérer un aliment par ID avec options d'inclusion
  async getFoodById(foodId, options = {}) {
    try {
      const food = await Food.findById(foodId);  // CORRIGÉ : utilise findById
      if (!food) return null;

      const result = food.toObject();

      // Inclure les valeurs nutritionnelles
      if (options.includeNutrition) {
        const nutrition = await NutritionalValue.findOne({ food_id: foodId });
        result.nutritional_values = nutrition;
      }

      // Inclure les allergènes
      if (options.includeAllergens) {
        const allergens = await FoodAllergen.find({ food_id: foodId });
        result.allergens = allergens;
      }

      // Inclure les images
      if (options.includeImages) {
        const images = await FoodImage.find({ food_id: foodId });
        result.images = images;
      }

      return result;
    } catch (error) {
      console.error('Erreur récupération aliment:', error);
      throw error;
    }
  }

  // Lister les aliments avec filtres et pagination
  async getFoodsWithFilters(filters, options) {
    try {
      const query = {};

      // Filtres
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
      if (filters.category_id) {
        query.category_id = filters.category_id;
      }
      if (filters.food_type) {
        query.food_type = filters.food_type;
      }
      if (filters.is_verified !== undefined) {
        query.is_verified = filters.is_verified;
      }

      // Tri
      let sortOption = {};
      switch (options.sort) {
        case 'name':
          sortOption = { name: 1 };
          break;
        case 'created_at':
          sortOption = { created_at: -1 };
          break;
        case 'updated_at':
          sortOption = { updated_at: -1 };
          break;
        default:
          sortOption = { name: 1 };
      }

      // Pagination
      const skip = (options.page - 1) * options.limit;

      const [foods, total] = await Promise.all([
        Food.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(options.limit)
          .lean(),
        Food.countDocuments(query)
      ]);

      return {
        foods,
        pagination: {
          current_page: options.page,
          total_pages: Math.ceil(total / options.limit),
          total_items: total,
          items_per_page: options.limit
        }
      };
    } catch (error) {
      console.error('Erreur filtrage aliments:', error);
      throw error;
    }
  }

  // Recherche par code-barres
  async getFoodByBarcode(barcode) {
    try {
      const food = await Food.findOne({ barcode }).lean();
      if (!food) return null;

      // Inclure automatiquement nutrition et images
      const [nutrition, images] = await Promise.all([
        NutritionalValue.findOne({ food_id: food._id.toString() }).lean(),  // CORRIGÉ : utilise _id
        FoodImage.find({ food_id: food._id.toString() }).lean()  // CORRIGÉ : utilise _id
      ]);

      return {
        ...food,
        nutritional_values: nutrition,
        images
      };
    } catch (error) {
      console.error('Erreur recherche code-barres:', error);
      throw error;
    }
  }

  // Recherche textuelle
  async searchFoods(searchTerm, limit = 10) {
    try {
      const foods = await Food.find(
        { $text: { $search: searchTerm } },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();

      return foods;
    } catch (error) {
      console.error('Erreur recherche textuelle:', error);
      throw error;
    }
  }

  // Mettre à jour un aliment
  async updateFood(foodId, updateData) {
    try {
      const updatedFood = await Food.findByIdAndUpdate(  // CORRIGÉ : utilise findByIdAndUpdate
        foodId,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedFood;
    } catch (error) {
      console.error('Erreur mise à jour aliment:', error);
      throw error;
    }
  }

  // Suppression soft delete
  async softDeleteFood(foodId) {
    try {
      const updatedFood = await Food.findByIdAndUpdate(  // CORRIGÉ : utilise findByIdAndUpdate
        foodId,
        { is_deleted: true },
        { new: true }
      );

      return updatedFood;
    } catch (error) {
      console.error('Erreur suppression aliment:', error);
      throw error;
    }
  }
}

module.exports = new FoodService();