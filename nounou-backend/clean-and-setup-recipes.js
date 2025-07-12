// clean-and-setup-recipes.js
// Solution finale pour nettoyer et recréer les catégories de recettes

const mongoose = require('mongoose');

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nounou';

async function cleanAndSetup() {
  try {
    console.log('🧹 Starting complete cleanup and setup...');
    console.log('📡 Connecting to MongoDB:', MONGODB_URI);

    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Étape 1: Supprimer complètement la collection (avec tous les index)
    console.log('\n🗑️  Step 1: Removing existing collection...');
    try {
      await mongoose.connection.db.collection('recipe_categories').drop();
      console.log('✅ Collection recipe_categories dropped successfully');
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('ℹ️  Collection recipe_categories does not exist (OK)');
      } else {
        console.warn('⚠️  Warning dropping collection:', error.message);
      }
    }

    // Étape 2: Définir le nouveau schéma propre (sans category_id)
    console.log('\n📋 Step 2: Creating clean schema...');
    
    // Supprimer le modèle s'il existe déjà
    if (mongoose.models.RecipeCategory) {
      delete mongoose.models.RecipeCategory;
    }
    
    const cleanSchema = new mongoose.Schema({
      name: { type: String, required: true },
      slug: { type: String, required: true, unique: true },
      description: String,
      parent_id: { type: String, default: null },
      level: { type: Number, default: 0 },
      path: { type: String, required: true },
      icon_name: String,
      color_hex: String,
      sort_order: { type: Number, default: 0 },
      is_active: { type: Boolean, default: true },
      recipe_count: { type: Number, default: 0 }
    }, {
      timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
      collection: 'recipe_categories'
    });

    // Index seulement sur slug (pas de category_id)
    cleanSchema.index({ slug: 1 }, { unique: true });
    cleanSchema.index({ parent_id: 1 });
    cleanSchema.index({ level: 1 });

    const RecipeCategory = mongoose.model('RecipeCategory', cleanSchema);
    console.log('✅ Clean schema created');

    // Étape 3: Créer les données
    console.log('\n📁 Step 3: Creating categories...');

    // Données complètes (avec path pré-calculé)
    const rootCategories = [
      {
        name: 'Entrées',
        slug: 'entrees',
        description: 'Amuse-bouches, hors-d\'œuvres et entrées',
        icon_name: 'appetizer',
        color_hex: '#FF6B6B',
        sort_order: 1,
        parent_id: null,
        level: 0,
        path: '/entrees'
      },
      {
        name: 'Plats Principaux',
        slug: 'plats-principaux',
        description: 'Plats de résistance et plats uniques',
        icon_name: 'main-dish',
        color_hex: '#4ECDC4',
        sort_order: 2,
        parent_id: null,
        level: 0,
        path: '/plats-principaux'
      },
      {
        name: 'Desserts',
        slug: 'desserts',
        description: 'Gâteaux, pâtisseries et douceurs',
        icon_name: 'dessert',
        color_hex: '#FFE66D',
        sort_order: 3,
        parent_id: null,
        level: 0,
        path: '/desserts'
      },
      {
        name: 'Boissons',
        slug: 'boissons',
        description: 'Cocktails, smoothies et boissons chaudes',
        icon_name: 'drink',
        color_hex: '#A8E6CF',
        sort_order: 4,
        parent_id: null,
        level: 0,
        path: '/boissons'
      },
      {
        name: 'Petit-Déjeuner',
        slug: 'petit-dejeuner',
        description: 'Recettes pour bien commencer la journée',
        icon_name: 'breakfast',
        color_hex: '#FFAAA5',
        sort_order: 5,
        parent_id: null,
        level: 0,
        path: '/petit-dejeuner'
      },
      {
        name: 'Snacks & Collations',
        slug: 'snacks-collations',
        description: 'En-cas, goûters et collations',
        icon_name: 'snack',
        color_hex: '#B4A7D6',
        sort_order: 6,
        parent_id: null,
        level: 0,
        path: '/snacks-collations'
      }
    ];

    // Créer les catégories racines
    const createdRoots = await RecipeCategory.insertMany(rootCategories);
    console.log(`✅ Created ${createdRoots.length} root categories`);

    // Mapper les IDs
    const categoryMap = {};
    createdRoots.forEach(cat => {
      categoryMap[cat.slug] = cat._id.toString();
    });

    // Sous-catégories avec path pré-calculé
    const subcategoriesData = [
      // Entrées
      { name: 'Salades', slug: 'salades', parent_slug: 'entrees' },
      { name: 'Soupes', slug: 'soupes', parent_slug: 'entrees' },
      { name: 'Tartines & Bruschetta', slug: 'tartines-bruschetta', parent_slug: 'entrees' },
      
      // Plats principaux
      { name: 'Viandes', slug: 'viandes', parent_slug: 'plats-principaux' },
      { name: 'Volailles', slug: 'volailles', parent_slug: 'plats-principaux' },
      { name: 'Poissons & Fruits de mer', slug: 'poissons-fruits-mer', parent_slug: 'plats-principaux' },
      { name: 'Végétarien', slug: 'vegetarien', parent_slug: 'plats-principaux' },
      { name: 'Pâtes & Riz', slug: 'pates-riz', parent_slug: 'plats-principaux' },
      
      // Desserts
      { name: 'Gâteaux', slug: 'gateaux', parent_slug: 'desserts' },
      { name: 'Tartes & Clafoutis', slug: 'tartes-clafoutis', parent_slug: 'desserts' },
      { name: 'Pâtisseries', slug: 'patisseries', parent_slug: 'desserts' },
      
      // Boissons
      { name: 'Smoothies', slug: 'smoothies', parent_slug: 'boissons' },
      { name: 'Cocktails', slug: 'cocktails', parent_slug: 'boissons' },
      { name: 'Boissons Chaudes', slug: 'boissons-chaudes', parent_slug: 'boissons' },
      
      // Petit-déjeuner
      { name: 'Pancakes & Crêpes', slug: 'pancakes-crepes', parent_slug: 'petit-dejeuner' },
      { name: 'Bowls & Porridge', slug: 'bowls-porridge', parent_slug: 'petit-dejeuner' },
      { name: 'Œufs', slug: 'oeufs', parent_slug: 'petit-dejeuner' }
    ];

    // Préparer les sous-catégories avec toutes les données
    const subcategories = subcategoriesData.map((sub, index) => ({
      name: sub.name,
      slug: sub.slug,
      parent_id: categoryMap[sub.parent_slug],
      level: 1,
      path: `/${sub.parent_slug}/${sub.slug}`,
      sort_order: index + 1
    }));

    // Créer les sous-catégories
    const createdSubs = await RecipeCategory.insertMany(subcategories);
    console.log(`✅ Created ${createdSubs.length} subcategories`);

    // Étape 4: Vérification finale
    console.log('\n🔍 Step 4: Final verification...');
    const totalCount = await RecipeCategory.countDocuments();
    const rootCount = await RecipeCategory.countDocuments({ parent_id: null });
    const subCount = await RecipeCategory.countDocuments({ parent_id: { $ne: null } });

    console.log(`📊 Final Statistics:`);
    console.log(`   - Total categories: ${totalCount}`);
    console.log(`   - Root categories: ${rootCount}`);
    console.log(`   - Subcategories: ${subCount}`);

    // Afficher la structure
    console.log('\n📋 Created Structure:');
    const allCategories = await RecipeCategory.find({}).sort({ level: 1, sort_order: 1 });
    
    allCategories.forEach(cat => {
      const indent = '  '.repeat(cat.level);
      const icon = cat.level === 0 ? '📁' : '📂';
      console.log(`${indent}${icon} ${cat.name} (${cat.slug})`);
    });

    console.log('\n🎉 Setup completed successfully!');
    console.log('✅ All categories created without conflicts');
    console.log('✅ All indexes properly set');
    console.log('✅ Ready for API testing');

  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📊 Disconnected from MongoDB');
  }
}

async function testAPI() {
  try {
    console.log('\n🧪 Testing API endpoints...');
    console.log('You can now test these endpoints:');
    console.log('');
    console.log('📍 Basic endpoints:');
    console.log('   GET  http://localhost:3000/api/v1/recipes/categories');
    console.log('   GET  http://localhost:3000/api/v1/recipes/categories?tree=true');
    console.log('');
    console.log('📍 Specific category:');
    console.log('   GET  http://localhost:3000/api/v1/recipes/categories/roots');
    console.log('');
    console.log('🚀 Start your server: npm run dev');
  } catch (error) {
    console.error('Error in test instructions:', error);
  }
}

async function showStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const totalCount = await RecipeCategory.countDocuments();
    if (totalCount === 0) {
      console.log('❌ No categories found. Run setup first.');
      return;
    }

    console.log(`✅ Found ${totalCount} categories`);
    
    const categories = await RecipeCategory.find({}).sort({ level: 1, sort_order: 1 });
    categories.forEach(cat => {
      const indent = '  '.repeat(cat.level);
      const icon = cat.level === 0 ? '📁' : '📂';
      console.log(`${indent}${icon} ${cat.name} (${cat.slug})`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error checking status:', error);
  }
}

// CLI Interface
const command = process.argv[2] || 'setup';

(async () => {
  try {
    switch (command) {
      case 'setup':
      case 'clean':
        await cleanAndSetup();
        await testAPI();
        break;
      case 'status':
      case 'list':
        await showStatus();
        break;
      case 'test':
        await testAPI();
        break;
      default:
        console.log(`
🍳 Clean Recipe Categories Setup Tool

Usage: node clean-and-setup-recipes.js [command]

Commands:
  setup   - Clean and create all categories (default)
  status  - Show current categories
  test    - Show API test instructions

Examples:
  node clean-and-setup-recipes.js setup
  node clean-and-setup-recipes.js status
        `);
    }
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
})();