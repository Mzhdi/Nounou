const recipeCategoryService = require('../services/recipeCategoryService');
const ApiResponse = require('../utils/responses');

class RecipeCategoryController {
  async createCategory(req, res) {
    try {
      const categoryData = req.body;

      if (!categoryData.name) {
        return ApiResponse.badRequestError(res, 'Category name is required');
      }

      const category = await recipeCategoryService.createCategory(categoryData);
      return ApiResponse.created(res, { category }, 'Category created successfully');
    } catch (error) {
      console.error('Create category error:', error);
      if (error.message.includes('already exists')) {
        return ApiResponse.conflictError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getCategories(req, res) {
    try {
      const {
        search,
        parent_id,
        level,
        is_active = 'true',
        tree = 'false',
        page = 1,
        limit = 50,
        sort_by = 'sort_order',
        sort_order = 'asc'
      } = req.query;

      if (tree === 'true') {
        const categoryTree = await recipeCategoryService.getCategoryTree();
        return ApiResponse.success(res, { categories: categoryTree, tree: true }, 'Category tree retrieved successfully');
      }

      const filters = {
        is_active: is_active === 'true'
      };

      if (search) filters.search = search;
      if (parent_id !== undefined) {
        filters.parent_id = parent_id === 'null' ? null : parent_id;
      }
      if (level !== undefined) filters.level = parseInt(level);

      const pagination = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sort_by,
        sort_order
      };

      const result = await recipeCategoryService.searchCategories(filters, pagination);
      return ApiResponse.paginated(res, result.categories, result.pagination, 'Categories retrieved successfully');
    } catch (error) {
      console.error('Get categories error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getCategoryById(req, res) {
    try {
      const { categoryId } = req.params;
      const { include_children = 'false' } = req.query;

      let category;
      if (include_children === 'true') {
        category = await recipeCategoryService.getCategoryWithChildren(categoryId);
      } else {
        category = await recipeCategoryService.getCategoryById(categoryId);
      }
      
      return ApiResponse.success(res, { category }, 'Category retrieved successfully');
    } catch (error) {
      console.error('Get category error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getCategoryBySlug(req, res) {
    try {
      const { slug } = req.params;
      const { include_children = 'false' } = req.query;

      const category = await recipeCategoryService.getCategoryBySlug(slug);
      
      let result = category;
      if (include_children === 'true') {
        const children = await category.getChildren();
        result = {
          ...category.toObject(),
          children
        };
      }
      
      return ApiResponse.success(res, { category: result }, 'Category retrieved successfully');
    } catch (error) {
      console.error('Get category by slug error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async updateCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const updateData = req.body;

      const category = await recipeCategoryService.updateCategory(categoryId, updateData);
      return ApiResponse.success(res, { category }, 'Category updated successfully');
    } catch (error) {
      console.error('Update category error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      if (error.message.includes('already exists') || error.message.includes('circular')) {
        return ApiResponse.conflictError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async deleteCategory(req, res) {
    try {
      const { categoryId } = req.params;

      await recipeCategoryService.deleteCategory(categoryId);
      return ApiResponse.success(res, null, 'Category deleted successfully');
    } catch (error) {
      console.error('Delete category error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      if (error.message.includes('Cannot delete')) {
        return ApiResponse.conflictError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getRootCategories(req, res) {
    try {
      const categories = await recipeCategoryService.getRootCategories();
      return ApiResponse.success(res, { categories }, 'Root categories retrieved successfully');
    } catch (error) {
      console.error('Get root categories error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getCategoryBreadcrumb(req, res) {
    try {
      const { categoryId } = req.params;

      const breadcrumb = await recipeCategoryService.getCategoryBreadcrumb(categoryId);
      return ApiResponse.success(res, { breadcrumb }, 'Category breadcrumb retrieved successfully');
    } catch (error) {
      console.error('Get category breadcrumb error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async reorderCategories(req, res) {
    try {
      const { parent_id } = req.params;
      const { category_orders } = req.body;

      if (!Array.isArray(category_orders)) {
        return ApiResponse.badRequestError(res, 'category_orders must be an array');
      }

      for (const order of category_orders) {
        if (!order.categoryId || typeof order.sortOrder !== 'number') {
          return ApiResponse.badRequestError(res, 'Each item must have categoryId and sortOrder');
        }
      }

      await recipeCategoryService.reorderCategories(parent_id, category_orders);
      return ApiResponse.success(res, null, 'Categories reordered successfully');
    } catch (error) {
      console.error('Reorder categories error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getCategoryStats(req, res) {
    try {
      const { categoryId } = req.params;

      const stats = await recipeCategoryService.getCategoryStats(categoryId);
      return ApiResponse.success(res, { stats }, 'Category statistics retrieved successfully');
    } catch (error) {
      console.error('Get category stats error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getAllCategoryStats(req, res) {
    try {
      const stats = await recipeCategoryService.getAllCategoryStats();
      return ApiResponse.success(res, { categories: stats }, 'All category statistics retrieved successfully');
    } catch (error) {
      console.error('Get all category stats error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async updateCategoryStats(req, res) {
    try {
      const { categoryId } = req.params;

      const stats = await recipeCategoryService.updateCategoryStats(categoryId);
      return ApiResponse.success(res, { stats }, 'Category statistics updated successfully');
    } catch (error) {
      console.error('Update category stats error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getCategoriesByLevel(req, res) {
    try {
      const { level } = req.params;
      const levelNum = parseInt(level);

      if (isNaN(levelNum) || levelNum < 0 || levelNum > 4) {
        return ApiResponse.badRequestError(res, 'Level must be between 0 and 4');
      }

      const filters = { level: levelNum };
      const pagination = {
        page: 1,
        limit: 100,
        sort_by: 'sort_order',
        sort_order: 'asc'
      };

      const result = await recipeCategoryService.searchCategories(filters, pagination);
      return ApiResponse.success(res, { categories: result.categories, level: levelNum }, `Level ${level} categories retrieved successfully`);
    } catch (error) {
      console.error('Get categories by level error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async searchCategories(req, res) {
    try {
      const { q: search } = req.query;
      
      if (!search || search.trim().length < 2) {
        return ApiResponse.badRequestError(res, 'Search query must be at least 2 characters');
      }

      const filters = {
        search: search.trim(),
        is_active: true
      };
      
      const pagination = {
        page: 1,
        limit: 50,
        sort_by: 'name',
        sort_order: 'asc'
      };

      const result = await recipeCategoryService.searchCategories(filters, pagination);
      return ApiResponse.paginated(res, result.categories, result.pagination, 'Category search completed successfully');
    } catch (error) {
      console.error('Search categories error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getCategoryPath(req, res) {
    try {
      const { categoryId } = req.params;

      const category = await recipeCategoryService.getCategoryById(categoryId);
      const parents = await category.getParents();
      
      const path = [...parents, category].map(cat => ({
        id: cat._id,
        name: cat.name,
        slug: cat.slug,
        level: cat.level
      }));
      
      return ApiResponse.success(res, { path, full_path: category.path }, 'Category path retrieved successfully');
    } catch (error) {
      console.error('Get category path error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }
}

module.exports = new RecipeCategoryController();