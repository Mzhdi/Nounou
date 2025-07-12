const categoryService = require('../services/categoryService');

class CategoryController {
  async createCategory(req, res) {
    try {
      // Validation basique
      if (!req.body.name) {
        return res.status(400).json({
          success: false,
          message: 'Le nom de la catégorie est requis'
        });
      }

      const category = await categoryService.createCategory(req.body);

      res.status(201).json({
        success: true,
        message: 'Catégorie créée avec succès',
        data: category
      });
    } catch (error) {
      console.error('Erreur création catégorie:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur serveur'
      });
    }
  }

  async getCategories(req, res) {
    try {
      const { level, parent_id, include_inactive } = req.query;
      
      const categories = await categoryService.getCategories({
        level: level ? parseInt(level) : undefined,
        parent_id,
        include_inactive: include_inactive === 'true'
      });

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Erreur récupération catégories:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur serveur'
      });
    }
  }

  async getCategoryTree(req, res) {
    try {
      const tree = await categoryService.getCategoryTree();

      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      console.error('Erreur arbre catégories:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur serveur'
      });
    }
  }

  async getCategoryById(req, res) {
    try {
      const { categoryId } = req.params;
      const category = await categoryService.getCategoryById(categoryId);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Catégorie non trouvée'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Erreur récupération catégorie:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur serveur'
      });
    }
  }

  async updateCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const updatedCategory = await categoryService.updateCategory(categoryId, req.body);

      if (!updatedCategory) {
        return res.status(404).json({
          success: false,
          message: 'Catégorie non trouvée'
        });
      }

      res.json({
        success: true,
        message: 'Catégorie mise à jour',
        data: updatedCategory
      });
    } catch (error) {
      console.error('Erreur mise à jour catégorie:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur serveur'
      });
    }
  }
}

module.exports = new CategoryController();