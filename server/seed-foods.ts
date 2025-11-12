// Seed common foods for FitFuel database
import { db } from './db';
import { foodItems } from '@shared/schema';

interface FoodData {
  name: string;
  brand?: string;
  kcal100g: number;
  protein100g: number;
  fat100g: number;
  carbs100g: number;
  fiber100g: number;
  sodium100g?: number;
  // Micronutrients (per 100g)
  vitaminAMcg100g?: number;
  vitaminCMg100g?: number;
  vitaminDMcg100g?: number;
  vitaminEMg100g?: number;
  vitaminKMcg100g?: number;
  vitaminB12Mcg100g?: number;
  calciumMg100g?: number;
  ironMg100g?: number;
  magnesiumMg100g?: number;
  zincMg100g?: number;
  potassiumMg100g?: number;
  tags?: string[];
}

const commonFoods: FoodData[] = [
  // Proteins - Meat & Poultry (with USDA micronutrient data)
  { 
    name: '鸡胸肉', kcal100g: 165, protein100g: 31, fat100g: 3.6, carbs100g: 0, fiber100g: 0, sodium100g: 74,
    vitaminAMcg100g: 21, vitaminCMg100g: 0, vitaminDMcg100g: 0.1, vitaminEMg100g: 0.3, vitaminKMcg100g: 0.5,
    vitaminB12Mcg100g: 0.3, calciumMg100g: 15, ironMg100g: 1, magnesiumMg100g: 29, zincMg100g: 1, potassiumMg100g: 256,
    tags: ['protein', 'lean', 'poultry'] 
  },
  { 
    name: '鸡腿肉', kcal100g: 209, protein100g: 26, fat100g: 11, carbs100g: 0, fiber100g: 0, sodium100g: 87,
    vitaminAMcg100g: 27, vitaminCMg100g: 0, vitaminDMcg100g: 0.1, vitaminEMg100g: 0.3, vitaminKMcg100g: 0.7,
    vitaminB12Mcg100g: 0.4, calciumMg100g: 12, ironMg100g: 1.3, magnesiumMg100g: 22, zincMg100g: 2.1, potassiumMg100g: 218,
    tags: ['protein', 'poultry'] 
  },
  { 
    name: '鸡蛋', kcal100g: 155, protein100g: 13, fat100g: 11, carbs100g: 1.1, fiber100g: 0, sodium100g: 124,
    vitaminAMcg100g: 160, vitaminCMg100g: 0, vitaminDMcg100g: 2, vitaminEMg100g: 1.1, vitaminKMcg100g: 0.3,
    vitaminB12Mcg100g: 0.9, calciumMg100g: 56, ironMg100g: 1.8, magnesiumMg100g: 12, zincMg100g: 1.3, potassiumMg100g: 138,
    tags: ['protein', 'eggs'] 
  },
  { 
    name: '牛肉', kcal100g: 250, protein100g: 26, fat100g: 15, carbs100g: 0, fiber100g: 0, sodium100g: 72,
    vitaminAMcg100g: 0, vitaminCMg100g: 0, vitaminDMcg100g: 0.1, vitaminEMg100g: 0.2, vitaminKMcg100g: 1.6,
    vitaminB12Mcg100g: 2.6, calciumMg100g: 18, ironMg100g: 2.6, magnesiumMg100g: 21, zincMg100g: 6.3, potassiumMg100g: 318,
    tags: ['protein', 'beef'] 
  },
  { 
    name: '瘦猪肉', kcal100g: 143, protein100g: 21, fat100g: 6, carbs100g: 0, fiber100g: 0, sodium100g: 62,
    vitaminAMcg100g: 2, vitaminCMg100g: 0.7, vitaminDMcg100g: 0.5, vitaminEMg100g: 0.3, vitaminKMcg100g: 0,
    vitaminB12Mcg100g: 0.7, calciumMg100g: 19, ironMg100g: 0.9, magnesiumMg100g: 28, zincMg100g: 2.4, potassiumMg100g: 423,
    tags: ['protein', 'pork'] 
  },
  { 
    name: '火腿', kcal100g: 145, protein100g: 21, fat100g: 6, carbs100g: 1, fiber100g: 0, sodium100g: 1203,
    vitaminAMcg100g: 0, vitaminCMg100g: 0, vitaminDMcg100g: 0.4, vitaminEMg100g: 0.3, vitaminKMcg100g: 0,
    vitaminB12Mcg100g: 0.6, calciumMg100g: 6, ironMg100g: 0.7, magnesiumMg100g: 17, zincMg100g: 1.8, potassiumMg100g: 287,
    tags: ['protein', 'processed'] 
  },
  
  // Proteins - Seafood (with USDA micronutrient data)
  { 
    name: '三文鱼', kcal100g: 208, protein100g: 20, fat100g: 13, carbs100g: 0, fiber100g: 0, sodium100g: 59,
    vitaminAMcg100g: 40, vitaminCMg100g: 3.9, vitaminDMcg100g: 11, vitaminEMg100g: 3.6, vitaminKMcg100g: 0.5,
    vitaminB12Mcg100g: 3.2, calciumMg100g: 9, ironMg100g: 0.8, magnesiumMg100g: 29, zincMg100g: 0.6, potassiumMg100g: 363,
    tags: ['protein', 'fish', 'omega3'] 
  },
  { 
    name: '鳕鱼', kcal100g: 82, protein100g: 18, fat100g: 0.7, carbs100g: 0, fiber100g: 0, sodium100g: 54,
    vitaminAMcg100g: 10, vitaminCMg100g: 1, vitaminDMcg100g: 1.2, vitaminEMg100g: 0.4, vitaminKMcg100g: 0.1,
    vitaminB12Mcg100g: 1.6, calciumMg100g: 16, ironMg100g: 0.4, magnesiumMg100g: 32, zincMg100g: 0.5, potassiumMg100g: 413,
    tags: ['protein', 'fish', 'lean'] 
  },
  { 
    name: '金枪鱼罐头', kcal100g: 132, protein100g: 28, fat100g: 1, carbs100g: 0, fiber100g: 0, sodium100g: 247,
    vitaminAMcg100g: 17, vitaminCMg100g: 0, vitaminDMcg100g: 3.6, vitaminEMg100g: 0.9, vitaminKMcg100g: 0,
    vitaminB12Mcg100g: 2.2, calciumMg100g: 10, ironMg100g: 1.3, magnesiumMg100g: 27, zincMg100g: 0.8, potassiumMg100g: 237,
    tags: ['protein', 'fish', 'canned'] 
  },
  { 
    name: '虾', kcal100g: 99, protein100g: 24, fat100g: 0.3, carbs100g: 0.2, fiber100g: 0, sodium100g: 111,
    vitaminAMcg100g: 54, vitaminCMg100g: 2.1, vitaminDMcg100g: 0.2, vitaminEMg100g: 1.1, vitaminKMcg100g: 0.3,
    vitaminB12Mcg100g: 1.1, calciumMg100g: 70, ironMg100g: 1.8, magnesiumMg100g: 39, zincMg100g: 1.3, potassiumMg100g: 259,
    tags: ['protein', 'seafood', 'lean'] 
  },
  
  // Proteins - Plant-based (with USDA micronutrient data)
  { 
    name: '豆腐', kcal100g: 76, protein100g: 8, fat100g: 4.8, carbs100g: 1.9, fiber100g: 0.3, sodium100g: 7,
    vitaminAMcg100g: 5, vitaminCMg100g: 0.1, vitaminDMcg100g: 0, vitaminEMg100g: 0.01, vitaminKMcg100g: 2.4,
    vitaminB12Mcg100g: 0, calciumMg100g: 350, ironMg100g: 5.4, magnesiumMg100g: 30, zincMg100g: 0.8, potassiumMg100g: 121,
    tags: ['protein', 'soy', 'vegan'] 
  },
  { 
    name: '纳豆', kcal100g: 212, protein100g: 18, fat100g: 11, carbs100g: 12, fiber100g: 5, sodium100g: 7,
    vitaminAMcg100g: 0, vitaminCMg100g: 13, vitaminDMcg100g: 0, vitaminEMg100g: 0.5, vitaminKMcg100g: 1103,
    vitaminB12Mcg100g: 0, calciumMg100g: 217, ironMg100g: 8.6, magnesiumMg100g: 115, zincMg100g: 3.1, potassiumMg100g: 729,
    tags: ['protein', 'soy', 'fermented'] 
  },
  { 
    name: '豆浆', kcal100g: 54, protein100g: 3.3, fat100g: 1.8, carbs100g: 6, fiber100g: 1.2, sodium100g: 51,
    vitaminAMcg100g: 8, vitaminCMg100g: 0, vitaminDMcg100g: 0, vitaminEMg100g: 0.11, vitaminKMcg100g: 3,
    vitaminB12Mcg100g: 0, calciumMg100g: 25, ironMg100g: 0.6, magnesiumMg100g: 25, zincMg100g: 0.3, potassiumMg100g: 118,
    tags: ['protein', 'soy', 'drink'] 
  },
  { 
    name: '黑豆', kcal100g: 341, protein100g: 21, fat100g: 1.4, carbs100g: 63, fiber100g: 15, sodium100g: 2,
    vitaminAMcg100g: 0, vitaminCMg100g: 0, vitaminDMcg100g: 0, vitaminEMg100g: 0.9, vitaminKMcg100g: 8.6,
    vitaminB12Mcg100g: 0, calciumMg100g: 123, ironMg100g: 8.2, magnesiumMg100g: 160, zincMg100g: 3.7, potassiumMg100g: 1352,
    tags: ['protein', 'legume', 'vegan'] 
  },
  
  // Carbs - Grains
  { name: '白米饭', kcal100g: 130, protein100g: 2.7, fat100g: 0.3, carbs100g: 28, fiber100g: 0.4, tags: ['carbs', 'grain'] },
  { name: '糙米饭', kcal100g: 112, protein100g: 2.6, fat100g: 0.9, carbs100g: 24, fiber100g: 1.8, tags: ['carbs', 'grain', 'wholegrain'] },
  { name: '燕麦', kcal100g: 389, protein100g: 16.9, fat100g: 6.9, carbs100g: 66, fiber100g: 10.6, tags: ['carbs', 'grain', 'wholegrain'] },
  { name: '全麦面包', kcal100g: 247, protein100g: 13, fat100g: 3.4, carbs100g: 41, fiber100g: 7, tags: ['carbs', 'grain', 'bread'] },
  { name: '意大利面', kcal100g: 131, protein100g: 5, fat100g: 1.1, carbs100g: 25, fiber100g: 1.8, tags: ['carbs', 'pasta'] },
  { name: '荞麦面', kcal100g: 343, protein100g: 13, fat100g: 3.4, carbs100g: 72, fiber100g: 10, tags: ['carbs', 'noodle', 'buckwheat'] },
  { name: '藜麦', kcal100g: 120, protein100g: 4.4, fat100g: 1.9, carbs100g: 21, fiber100g: 2.8, tags: ['carbs', 'grain', 'superfood'] },
  
  // Carbs - Starchy vegetables
  { name: '红薯', kcal100g: 86, protein100g: 1.6, fat100g: 0.1, carbs100g: 20, fiber100g: 3, tags: ['carbs', 'vegetable', 'sweet'] },
  { name: '土豆', kcal100g: 77, protein100g: 2, fat100g: 0.1, carbs100g: 17, fiber100g: 2.2, tags: ['carbs', 'vegetable'] },
  { name: '玉米', kcal100g: 86, protein100g: 3.3, fat100g: 1.4, carbs100g: 19, fiber100g: 2.7, tags: ['carbs', 'vegetable'] },
  { name: '南瓜', kcal100g: 26, protein100g: 1, fat100g: 0.1, carbs100g: 7, fiber100g: 0.5, tags: ['carbs', 'vegetable'] },
  
  // Vegetables
  { name: '西兰花', kcal100g: 34, protein100g: 2.8, fat100g: 0.4, carbs100g: 7, fiber100g: 2.6, tags: ['vegetable', 'cruciferous'] },
  { name: '菠菜', kcal100g: 23, protein100g: 2.9, fat100g: 0.4, carbs100g: 3.6, fiber100g: 2.2, tags: ['vegetable', 'leafy'] },
  { name: '胡萝卜', kcal100g: 41, protein100g: 0.9, fat100g: 0.2, carbs100g: 10, fiber100g: 2.8, tags: ['vegetable', 'root'] },
  { name: '番茄', kcal100g: 18, protein100g: 0.9, fat100g: 0.2, carbs100g: 3.9, fiber100g: 1.2, tags: ['vegetable', 'fruit'] },
  { name: '黄瓜', kcal100g: 15, protein100g: 0.7, fat100g: 0.1, carbs100g: 3.6, fiber100g: 0.5, tags: ['vegetable', 'hydrating'] },
  { name: '生菜', kcal100g: 15, protein100g: 1.4, fat100g: 0.2, carbs100g: 2.9, fiber100g: 1.3, tags: ['vegetable', 'leafy'] },
  { name: '青椒', kcal100g: 20, protein100g: 0.9, fat100g: 0.2, carbs100g: 4.6, fiber100g: 1.7, tags: ['vegetable', 'pepper'] },
  { name: '洋葱', kcal100g: 40, protein100g: 1.1, fat100g: 0.1, carbs100g: 9, fiber100g: 1.7, tags: ['vegetable', 'allium'] },
  { name: '蘑菇', kcal100g: 22, protein100g: 3.1, fat100g: 0.3, carbs100g: 3.3, fiber100g: 1, tags: ['vegetable', 'mushroom'] },
  { name: '白菜', kcal100g: 13, protein100g: 1.5, fat100g: 0.2, carbs100g: 2.2, fiber100g: 1, tags: ['vegetable', 'cabbage'] },
  
  // Fruits
  { name: '香蕉', kcal100g: 89, protein100g: 1.1, fat100g: 0.3, carbs100g: 23, fiber100g: 2.6, tags: ['fruit', 'potassium'] },
  { name: '苹果', kcal100g: 52, protein100g: 0.3, fat100g: 0.2, carbs100g: 14, fiber100g: 2.4, tags: ['fruit'] },
  { name: '橙子', kcal100g: 47, protein100g: 0.9, fat100g: 0.1, carbs100g: 12, fiber100g: 2.4, tags: ['fruit', 'citrus', 'vitamin-c'] },
  { name: '草莓', kcal100g: 32, protein100g: 0.7, fat100g: 0.3, carbs100g: 8, fiber100g: 2, tags: ['fruit', 'berry'] },
  { name: '蓝莓', kcal100g: 57, protein100g: 0.7, fat100g: 0.3, carbs100g: 14, fiber100g: 2.4, tags: ['fruit', 'berry', 'antioxidant'] },
  { name: '葡萄', kcal100g: 69, protein100g: 0.7, fat100g: 0.2, carbs100g: 18, fiber100g: 0.9, tags: ['fruit'] },
  { name: '芒果', kcal100g: 60, protein100g: 0.8, fat100g: 0.4, carbs100g: 15, fiber100g: 1.6, tags: ['fruit', 'tropical'] },
  
  // Fats & Nuts
  { name: '核桃', kcal100g: 654, protein100g: 15, fat100g: 65, carbs100g: 14, fiber100g: 7, tags: ['fat', 'nuts', 'omega3'] },
  { name: '杏仁', kcal100g: 579, protein100g: 21, fat100g: 50, carbs100g: 22, fiber100g: 12, tags: ['fat', 'nuts'] },
  { name: '腰果', kcal100g: 553, protein100g: 18, fat100g: 44, carbs100g: 30, fiber100g: 3.3, tags: ['fat', 'nuts'] },
  { name: '花生', kcal100g: 567, protein100g: 26, fat100g: 49, carbs100g: 16, fiber100g: 8.5, tags: ['fat', 'nuts'] },
  { name: '牛油果', kcal100g: 160, protein100g: 2, fat100g: 15, carbs100g: 9, fiber100g: 7, tags: ['fat', 'fruit', 'healthy-fat'] },
  { name: '橄榄油', kcal100g: 884, protein100g: 0, fat100g: 100, carbs100g: 0, fiber100g: 0, tags: ['fat', 'oil', 'healthy-fat'] },
  { name: '椰子油', kcal100g: 862, protein100g: 0, fat100g: 100, carbs100g: 0, fiber100g: 0, tags: ['fat', 'oil'] },
  
  // Dairy
  { name: '牛奶', kcal100g: 61, protein100g: 3.2, fat100g: 3.2, carbs100g: 5, fiber100g: 0, tags: ['dairy', 'protein'] },
  { name: '脱脂牛奶', kcal100g: 34, protein100g: 3.4, fat100g: 0.1, carbs100g: 5, fiber100g: 0, tags: ['dairy', 'protein', 'low-fat'] },
  { name: '酸奶', kcal100g: 59, protein100g: 3.5, fat100g: 0.4, carbs100g: 4.7, fiber100g: 0, tags: ['dairy', 'protein', 'probiotic'] },
  { name: '希腊酸奶', kcal100g: 97, protein100g: 10, fat100g: 5, carbs100g: 3.6, fiber100g: 0, tags: ['dairy', 'protein', 'high-protein'] },
  { name: '奶酪', kcal100g: 402, protein100g: 25, fat100g: 33, carbs100g: 1.3, fiber100g: 0, tags: ['dairy', 'protein', 'fat'] },
  
  // Snacks & Others
  { name: '全麦饼干', kcal100g: 436, protein100g: 10, fat100g: 10, carbs100g: 72, fiber100g: 8, tags: ['snack', 'grain'] },
  { name: '蛋白粉', kcal100g: 370, protein100g: 80, fat100g: 5, carbs100g: 10, fiber100g: 2, tags: ['protein', 'supplement'] },
  { name: '黑巧克力', kcal100g: 546, protein100g: 5, fat100g: 31, carbs100g: 61, fiber100g: 7, tags: ['snack', 'treat', 'antioxidant'] },
];

export async function seedFoods() {
  try {
    console.log('Starting food database seeding...');
    
    let created = 0;
    let skipped = 0;
    
    for (const food of commonFoods) {
      // Check if food already exists
      const existing = await db.query.foodItems.findFirst({
        where: (items, { eq }) => eq(items.name, food.name)
      });
      
      if (existing) {
        console.log(`  - Skipped: ${food.name} (already exists)`);
        skipped++;
        continue;
      }
      
      // Insert new food with micronutrients
      await db.insert(foodItems).values({
        name: food.name,
        brand: food.brand,
        kcal100g: food.kcal100g,
        protein100g: food.protein100g,
        fat100g: food.fat100g,
        carbs100g: food.carbs100g,
        fiber100g: food.fiber100g,
        sodium100g: food.sodium100g || 0,
        // Micronutrients (defaults to 0 if not specified)
        vitaminAMcg100g: food.vitaminAMcg100g || 0,
        vitaminCMg100g: food.vitaminCMg100g || 0,
        vitaminDMcg100g: food.vitaminDMcg100g || 0,
        vitaminEMg100g: food.vitaminEMg100g || 0,
        vitaminKMcg100g: food.vitaminKMcg100g || 0,
        vitaminB12Mcg100g: food.vitaminB12Mcg100g || 0,
        calciumMg100g: food.calciumMg100g || 0,
        ironMg100g: food.ironMg100g || 0,
        magnesiumMg100g: food.magnesiumMg100g || 0,
        zincMg100g: food.zincMg100g || 0,
        potassiumMg100g: food.potassiumMg100g || 0,
        perUnitType: 'per100g',
        tags: food.tags || [],
        source: 'builtin',
        isVerified: true,
        isPublic: true
      });
      
      console.log(`  + Created: ${food.name}`);
      created++;
    }
    
    console.log(`\nSeeding complete!`);
    console.log(`  Created: ${created} foods`);
    console.log(`  Skipped: ${skipped} foods (already existed)`);
    console.log(`  Total in database: ${created + skipped} foods`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding foods:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFoods();
}
