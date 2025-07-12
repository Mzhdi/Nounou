const allergenService = require('../services/allergenService');

class AllergenController {
  async addAllergen(req, res) {
    try {
      const { foodId } = req.params;
      const { allergen, presence } = req.body;

      if (!allergen || !presence) {
        return res.status(400).json({
          success: false,
          message: 'allergen et presence sont requis'
        });
      }

      const newAllergen = await allergenService.addAllergen(foodId, { allergen, presence });

      res.status(201).json({
        success: true,
        message: 'Allergène ajouté',
        data: newAllergen
      });
    } catch (error) {
      console.error('Erreur ajout allergène:', error);
      res.status(500).json({
        success: false,
        message: error.message.includes('duplicate') ? 'Allergène déjà défini pour cet aliment' : 'Erreur serveur'
      });
    }
  }

  async removeAllergen(req, res) {
    try {
      const { foodId, allergen } = req.params;
      
      await allergenService.removeAllergen(foodId, allergen);

      res.json({
        success: true,
        message: 'Allergène supprimé'
      });
    } catch (error) {
      console.error('Erreur suppression allergène:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  async getFoodAllergens(req, res) {
    try {
      const { foodId } = req.params;
      const allergens = await allergenService.getFoodAllergens(foodId);

      res.json({
        success: true,
        data: allergens
      });
    } catch (error) {
      console.error('Erreur récupération allergènes:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
}

module.exports = new AllergenController();