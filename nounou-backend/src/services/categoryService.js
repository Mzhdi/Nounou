const FoodCategory = require('../models/foodCategoryModel');

class CategoryService {
  async createCategory(categoryData) {
    try {
      const { name, parent_id = null, level = 0 } = categoryData;
      
      // Générer le slug
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();

      // Construire le path
      let path = `/${slug}`;
      
      if (parent_id) {
        const parent = await FoodCategory.findOne({ category_id: parent_id });
        if (!parent) {
          throw new Error('Catégorie parent non trouvée');
        }
        path = `${parent.path}/${slug}`;
      }

      const category = new FoodCategory({
        name,
        slug,
        parent_id,
        level,
        path
      });

      await category.save();
      return category;
    } catch (error) {
      console.error('Erreur création catégorie:', error);
      throw error;
    }
  }

  async getCategories(filters = {}) {
    try {
      const query = {};
      
      if (filters.level !== undefined) {
        query.level = filters.level;
      }
      
      if (filters.parent_id) {
        query.parent_id = filters.parent_id;
      }
      
      if (!filters.include_inactive) {
        query.is_active = true;
      }

      const categories = await FoodCategory.find(query)
        .sort({ path: 1, name: 1 })
        .lean();

      return categories;
    } catch (error) {
      console.error('Erreur récupération catégories:', error);
      throw error;
    }
  }

  async getCategoryTree() {
    try {
      const categories = await FoodCategory.find({ is_active: true })
        .sort({ path: 1 })
        .lean();

      // Construire l'arbre
      const tree = [];
      const categoryMap = new Map();

      // Créer les objets avec children
      categories.forEach(cat => {
        categoryMap.set(cat.category_id, { ...cat, children: [] });
      });

      // Construire la hiérarchie
      categories.forEach(cat => {
        const categoryObj = categoryMap.get(cat.category_id);
        
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            parent.children.push(categoryObj);
          }
        } else {
          tree.push(categoryObj);
        }
      });

      return tree;
    } catch (error) {
      console.error('Erreur arbre catégories:', error);
      throw error;
    }
  }

  async getCategoryById(categoryId) {
    try {
      const category = await FoodCategory.findOne({ category_id: categoryId }).lean();
      return category;
    } catch (error) {
      console.error('Erreur récupération catégorie:', error);
      throw error;
    }
  }

  async updateCategory(categoryId, updateData) {
    try {
      const updatedCategory = await FoodCategory.findOneAndUpdate(
        { category_id: categoryId },
        updateData,
        { new: true, runValidators: true }
      );

      return updatedCategory;
    } catch (error) {
      console.error('Erreur mise à jour catégorie:', error);
      throw error;
    }
  }
}

module.exports = new CategoryService();