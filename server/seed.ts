import { db } from "./db";
import { foodItems, foodBarcodes } from "@shared/schema";
import { eq } from "drizzle-orm";

// Seed food database with 50+ common foods
const seedFoods = [
  // Protein Sources
  { name: '鸡胸肉', kcal: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0, tags: ['protein', 'lean', 'poultry'] },
  { name: '牛肉(瘦)', kcal: 250, protein: 26, fat: 17, carbs: 0, fiber: 0, tags: ['protein', 'red_meat'] },
  { name: '猪里脊', kcal: 143, protein: 20.8, fat: 6.3, carbs: 0, fiber: 0, tags: ['protein', 'lean'] },
  { name: '三文鱼', kcal: 208, protein: 20, fat: 13, carbs: 0, fiber: 0, tags: ['protein', 'fish', 'omega3'] },
  { name: '鸡蛋(全蛋)', kcal: 143, protein: 12.6, fat: 9.5, carbs: 0.7, fiber: 0, tags: ['protein'], gramsPerServing: 50 },
  { name: '蛋清', kcal: 52, protein: 11, fat: 0.2, carbs: 0.7, fiber: 0, tags: ['protein', 'lean'] },
  { name: '虾仁', kcal: 99, protein: 24, fat: 0.3, carbs: 0.2, fiber: 0, tags: ['protein', 'seafood', 'lean'] },
  { name: '豆腐', kcal: 76, protein: 8, fat: 4.8, carbs: 1.9, fiber: 0.3, tags: ['protein', 'plant'] },
  { name: '希腊酸奶', kcal: 97, protein: 10, fat: 5, carbs: 3.6, fiber: 0, tags: ['protein', 'dairy'] },
  { name: '乳清蛋白粉', kcal: 400, protein: 80, fat: 5, carbs: 10, fiber: 0, tags: ['protein', 'supplement'], gramsPerServing: 30 },
  
  // Carbohydrate Sources
  { name: '白米饭', kcal: 130, protein: 2.7, fat: 0.3, carbs: 28, fiber: 0.4, tags: ['carbs', 'grain'] },
  { name: '糙米饭', kcal: 111, protein: 2.6, fat: 0.9, carbs: 23, fiber: 1.8, tags: ['carbs', 'whole_grain'] },
  { name: '燕麦', kcal: 389, protein: 16.9, fat: 6.9, carbs: 66, fiber: 10.6, tags: ['carbs', 'whole_grain', 'fiber'] },
  { name: '红薯', kcal: 86, protein: 1.6, fat: 0.1, carbs: 20, fiber: 3, tags: ['carbs', 'vegetable', 'fiber'] },
  { name: '紫薯', kcal: 82, protein: 1.8, fat: 0.2, carbs: 18.5, fiber: 2.8, tags: ['carbs', 'vegetable', 'fiber'] },
  { name: '土豆', kcal: 77, protein: 2, fat: 0.1, carbs: 17, fiber: 2.2, tags: ['carbs', 'vegetable'] },
  { name: '全麦面包', kcal: 247, protein: 13, fat: 3.4, carbs: 41, fiber: 7, tags: ['carbs', 'whole_grain'], gramsPerServing: 38 },
  { name: '意大利面', kcal: 371, protein: 13, fat: 1.5, carbs: 75, fiber: 3.2, tags: ['carbs', 'grain'] },
  { name: '香蕉', kcal: 89, protein: 1.1, fat: 0.3, carbs: 23, fiber: 2.6, tags: ['carbs', 'fruit'], gramsPerServing: 118 },
  { name: '苹果', kcal: 52, protein: 0.3, fat: 0.2, carbs: 14, fiber: 2.4, tags: ['carbs', 'fruit'], gramsPerServing: 182 },
  
  // Healthy Fats
  { name: '橄榄油', kcal: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, tags: ['fat', 'oil'] },
  { name: '椰子油', kcal: 862, protein: 0, fat: 100, carbs: 0, fiber: 0, tags: ['fat', 'oil'] },
  { name: '牛油果', kcal: 160, protein: 2, fat: 15, carbs: 9, fiber: 7, tags: ['fat', 'fruit', 'fiber'] },
  { name: '杏仁', kcal: 579, protein: 21, fat: 50, carbs: 22, fiber: 12.5, tags: ['fat', 'nuts', 'protein', 'fiber'] },
  { name: '核桃', kcal: 654, protein: 15, fat: 65, carbs: 14, fiber: 6.7, tags: ['fat', 'nuts', 'omega3'] },
  { name: '腰果', kcal: 553, protein: 18, fat: 44, carbs: 30, fiber: 3.3, tags: ['fat', 'nuts'] },
  { name: '花生酱', kcal: 588, protein: 25, fat: 50, carbs: 20, fiber: 6, tags: ['fat', 'nuts', 'protein'] },
  { name: '奇亚籽', kcal: 486, protein: 17, fat: 31, carbs: 42, fiber: 34, tags: ['fat', 'seeds', 'fiber', 'omega3'] },
  
  // Vegetables
  { name: '西兰花', kcal: 34, protein: 2.8, fat: 0.4, carbs: 7, fiber: 2.6, tags: ['vegetable', 'fiber'] },
  { name: '菠菜', kcal: 23, protein: 2.9, fat: 0.4, carbs: 3.6, fiber: 2.2, tags: ['vegetable', 'fiber', 'iron'] },
  { name: '胡萝卜', kcal: 41, protein: 0.9, fat: 0.2, carbs: 10, fiber: 2.8, tags: ['vegetable', 'fiber'] },
  { name: '番茄', kcal: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.2, tags: ['vegetable'] },
  { name: '黄瓜', kcal: 15, protein: 0.7, fat: 0.1, carbs: 3.6, fiber: 0.5, tags: ['vegetable'] },
  { name: '生菜', kcal: 15, protein: 1.4, fat: 0.2, carbs: 2.9, fiber: 1.3, tags: ['vegetable', 'fiber'] },
  { name: '芦笋', kcal: 20, protein: 2.2, fat: 0.1, carbs: 3.9, fiber: 2.1, tags: ['vegetable', 'fiber'] },
  { name: '青椒', kcal: 20, protein: 0.9, fat: 0.2, carbs: 4.6, fiber: 1.7, tags: ['vegetable'] },
  
  // Dairy & Alternatives
  { name: '全脂牛奶', kcal: 61, protein: 3.2, fat: 3.3, carbs: 4.8, fiber: 0, tags: ['dairy', 'protein'] },
  { name: '脱脂牛奶', kcal: 34, protein: 3.4, fat: 0.1, carbs: 5, fiber: 0, tags: ['dairy', 'protein', 'lean'] },
  { name: '切达芝士', kcal: 402, protein: 25, fat: 33, carbs: 1.3, fiber: 0, tags: ['dairy', 'protein', 'fat'] },
  { name: '马苏里拉芝士', kcal: 280, protein: 28, fat: 17, carbs: 3.1, fiber: 0, tags: ['dairy', 'protein'] },
  { name: '原味酸奶', kcal: 59, protein: 3.5, fat: 3.3, carbs: 4.7, fiber: 0, tags: ['dairy', 'protein'] },
  { name: '豆浆', kcal: 54, protein: 3.3, fat: 1.8, carbs: 6, fiber: 0.6, tags: ['plant', 'protein'] },
  { name: '杏仁奶', kcal: 17, protein: 0.4, fat: 1.1, carbs: 1.5, fiber: 0.2, tags: ['plant'] },
  
  // Mixed/Prepared Foods
  { name: '糙米蛋白饭团', kcal: 150, protein: 5, fat: 2, carbs: 28, fiber: 2, tags: ['carbs', 'protein'], gramsPerServing: 120 },
  { name: '鸡胸肉沙拉', kcal: 120, protein: 22, fat: 3, carbs: 5, fiber: 2, tags: ['protein', 'lean', 'vegetable'], gramsPerServing: 200 },
  { name: '火鸡胸肉', kcal: 135, protein: 30, fat: 1, carbs: 0, fiber: 0, tags: ['protein', 'lean', 'poultry'] },
  { name: '低脂奶酪', kcal: 72, protein: 13, fat: 2, carbs: 1, fiber: 0, tags: ['dairy', 'protein', 'lean'] },
  { name: '黑豆', kcal: 132, protein: 8.9, fat: 0.5, carbs: 24, fiber: 8.7, tags: ['protein', 'carbs', 'fiber', 'plant'] },
  { name: '鹰嘴豆', kcal: 164, protein: 8.9, fat: 2.6, carbs: 27, fiber: 7.6, tags: ['protein', 'carbs', 'fiber', 'plant'] },
  { name: '藜麦', kcal: 120, protein: 4.4, fat: 1.9, carbs: 21, fiber: 2.8, tags: ['carbs', 'protein', 'whole_grain'] },
];

export async function seedDatabase() {
  console.log('🌱 Starting database seed...');
  
  try {
    // Clear existing food items (for development)
    // In production, you may want to skip this
    console.log('Clearing existing foods...');
    await db.delete(foodItems);
    
    console.log('Inserting food items...');
    for (const food of seedFoods) {
      await db.insert(foodItems).values({
        name: food.name,
        brand: null,
        perUnitType: 'per100g',
        gramsPerServing: food.gramsPerServing || null,
        kcal100g: food.kcal,
        protein100g: food.protein,
        fat100g: food.fat,
        carbs100g: food.carbs,
        fiber100g: food.fiber,
        sodium100g: 0,
        tags: food.tags,
        source: 'builtin',
        isActive: true
      });
    }
    
    console.log(`✅ Successfully seeded ${seedFoods.length} food items`);
    
    // Add some example barcodes (you can expand this)
    console.log('Adding example barcodes...');
    const chickenBreast = await db.select().from(foodItems).where(eq(foodItems.name, '鸡胸肉')).limit(1);
    if (chickenBreast.length > 0) {
      await db.insert(foodBarcodes).values({
        gtin: '1234567890123',
        foodId: chickenBreast[0].id
      });
    }
    
    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Auto-run seed
seedDatabase()
  .then(() => {
    console.log('Seed complete, exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
