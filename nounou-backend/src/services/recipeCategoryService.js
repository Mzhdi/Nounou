// src/services/recipeCategoryService.js
const RecipeCategory = require('../models/recipeCategoryModel');
const Recipe = require('../models/recipeModel');

class RecipeCategoryService {
  // ===============================
  // CRUD Operations
  // ===============================

  async createCategory(categoryData) {
    try {
      // Validation des données de base
      if (!categoryData.name) {
        throw new Error('Category name is required');
      }

      // Générer le slug si non fourni
      if (!categoryData.slug) {
        categoryData.slug = this.generateSlug(categoryData.name);
      }

      // Vérifier l'unicité du slug
      const existingCategory = await RecipeCategory.findOne({ 
        slug: categoryData.slug 
      });
      if (existingCategory) {
        throw new Error('A category with this slug already exists');
      }

      // Valider et définir le parent si fourni
      if (categoryData.parent_id) {
        const parent = await RecipeCategory.findById(categoryData.parent_id);
        if (!parent) {
          throw new Error('Parent category not found');
        }
        if (parent.level >= 4) { // Limiter à 5 niveaux (0-4)
          throw new Error('Maximum category depth exceeded');
        }
      }

      const category = new RecipeCategory({
        name: categoryData.name.trim(),
        slug: categoryData.slug,
        description: categoryData.description,
        parent_id: categoryData.parent_id || null,
        icon_name: categoryData.icon_name,
        color_hex: categoryData.color_hex,
        sort_order: categoryData.sort_order || 0,
        is_active: categoryData.is_active !== undefined ? categoryData.is_active : true
      });

      await category.save();
      return category;
    } catch (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  async getCategoryById(categoryId) {
    try {
      const category = await RecipeCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    } catch (error) {
      throw new Error(`Failed to get category: ${error.message}`);
    }
  }

  async getCategoryBySlug(slug) {
    try {
      const category = await RecipeCategory.findOne({ slug, is_active: true });
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    } catch (error) {
      throw new Error(`Failed to get category: ${error.message}`);
    }
  }

  async updateCategory(categoryId, updateData) {
    try {
      const category = await RecipeCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Vérifier l'unicité du slug si modifié
      if (updateData.slug && updateData.slug !== category.slug) {
        const existingCategory = await RecipeCategory.findOne({ 
          slug: updateData.slug,
          _id: { $ne: categoryId }
        });
        if (existingCategory) {
          throw new Error('A category with this slug already exists');
        }
      }

      // Valider le parent si modifié
      if (updateData.parent_id && updateData.parent_id !== category.parent_id) {
        if (updateData.parent_id === category._id.toString()) {
          throw new Error('Category cannot be its own parent');
        }

        const parent = await RecipeCategory.findById(updateData.parent_id);
        if (!parent) {
          throw new Error('Parent category not found');
        }

        // Vérifier que cela ne crée pas une boucle
        if (await this.wouldCreateLoop(categoryId, updateData.parent_id)) {
          throw new Error('This would create a circular reference');
        }
      }

      Object.assign(category, updateData);
      await category.save();

      // Mettre à jour les enfants si le path a changé
      if (updateData.slug || updateData.parent_id) {
        await this.updateChildrenPaths(categoryId);
      }

      return category;
    } catch (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }
  }

  async deleteCategory(categoryId) {
    try {
      const category = await RecipeCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Vérifier s'il y a des recettes associées
      const recipeCount = await Recipe.countDocuments({ category_id: categoryId });
      if (recipeCount > 0) {
        throw new Error(`Cannot delete category: ${recipeCount} recipes are using it`);
      }

      // Vérifier s'il y a des sous-catégories
      const childrenCount = await RecipeCategory.countDocuments({ parent_id: categoryId });
      if (childrenCount > 0) {
        throw new Error(`Cannot delete category: it has ${childrenCount} subcategories`);
      }

      await RecipeCategory.findByIdAndDelete(categoryId);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  // ===============================
  // Tree Operations
  // ===============================

  async getCategoryTree() {
    try {
      return await RecipeCategory.buildTree();
    } catch (error) {
      throw new Error(`Failed to get category tree: ${error.message}`);
    }
  }

  async getRootCategories() {
    try {
      return await RecipeCategory.findRoots();
    } catch (error) {
      throw new Error(`Failed to get root categories: ${error.message}`);
    }
  }

  async getCategoryWithChildren(categoryId) {
    try {
      const category = await this.getCategoryById(categoryId);
      const children = await category.getChildren();
      
      return {
        ...category.toObject(),
        children
      };
    } catch (error) {
      throw new Error(`Failed to get category with children: ${error.message}`);
    }
  }

  async getCategoryBreadcrumb(categoryId) {
    try {
      const category = await this.getCategoryById(categoryId);
      const breadcrumb = await category.getFullPath();
      
      return breadcrumb.map(cat => ({
        id: cat._id,
        name: cat.name,
        slug: cat.slug,
        path: cat.path
      }));
    } catch (error) {
      throw new Error(`Failed to get category breadcrumb: ${error.message}`);
    }
  }

  // ===============================
  // Search and Filtering
  // ===============================

  async searchCategories(filters = {}, pagination = {}) {
    try {
      const {
        search,
        parent_id,
        level,
        is_active = true
      } = filters;

      const {
        page = 1,
        limit = 20,
        sort_by = 'sort_order',
        sort_order = 'asc'
      } = pagination;

      // Construire la query
      const query = { is_active };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      if (parent_id !== undefined) {
        query.parent_id = parent_id;
      }

      if (level !== undefined) {
        query.level = level;
      }

      // Pagination
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;
      
      // Ajouter un tri secondaire par nom
      if (sort_by !== 'name') {
        sortOptions.name = 1;
      }

      // Exécuter la requête
      const [categories, total] = await Promise.all([
        RecipeCategory.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        RecipeCategory.countDocuments(query)
      ]);

      return {
        categories,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      throw new Error(`Failed to search categories: ${error.message}`);
    }
  }

  // ===============================
  // Statistics
  // ===============================

  async updateCategoryStats(categoryId) {
    try {
      const recipeCount = await Recipe.countDocuments({ 
        category_id: categoryId,
        is_public: true
      });

      await RecipeCategory.findByIdAndUpdate(categoryId, {
        recipe_count: recipeCount
      });

      return { recipe_count: recipeCount };
    } catch (error) {
      throw new Error(`Failed to update category stats: ${error.message}`);
    }
  }

  async getCategoryStats(categoryId) {
    try {
      const category = await this.getCategoryById(categoryId);
      
      const [publicRecipes, totalRecipes, subcategories] = await Promise.all([
        Recipe.countDocuments({ category_id: categoryId, is_public: true }),
        Recipe.countDocuments({ category_id: categoryId }),
        RecipeCategory.countDocuments({ parent_id: categoryId, is_active: true })
      ]);

      return {
        category_info: {
          id: category._id,
          name: category.name,
          level: category.level
        },
        public_recipes: publicRecipes,
        total_recipes: totalRecipes,
        subcategories: subcategories
      };
    } catch (error) {
      throw new Error(`Failed to get category stats: ${error.message}`);
    }
  }

  async getAllCategoryStats() {
    try {
      const categories = await RecipeCategory.find({ is_active: true });
      const stats = await Promise.all(
        categories.map(async (category) => {
          const categoryStats = await this.getCategoryStats(category._id.toString());
          return {
            ...categoryStats.category_info,
            ...categoryStats
          };
        })
      );

      return stats.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    } catch (error) {
      throw new Error(`Failed to get all category stats: ${error.message}`);
    }
  }

  // ===============================
  // Utility Methods
  // ===============================

  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  async wouldCreateLoop(categoryId, newParentId) {
    let currentId = newParentId;
    
    while (currentId) {
      if (currentId === categoryId) {
        return true;
      }
      
      const parent = await RecipeCategory.findById(currentId);
      if (!parent) {
        break;
      }
      
      currentId = parent.parent_id;
    }
    
    return false;
  }

  async updateChildrenPaths(categoryId) {
    try {
      const children = await RecipeCategory.find({ parent_id: categoryId });
      
      for (const child of children) {
        // Le pre-save hook mettra à jour automatiquement le path
        await child.save();
        
        // Mettre à jour récursivement les enfants de cet enfant
        await this.updateChildrenPaths(child._id.toString());
      }
    } catch (error) {
      console.error('Error updating children paths:', error);
    }
  }

  async reorderCategories(parentId, categoryOrders) {
    try {
      // categoryOrders est un array de { categoryId, sortOrder }
      const updatePromises = categoryOrders.map(({ categoryId, sortOrder }) =>
        RecipeCategory.findByIdAndUpdate(categoryId, { sort_order: sortOrder })
      );

      await Promise.all(updatePromises);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to reorder categories: ${error.message}`);
    }
  }
}

module.exports = new RecipeCategoryService();