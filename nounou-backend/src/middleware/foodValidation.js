const { body, param } = require('express-validator');

const validateCreateFood = [
  body('food.name')
    .notEmpty()
    .withMessage('Le nom de l\'aliment est requis')
    .isLength({ max: 200 })
    .withMessage('Le nom ne peut pas dépasser 200 caractères'),
  
  body('food.category_id')
    .notEmpty()
    .withMessage('La catégorie est requise'),
  
  body('food.food_type')
    .isIn(['product', 'ingredient', 'recipe', 'composite'])
    .withMessage('Type d\'aliment invalide'),
  
  body('food.serving_size_g')
    .isFloat({ min: 0 })
    .withMessage('La taille de portion doit être positive'),
  
  body('nutritional_values.calories')
    .isFloat({ min: 0 })
    .withMessage('Les calories doivent être positives'),
  
  body('nutritional_values.protein_g')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Les protéines doivent être positives'),
  
  body('nutritional_values.carbohydrates_g')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Les glucides doivent être positifs'),
  
  body('nutritional_values.fat_g')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Les lipides doivent être positifs')
];

const validateUpdateFood = [
  body('name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Le nom ne peut pas dépasser 200 caractères'),
  
  body('food_type')
    .optional()
    .isIn(['product', 'ingredient', 'recipe', 'composite'])
    .withMessage('Type d\'aliment invalide'),
  
  body('serving_size_g')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La taille de portion doit être positive')
];

module.exports = {
  validateCreateFood,
  validateUpdateFood
};