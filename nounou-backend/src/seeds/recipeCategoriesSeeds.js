// src/seeds/recipeCategoriesSeeds.js
const RecipeCategory = require('../models/recipeCategoryModel');

const defaultRecipeCategories = [
  // Catégories racines (niveau 0)
  {
    name: 'Entrées',
    slug: 'entrees',
    description: 'Amuse-bouches, hors-d\'œuvres et entrées',
    icon_name: 'appetizer',
    color_hex: '#FF6B6B',
    sort_order: 1,
    parent_id: null
  },
  {
    name: 'Plats Principaux',
    slug: 'plats-principaux',
    description: 'Plats de résistance et plats uniques',
    icon_name: 'main-dish',
    color_hex: '#4ECDC4',
    sort_order: 2,
    parent_id: null
  },
  {
    name: 'Desserts',
    slug: 'desserts',
    description: 'Gâteaux, pâtisseries et douceurs',
    icon_name: 'dessert',
    color_hex: '#FFE66D',
    sort_order: 3,
    parent_id: null
  },
  {
    name: 'Boissons',
    slug: 'boissons',
    description: 'Cocktails, smoothies et boissons chaudes',
    icon_name: 'drink',
    color_hex: '#A8E6CF',
    sort_order: 4,
    parent_id: null
  },
  {
    name: 'Petit-Déjeuner',
    slug: 'petit-dejeuner',
    description: 'Recettes pour bien commencer la journée',
    icon_name: 'breakfast',
    color_hex: '#FFAAA5',
    sort_order: 5,
    parent_id: null
  },
  {
    name: 'Snacks & Collations',
    slug: 'snacks-collations',
    description: 'En-cas, goûters et collations',
    icon_name: 'snack',
    color_hex: '#B4A7D6',
    sort_order: 6,
    parent_id: null
  }
];

const entreeSubcategories = [
  {
    name: 'Salades',
    slug: 'salades',
    description: 'Salades composées et salades vertes',
    sort_order: 1
  },
  {
    name: 'Soupes',
    slug: 'soupes',
    description: 'Soupes chaudes et froides',
    sort_order: 2
  },
  {
    name: 'Tartines & Bruschetta',
    slug: 'tartines-bruschetta',
    description: 'Tartines garnies et bruschetta',
    sort_order: 3
  },
  {
    name: 'Terrines & Pâtés',
    slug: 'terrines-pates',
    description: 'Terrines maison et pâtés',
    sort_order: 4
  }
];

const platsPrincipauxSubcategories = [
  {
    name: 'Viandes',
    slug: 'viandes',
    description: 'Plats à base de viande rouge',
    sort_order: 1
  },
  {
    name: 'Volailles',
    slug: 'volailles',
    description: 'Plats à base de poulet, canard, etc.',
    sort_order: 2
  },
  {
    name: 'Poissons & Fruits de mer',
    slug: 'poissons-fruits-mer',
    description: 'Plats de la mer',
    sort_order: 3
  },
  {
    name: 'Végétarien',
    slug: 'vegetarien',
    description: 'Plats végétariens',
    sort_order: 4
  },
  {
    name: 'Pâtes & Riz',
    slug: 'pates-riz',
    description: 'Plats de pâtes et de riz',
    sort_order: 5
  },
  {
    name: 'Pizza & Quiches',
    slug: 'pizza-quiches',
    description: 'Pizzas maison et quiches',
    sort_order: 6
  }
];

const dessertsSubcategories = [
  {
    name: 'Gâteaux',
    slug: 'gateaux',
    description: 'Gâteaux et layer cakes',
    sort_order: 1
  },
  {
    name: 'Tartes & Clafoutis',
    slug: 'tartes-clafoutis',
    description: 'Tartes sucrées et clafoutis',
    sort_order: 2
  },
  {
    name: 'Pâtisseries',
    slug: 'patisseries',
    description: 'Viennoiseries et petits fours',
    sort_order: 3
  },
  {
    name: 'Desserts Lactés',
    slug: 'desserts-lactes',
    description: 'Crèmes, mousses et yaourts',
    sort_order: 4
  },
  {
    name: 'Glaces & Sorbets',
    slug: 'glaces-sorbets',
    description: 'Desserts glacés',
    sort_order: 5
  },
  {
    name: 'Fruits',
    slug: 'fruits',
    description: 'Desserts aux fruits',
    sort_order: 6
  }
];

const boissonsSubcategories = [
  {
    name: 'Smoothies',
    slug: 'smoothies',
    description: 'Smoothies et boissons fruitées',
    sort_order: 1
  },
  {
    name: 'Cocktails',
    slug: 'cocktails',
    description: 'Cocktails avec et sans alcool',
    sort_order: 2
  },
  {
    name: 'Boissons Chaudes',
    slug: 'boissons-chaudes',
    description: 'Thés, cafés et chocolats chauds',
    sort_order: 3
  },
  {
    name: 'Jus & Limonades',
    slug: 'jus-limonades',
    description: 'Jus frais et limonades',
    sort_order: 4
  }
];

const petitDejeunerSubcategories = [
  {
    name: 'Pancakes & Crêpes',
    slug: 'pancakes-crepes',
    description: 'Pancakes, crêpes et gaufres',
    sort_order: 1
  },
  {
    name: 'Bowls & Porridge',
    slug: 'bowls-porridge',
    description: 'Bowls petit-déjeuner et porridge',
    sort_order: 2
  },
  {
    name: 'Viennoiseries',
    slug: 'viennoiseries',
    description: 'Croissants, pains au chocolat maison',
    sort_order: 3
  },
  {
    name: 'Œufs',
    slug: 'oeufs',
    description: 'Recettes à base d\'œufs',
    sort_order: 4
  }
];

class RecipeCategoriesSeeder {
  static async seed() {
    try {
      console.log('🌱 Starting recipe categories seeding...');

      // Vérifier si des catégories existent déjà
      const existingCount = await RecipeCategory.countDocuments();
      if (existingCount > 0) {
        console.log(`⚠️  ${existingCount} categories already exist. Skipping seeding.`);
        return;
      }

      // Créer les catégories racines
      console.log('📁 Creating root categories...');
      const rootCategories = await RecipeCategory.insertMany(defaultRecipeCategories);
      console.log(`✅ Created ${rootCategories.length} root categories`);

      // Mapper les IDs des catégories racines
      const categoryMap = {};
      rootCategories.forEach(cat => {
        categoryMap[cat.slug] = cat._id.toString();
      });

      // Créer les sous-catégories
      const subcategories = [];

      // Entrées
      entreeSubcategories.forEach(sub => {
        subcategories.push({
          ...sub,
          parent_id: categoryMap['entrees']
        });
      });

      // Plats principaux
      platsPrincipauxSubcategories.forEach(sub => {
        subcategories.push({
          ...sub,
          parent_id: categoryMap['plats-principaux']
        });
      });

      // Desserts
      dessertsSubcategories.forEach(sub => {
        subcategories.push({
          ...sub,
          parent_id: categoryMap['desserts']
        });
      });

      // Boissons
      boissonsSubcategories.forEach(sub => {
        subcategories.push({
          ...sub,
          parent_id: categoryMap['boissons']
        });
      });

      // Petit-déjeuner
      petitDejeunerSubcategories.forEach(sub => {
        subcategories.push({
          ...sub,
          parent_id: categoryMap['petit-dejeuner']
        });
      });

      console.log('📂 Creating subcategories...');
      const createdSubcategories = await RecipeCategory.insertMany(subcategories);
      console.log(`✅ Created ${createdSubcategories.length} subcategories`);

      console.log('🎉 Recipe categories seeding completed successfully!');
      
      return {
        root_categories: rootCategories.length,
        subcategories: createdSubcategories.length,
        total: rootCategories.length + createdSubcategories.length
      };

    } catch (error) {
      console.error('❌ Error seeding recipe categories:', error);
      throw error;
    }
  }

  static async clear() {
    try {
      console.log('🗑️  Clearing recipe categories...');
      const result = await RecipeCategory.deleteMany({});
      console.log(`✅ Cleared ${result.deletedCount} categories`);
      return result;
    } catch (error) {
      console.error('❌ Error clearing recipe categories:', error);
      throw error;
    }
  }

  static async reset() {
    try {
      console.log('🔄 Resetting recipe categories...');
      await this.clear();
      const result = await this.seed();
      console.log('✅ Recipe categories reset completed');
      return result;
    } catch (error) {
      console.error('❌ Error resetting recipe categories:', error);
      throw error;
    }
  }
}

module.exports = RecipeCategoriesSeeder;

// Script direct si fichier exécuté directement
if (require.main === module) {
  const mongoose = require('mongoose');
  const { MONGODB_URI } = require('../config/env');

  async function run() {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('📊 Connected to MongoDB');

      const args = process.argv.slice(2);
      const command = args[0] || 'seed';

      switch (command) {
        case 'seed':
          await RecipeCategoriesSeeder.seed();
          break;
        case 'clear':
          await RecipeCategoriesSeeder.clear();
          break;
        case 'reset':
          await RecipeCategoriesSeeder.reset();
          break;
        default:
          console.log('Usage: node recipeCategoriesSeeds.js [seed|clear|reset]');
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