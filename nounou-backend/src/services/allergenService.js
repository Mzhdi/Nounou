const FoodAllergen = require('../models/foodAllergenModel');

class AllergenService {
  async addAllergen(foodId, allergenData) {
    try {
      const allergen = new FoodAllergen({
        food_id: foodId,
        ...allergenData
      });

      await allergen.save();
      return allergen;
    } catch (error) {
      console.error('Erreur ajout allergène:', error);
      throw error;
    }
  }

  async removeAllergen(foodId, allergenName) {
    try {
      await FoodAllergen.deleteOne({
        food_id: foodId,
        allergen: allergenName
      });
    } catch (error) {
      console.error('Erreur suppression allergène:', error);
      throw error;
    }
  }

  async getFoodAllergens(foodId) {
    try {
      const allergens = await FoodAllergen.find({ food_id: foodId }).lean();
      return allergens;
    } catch (error) {
      console.error('Erreur récupération allergènes:', error);
      throw error;
    }
  }

  async updateAllergen(foodId, allergenName, updateData) {
    try {
      const updatedAllergen = await FoodAllergen.findOneAndUpdate(
        { food_id: foodId, allergen: allergenName },
        updateData,
        { new: true }
      );

      return updatedAllergen;
    } catch (error) {
      console.error('Erreur mise à jour allergène:', error);
      throw error;
    }
  }
}

module.exports = new AllergenService();