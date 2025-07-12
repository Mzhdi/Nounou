// src/seeds/recipeTestData.js
const recipeService = require('../services/recipeService');
const RecipeCategory = require('../models/recipeCategoryModel');
const Food = require('../models/foodModel');

const sampleRecipes = [
  {
    name: 'Salade César Maison',
    description: 'Une délicieuse salade César avec sa sauce crémeuse et ses croûtons croustillants.',
    prep_time_minutes: 20,
    cook_time_minutes: 10,
    total_time_minutes: 30,
    servings: 4,
    difficulty_level: 'easy',
    cuisine_type: 'Italienne',
    diet_types: ['vegetarian'],
    tags: ['salade', 'été', 'frais', 'rapide'],
    is_public: true,
    ingredients: [
      {
        food_name: 'Laitue romaine', // Sera résolu en food_id
        quantity: 2,
        unit: 'pieces',
        preparation_note: 'lavée et coupée'
      },
      {
        food_name: 'Parmesan',
        quantity: 50,
        unit: 'g',
        preparation_note: 'râpé'
      },
      {
        food_name: 'Pain de mie',
        quantity: 4,
        unit: 'slices',
        preparation_note: 'coupé en dés',
        group_name: 'Croûtons'
      },
      {
        food_name: 'Huile d\'olive',
        quantity: 2,
        unit: 'tbsp',
        group_name: 'Croûtons'
      },
      {
        food_name: 'Mayonnaise',
        quantity: 3,
        unit: 'tbsp',
        group_name: 'Sauce'
      },
      {
        food_name: 'Citron',
        quantity: 0.5,
        unit: 'piece',
        preparation_note: 'jus seulement',
        group_name: 'Sauce'
      }
    ],
    instructions: [
      {
        step_number: 1,
        title: 'Préparer les croûtons',
        description: 'Couper le pain en dés. Dans une poêle, faire chauffer l\'huile d\'olive et faire dorer les dés de pain jusqu\'à ce qu\'ils soient croustillants.',
        duration_minutes: 8,
        technique: 'fry',
        equipment: ['poêle', 'spatule'],
        group_name: 'Préparation'
      },
      {
        step_number: 2,
        title: 'Préparer la sauce',
        description: 'Mélanger la mayonnaise avec le jus de citron et la moitié du parmesan râpé. Assaisonner avec du sel et du poivre.',
        duration_minutes: 5,
        technique: 'mix',
        equipment: ['bol', 'fouet'],
        group_name: 'Préparation'
      },
      {
        step_number: 3,
        title: 'Assembler la salade',
        description: 'Dans un grand saladier, mélanger la laitue avec la sauce. Ajouter les croûtons et le reste du parmesan. Servir immédiatement.',
        duration_minutes: 5,
        technique: 'mix',
        equipment: ['saladier', 'couverts à salade'],
        tips: ['Servir dans des assiettes froides pour plus de fraîcheur'],
        group_name: 'Assemblage'
      }
    ]
  },
  {
    name: 'Spaghetti Carbonara Authentique',
    description: 'La vraie recette des spaghetti à la carbonara, simple et délicieuse.',
    prep_time_minutes: 10,
    cook_time_minutes: 15,
    total_time_minutes: 25,
    servings: 4,
    difficulty_level: 'medium',
    cuisine_type: 'Italienne',
    tags: ['pâtes', 'rapide', 'authentique', 'italien'],
    is_public: true,
    ingredients: [
      {
        food_name: 'Spaghetti',
        quantity: 400,
        unit: 'g'
      },
      {
        food_name: 'Pancetta',
        quantity: 150,
        unit: 'g',
        preparation_note: 'coupée en lardons'
      },
      {
        food_name: 'Œufs',
        quantity: 4,
        unit: 'pieces',
        preparation_note: 'jaunes seulement',
        group_name: 'Sauce'
      },
      {
        food_name: 'Pecorino Romano',
        quantity: 100,
        unit: 'g',
        preparation_note: 'râpé finement',
        group_name: 'Sauce'
      },
      {
        food_name: 'Poivre noir',
        quantity: 1,
        unit: 'tsp',
        preparation_note: 'fraîchement moulu',
        group_name: 'Sauce'
      }
    ],
    instructions: [
      {
        step_number: 1,
        title: 'Cuire les pâtes',
        description: 'Faire bouillir une grande casserole d\'eau salée. Ajouter les spaghetti et cuire selon les indications du paquet jusqu\'à ce qu\'ils soient al dente.',
        duration_minutes: 10,
        technique: 'boil',
        equipment: ['grande casserole', 'passoire'],
        warning: 'Réserver 1 tasse d\'eau de cuisson avant d\'égoutter',
        group_name: 'Cuisson'
      },
      {
        step_number: 2,
        title: 'Préparer la pancetta',
        description: 'Pendant que les pâtes cuisent, faire revenir la pancetta dans une grande poêle jusqu\'à ce qu\'elle soit dorée et croustillante.',
        duration_minutes: 6,
        technique: 'saute',
        equipment: ['grande poêle'],
        group_name: 'Cuisson'
      },
      {
        step_number: 3,
        title: 'Préparer la sauce',
        description: 'Dans un bol, battre les jaunes d\'œufs avec le pecorino râpé et le poivre noir jusqu\'à obtenir un mélange homogène.',
        duration_minutes: 3,
        technique: 'whisk',
        equipment: ['bol', 'fouet'],
        group_name: 'Sauce'
      },
      {
        step_number: 4,
        title: 'Assembler le plat',
        description: 'Retirer la poêle du feu. Ajouter les pâtes égouttées à la pancetta. Verser le mélange œuf-fromage en remuant rapidement. Ajouter un peu d\'eau de cuisson si nécessaire pour créer une sauce crémeuse.',
        duration_minutes: 3,
        technique: 'mix',
        equipment: ['poêle', 'cuillère en bois'],
        tips: ['La poêle ne doit pas être trop chaude pour éviter de cuire les œufs'],
        is_critical: true,
        group_name: 'Assemblage'
      }
    ]
  },
  {
    name: 'Smoothie Bowl Tropical',
    description: 'Un smoothie bowl coloré et nutritif aux fruits tropicaux.',
    prep_time_minutes: 15,
    cook_time_minutes: 0,
    total_time_minutes: 15,
    servings: 2,
    difficulty_level: 'easy',
    cuisine_type: 'Healthy',
    diet_types: ['vegan', 'gluten_free'],
    tags: ['smoothie', 'healthy', 'tropical', 'petit-déjeuner', 'vegan'],
    is_public: true,
    ingredients: [
      {
        food_name: 'Banane',
        quantity: 2,
        unit: 'pieces',
        preparation_note: 'congelées',
        group_name: 'Base'
      },
      {
        food_name: 'Mangue',
        quantity: 150,
        unit: 'g',
        preparation_note: 'congelée',
        group_name: 'Base'
      },
      {
        food_name: 'Lait de coco',
        quantity: 100,
        unit: 'ml',
        group_name: 'Base'
      },
      {
        food_name: 'Miel',
        quantity: 1,
        unit: 'tbsp',
        is_optional: true,
        group_name: 'Base'
      },
      {
        food_name: 'Kiwi',
        quantity: 1,
        unit: 'piece',
        preparation_note: 'tranché',
        group_name: 'Toppings'
      },
      {
        food_name: 'Noix de coco râpée',
        quantity: 2,
        unit: 'tbsp',
        group_name: 'Toppings'
      },
      {
        food_name: 'Graines de chia',
        quantity: 1,
        unit: 'tbsp',
        group_name: 'Toppings'
      }
    ],
    instructions: [
      {
        step_number: 1,
        title: 'Préparer la base',
        description: 'Dans un blender, mixer les bananes et mangues congelées avec le lait de coco jusqu\'à obtenir une consistance épaisse et crémeuse. Ajouter le miel si désiré.',
        duration_minutes: 3,
        technique: 'blend',
        equipment: ['blender puissant'],
        tips: ['Utiliser des fruits bien congelés pour une consistance parfaite'],
        group_name: 'Préparation'
      },
      {
        step_number: 2,
        title: 'Dresser et garnir',
        description: 'Verser le mélange dans deux bols. Disposer harmonieusement les tranches de kiwi, la noix de coco râpée et les graines de chia sur le dessus.',
        duration_minutes: 5,
        technique: 'mix',
        equipment: ['bols', 'cuillère'],
        tips: ['Créer des motifs colorés avec les toppings pour un effet Instagram'],
        group_name: 'Dressage'
      },
      {
        step_number: 3,
        title: 'Servir',
        description: 'Servir immédiatement avec une cuillère. Peut être accompagné de granola maison pour plus de croquant.',
        duration_minutes: 1,
        tips: ['Ajouter d\'autres fruits de saison selon les goûts'],
        group_name: 'Service'
      }
    ]
  }
];

class RecipeTestDataSeeder {
  static async seed(userId) {
    try {
      console.log('🌱 Starting recipe test data seeding...');

      if (!userId) {
        throw new Error('User ID is required for seeding recipes');
      }

      const results = [];

      for (const recipeData of sampleRecipes) {
        try {
          console.log(`📝 Creating recipe: ${recipeData.name}`);

          // Trouver la catégorie appropriée
          let categoryId = null;
          if (recipeData.name.includes('Salade')) {
            const category = await RecipeCategory.findOne({ slug: 'salades' });
            categoryId = category ? category._id.toString() : null;
          } else if (recipeData.name.includes('Spaghetti')) {
            const category = await RecipeCategory.findOne({ slug: 'pates-riz' });
            categoryId = category ? category._id.toString() : null;
          } else if (recipeData.name.includes('Smoothie')) {
            const category = await RecipeCategory.findOne({ slug: 'smoothies' });
            categoryId = category ? category._id.toString() : null;
          }

          // Résoudre les food_id des ingrédients
          const resolvedIngredients = await Promise.all(
            recipeData.ingredients.map(async (ingredient) => {
              // Chercher l'aliment par nom (approximatif)
              const food = await Food.findOne({
                name: { $regex: ingredient.food_name, $options: 'i' }
              });

              if (!food) {
                console.warn(`⚠️  Food not found: ${ingredient.food_name}`);
                return null;
              }

              return {
                food_id: food._id.toString(),
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                preparation_note: ingredient.preparation_note,
                is_optional: ingredient.is_optional,
                group_name: ingredient.group_name,
                sort_order: ingredient.sort_order || 0
              };
            })
          );

          // Filtrer les ingrédients non trouvés
          const validIngredients = resolvedIngredients.filter(ing => ing !== null);

          if (validIngredients.length === 0) {
            console.warn(`⚠️  No valid ingredients found for ${recipeData.name}, skipping...`);
            continue;
          }

          // Créer la recette complète
          const completeRecipeData = {
            ...recipeData,
            category_id: categoryId,
            ingredients: validIngredients
          };

          const recipe = await recipeService.createCompleteRecipe(completeRecipeData, userId);
          results.push(recipe);

          console.log(`✅ Created recipe: ${recipe.name} (${validIngredients.length} ingredients, ${recipeData.instructions.length} instructions)`);

        } catch (error) {
          console.error(`❌ Error creating recipe ${recipeData.name}:`, error.message);
        }
      }

      console.log(`🎉 Recipe test data seeding completed! Created ${results.length} recipes.`);
      return results;

    } catch (error) {
      console.error('❌ Error seeding recipe test data:', error);
      throw error;
    }
  }

  static async clear() {
    try {
      console.log('🗑️  Clearing recipe test data...');
      
      const Recipe = require('../models/recipeModel');
      const RecipeIngredient = require('../models/recipeIngredientModel');
      const RecipeInstruction = require('../models/recipeInstructionModel');
      const RecipeImage = require('../models/recipeImageModel');

      const [recipes, ingredients, instructions, images] = await Promise.all([
        Recipe.deleteMany({}),
        RecipeIngredient.deleteMany({}),
        RecipeInstruction.deleteMany({}),
        RecipeImage.deleteMany({})
      ]);

      console.log(`✅ Cleared:
        - ${recipes.deletedCount} recipes
        - ${ingredients.deletedCount} ingredients  
        - ${instructions.deletedCount} instructions
        - ${images.deletedCount} images`);

      return { recipes, ingredients, instructions, images };
    } catch (error) {
      console.error('❌ Error clearing recipe test data:', error);
      throw error;
    }
  }

  // Données de test pour Postman
  static getPostmanTestData() {
    return {
      simple_recipe: {
        name: 'Salade Verte Simple',
        description: 'Une salade verte basique pour tester l\'API',
        servings: 2,
        prep_time_minutes: 10,
        difficulty_level: 'easy',
        is_public: true,
        tags: ['salade', 'facile', 'rapide']
      },
      complete_recipe: {
        name: 'Pâtes à l\'Ail',
        description: 'Des pâtes simples à l\'ail et à l\'huile d\'olive',
        servings: 4,
        prep_time_minutes: 5,
        cook_time_minutes: 15,
        total_time_minutes: 20,
        difficulty_level: 'easy',
        is_public: true,
        tags: ['pâtes', 'rapide', 'italien'],
        ingredients: [
          {
            food_id: '{{foodId}}', // À remplacer par un vrai ID
            quantity: 400,
            unit: 'g',
            preparation_note: 'spaghetti'
          },
          {
            food_id: '{{foodId2}}', // À remplacer par un vrai ID  
            quantity: 4,
            unit: 'pieces',
            preparation_note: 'gousses écrasées'
          }
        ],
        instructions: [
          {
            step_number: 1,
            description: 'Faire bouillir les pâtes dans une grande casserole d\'eau salée.',
            duration_minutes: 10,
            technique: 'boil'
          },
          {
            step_number: 2,
            description: 'Faire revenir l\'ail dans l\'huile d\'olive. Mélanger avec les pâtes égouttées.',
            duration_minutes: 5,
            technique: 'saute'
          }
        ]
      }
    };
  }
}

module.exports = RecipeTestDataSeeder;

// Script direct si fichier exécuté directement  
if (require.main === module) {
  const mongoose = require('mongoose');
  const { MONGODB_URI } = require('../config/env');

  async function run() {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('📊 Connected to MongoDB');

      const args = process.argv.slice(2);
      const command = args[0] || 'help';
      const userId = args[1];

      switch (command) {
        case 'seed':
          if (!userId) {
            console.error('❌ User ID required: node recipeTestData.js seed <userId>');
            process.exit(1);
          }
          await RecipeTestDataSeeder.seed(userId);
          break;
        case 'clear':
          await RecipeTestDataSeeder.clear();
          break;
        case 'postman':
          console.log('📋 Postman test data:');
          console.log(JSON.stringify(RecipeTestDataSeeder.getPostmanTestData(), null, 2));
          break;
        default:
          console.log(`Usage: node recipeTestData.js <command> [options]
Commands:
  seed <userId>  - Create sample recipes for the specified user
  clear          - Remove all recipe test data
  postman        - Display test data for Postman`);
      }

    } catch (error) {
      console.error('Error:', error);
    } finally {
      await mongoose.disconnect();
      console.log('📊 Disconnected from MongoDB');
      process.exit();
    }
  }

  run();
}