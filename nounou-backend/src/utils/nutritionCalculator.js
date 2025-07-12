class NutritionCalculator {
  // Calculer les valeurs nutritionnelles pour une quantité donnée
  static calculateForQuantity(nutritionPer100g, quantityGrams) {
    const ratio = quantityGrams / 100;
    const result = {};

    Object.keys(nutritionPer100g).forEach(key => {
      if (typeof nutritionPer100g[key] === 'number') {
        result[key] = parseFloat((nutritionPer100g[key] * ratio).toFixed(2));
      } else {
        result[key] = nutritionPer100g[key];
      }
    });

    return result;
  }

  // Calculer le score de qualité nutritionnelle
  static calculateQualityScore(nutrition) {
    let score = 100;

    // Réduire le score selon certains critères
    if (nutrition.calories > 400) score -= 10;
    if (nutrition.fat_g > 20) score -= 15;
    if (nutrition.saturated_fat_g > 5) score -= 10;
    if (nutrition.sugars_g > 15) score -= 15;
    if (nutrition.sodium_mg > 600) score -= 20;

    // Augmenter le score pour les éléments positifs
    if (nutrition.fiber_g > 3) score += 10;
    if (nutrition.protein_g > 10) score += 10;
    if (nutrition.vitamin_c_mg > 10) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  // Calculer les macronutriments en pourcentage
  static calculateMacroPercentages(nutrition) {
    const proteinCal = nutrition.protein_g * 4;
    const carbsCal = nutrition.carbohydrates_g * 4;
    const fatCal = nutrition.fat_g * 9;
    const totalCal = proteinCal + carbsCal + fatCal;

    if (totalCal === 0) {
      return { protein: 0, carbs: 0, fat: 0 };
    }

    return {
      protein: Math.round((proteinCal / totalCal) * 100),
      carbs: Math.round((carbsCal / totalCal) * 100),
      fat: Math.round((fatCal / totalCal) * 100)
    };
  }

  // Estimer le Nutri-Score (simplifié)
  static estimateNutriScore(nutrition) {
    let points = 0;

    // Points négatifs
    if (nutrition.calories >= 335) points += 10;
    else if (nutrition.calories >= 270) points += 8;
    else if (nutrition.calories >= 230) points += 6;
    else if (nutrition.calories >= 185) points += 4;
    else if (nutrition.calories >= 140) points += 2;

    if (nutrition.saturated_fat_g >= 10) points += 10;
    else if (nutrition.saturated_fat_g >= 7) points += 8;
    else if (nutrition.saturated_fat_g >= 4) points += 6;
    else if (nutrition.saturated_fat_g >= 2) points += 4;
    else if (nutrition.saturated_fat_g >= 1) points += 2;

    if (nutrition.sugars_g >= 45) points += 10;
    else if (nutrition.sugars_g >= 36) points += 8;
    else if (nutrition.sugars_g >= 27) points += 6;
    else if (nutrition.sugars_g >= 18) points += 4;
    else if (nutrition.sugars_g >= 9) points += 2;

    if (nutrition.sodium_mg >= 900) points += 10;
    else if (nutrition.sodium_mg >= 720) points += 8;
    else if (nutrition.sodium_mg >= 540) points += 6;
    else if (nutrition.sodium_mg >= 360) points += 4;
    else if (nutrition.sodium_mg >= 180) points += 2;

    // Points positifs
    if (nutrition.fiber_g >= 4.7) points -= 5;
    else if (nutrition.fiber_g >= 3.7) points -= 4;
    else if (nutrition.fiber_g >= 2.8) points -= 3;
    else if (nutrition.fiber_g >= 1.9) points -= 2;
    else if (nutrition.fiber_g >= 0.9) points -= 1;

    if (nutrition.protein_g >= 8) points -= 5;
    else if (nutrition.protein_g >= 6.4) points -= 4;
    else if (nutrition.protein_g >= 4.8) points -= 3;
    else if (nutrition.protein_g >= 3.2) points -= 2;
    else if (nutrition.protein_g >= 1.6) points -= 1;

    // Conversion en lettre
    if (points <= -1) return 'A';
    if (points <= 2) return 'B';
    if (points <= 10) return 'C';
    if (points <= 18) return 'D';
    return 'E';
  }
}

module.exports = NutritionCalculator;