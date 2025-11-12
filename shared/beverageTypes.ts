/**
 * Beverage Types and Hydration Classification System
 * 
 * Classification rules:
 * 1. Zero-calorie beverages: Pure water, sparkling water, unsweetened tea, black coffee
 * 2. Caloric beverages: Automatically logged as "beverage calories", do NOT count towards hydration
 * 3. Restricted beverages: Sugary sodas - show warning and red label
 * 4. Black coffee: Counts towards hydration but ≤30% of daily target
 */

// Comprehensive beverage type system
export type BeverageType = 
  // Zero-calorie water sources (allowed in water tracking)
  | 'water'           // 白水
  | 'sparkling-water' // 气泡水
  | 'unsweetened-tea' // 无糖茶
  | 'black-coffee'    // 黑咖啡
  // Caloric beverages (NOT counted towards water intake)
  | 'sweetened-coffee' // 含糖咖啡
  | 'milk'             // 牛奶
  | 'juice'            // 果汁
  | 'sports-drink'     // 运动饮料
  | 'sugary-soda'      // 含糖汽水 (Restricted)
  | 'energy-drink'     // 功能饮料
  | 'plant-milk'       // 植物奶
  | 'other';           // 其他

export interface BeverageConfig {
  type: BeverageType;
  name: string;           // Display name (Chinese)
  nameEn: string;         // Display name (English)
  hydrationFactor: number; // 0-1: percentage of volume that counts towards hydration
  hasCalories: boolean;   // Whether it contains calories
  isRestricted: boolean;  // Whether it's a restricted item (e.g., sugary soda)
  maxContributionPercent: number; // Max % of daily water target (100 for most, 30 for black coffee)
  icon: string;           // Icon
  category: 'zero-calorie' | 'caloric' | 'restricted'; // Classification
  description: string;    // Chinese description
  descriptionEn: string;  // English description
}

/**
 * Complete beverage configuration database
 */
export const BEVERAGE_CONFIGS: Record<BeverageType, BeverageConfig> = {
  // ====== Zero-Calorie Water Sources ======
  water: {
    type: 'water',
    name: '白水',
    nameEn: 'Water',
    hydrationFactor: 1.0,
    hasCalories: false,
    isRestricted: false,
    maxContributionPercent: 100,
    icon: '💧',
    category: 'zero-calorie',
    description: '纯净水，100% 计入饮水目标',
    descriptionEn: 'Pure water, 100% counts towards hydration goal'
  },
  'sparkling-water': {
    type: 'sparkling-water',
    name: '气泡水',
    nameEn: 'Sparkling Water',
    hydrationFactor: 1.0,
    hasCalories: false,
    isRestricted: false,
    maxContributionPercent: 100,
    icon: '🫧',
    category: 'zero-calorie',
    description: '无糖气泡水，100% 计入饮水目标',
    descriptionEn: 'Unsweetened sparkling water, 100% counts towards hydration'
  },
  'unsweetened-tea': {
    type: 'unsweetened-tea',
    name: '无糖茶',
    nameEn: 'Unsweetened Tea',
    hydrationFactor: 0.85,
    hasCalories: false,
    isRestricted: false,
    maxContributionPercent: 100,
    icon: '🍵',
    category: 'zero-calorie',
    description: '无糖茶饮，85% 计入饮水目标（含少量咖啡因）',
    descriptionEn: 'Unsweetened tea, 85% counts towards hydration (contains caffeine)'
  },
  'black-coffee': {
    type: 'black-coffee',
    name: '黑咖啡',
    nameEn: 'Black Coffee',
    hydrationFactor: 0.75,
    hasCalories: false,
    isRestricted: false,
    maxContributionPercent: 30, // Special limit: max 30% of daily target
    icon: '☕',
    category: 'zero-calorie',
    description: '黑咖啡（无糖无奶），75% 计入饮水，最多占每日目标30%',
    descriptionEn: 'Black coffee (no sugar/milk), 75% hydration, max 30% of daily target'
  },

  // ====== Caloric Beverages (NOT counted towards water) ======
  'sweetened-coffee': {
    type: 'sweetened-coffee',
    name: '含糖咖啡',
    nameEn: 'Sweetened Coffee',
    hydrationFactor: 0, // Does NOT count towards water intake
    hasCalories: true,
    isRestricted: false,
    maxContributionPercent: 0,
    icon: '☕',
    category: 'caloric',
    description: '含糖/奶咖啡，归类为饮品热量，不计入饮水目标',
    descriptionEn: 'Sweetened/milk coffee, logged as beverage calories, NOT hydration'
  },
  milk: {
    type: 'milk',
    name: '牛奶',
    nameEn: 'Milk',
    hydrationFactor: 0,
    hasCalories: true,
    isRestricted: false,
    maxContributionPercent: 0,
    icon: '🥛',
    category: 'caloric',
    description: '牛奶，归类为饮品热量，不计入饮水目标',
    descriptionEn: 'Milk, logged as beverage calories, NOT hydration'
  },
  juice: {
    type: 'juice',
    name: '果汁',
    nameEn: 'Juice',
    hydrationFactor: 0,
    hasCalories: true,
    isRestricted: false,
    maxContributionPercent: 0,
    icon: '🧃',
    category: 'caloric',
    description: '果汁，归类为饮品热量，不计入饮水目标',
    descriptionEn: 'Juice, logged as beverage calories, NOT hydration'
  },
  'sports-drink': {
    type: 'sports-drink',
    name: '运动饮料',
    nameEn: 'Sports Drink',
    hydrationFactor: 0,
    hasCalories: true,
    isRestricted: false,
    maxContributionPercent: 0,
    icon: '🥤',
    category: 'caloric',
    description: '运动饮料，归类为饮品热量，不计入饮水目标',
    descriptionEn: 'Sports drink, logged as beverage calories, NOT hydration'
  },
  'energy-drink': {
    type: 'energy-drink',
    name: '功能饮料',
    nameEn: 'Energy Drink',
    hydrationFactor: 0,
    hasCalories: true,
    isRestricted: false,
    maxContributionPercent: 0,
    icon: '⚡',
    category: 'caloric',
    description: '功能饮料，归类为饮品热量，不计入饮水目标',
    descriptionEn: 'Energy drink, logged as beverage calories, NOT hydration'
  },
  'plant-milk': {
    type: 'plant-milk',
    name: '植物奶',
    nameEn: 'Plant Milk',
    hydrationFactor: 0,
    hasCalories: true,
    isRestricted: false,
    maxContributionPercent: 0,
    icon: '🌱',
    category: 'caloric',
    description: '植物奶（豆奶/杏仁奶等），归类为饮品热量，不计入饮水目标',
    descriptionEn: 'Plant milk (soy/almond), logged as beverage calories, NOT hydration'
  },

  // ====== Restricted Beverages (Show warning) ======
  'sugary-soda': {
    type: 'sugary-soda',
    name: '含糖汽水',
    nameEn: 'Sugary Soda',
    hydrationFactor: 0,
    hasCalories: true,
    isRestricted: true, // Show warning
    maxContributionPercent: 0,
    icon: '🥤',
    category: 'restricted',
    description: '含糖汽水（可乐/雪碧等），不建议在健身期饮用，不计入饮水目标',
    descriptionEn: 'Sugary soda (cola/sprite), not recommended during fitness, NOT hydration'
  },

  // ====== Other ======
  other: {
    type: 'other',
    name: '其他',
    nameEn: 'Other',
    hydrationFactor: 0,
    hasCalories: true,
    isRestricted: false,
    maxContributionPercent: 0,
    icon: '🧋',
    category: 'caloric',
    description: '其他饮品，归类为饮品热量，不计入饮水目标',
    descriptionEn: 'Other beverages, logged as beverage calories, NOT hydration'
  }
};

/**
 * Get only zero-calorie beverage types (allowed in water tracking page)
 */
export function getZeroCalorieBeverageTypes(): BeverageType[] {
  return Object.values(BEVERAGE_CONFIGS)
    .filter(config => !config.hasCalories)
    .map(config => config.type);
}

/**
 * Check if a beverage type is zero-calorie (allowed in water tracking)
 */
export function isZeroCalorieBeverage(beverageType: BeverageType): boolean {
  return !BEVERAGE_CONFIGS[beverageType].hasCalories;
}

/**
 * Check if a beverage is restricted (show warning)
 */
export function isRestrictedBeverage(beverageType: BeverageType): boolean {
  return BEVERAGE_CONFIGS[beverageType].isRestricted;
}

/**
 * Calculate effective hydration with black coffee 30% limit
 * 
 * @param amountOz - Amount to add in ounces
 * @param beverageType - Type of beverage
 * @param currentBlackCoffeeOz - Current total black coffee effective oz today
 * @param dailyTargetOz - Daily water target in oz
 * @returns { effectiveOz, cappedOz, wasReduced }
 */
export function calculateEffectiveHydration(
  amountOz: number,
  beverageType: BeverageType,
  currentBlackCoffeeOz: number = 0,
  dailyTargetOz: number = 64
): { effectiveOz: number; cappedOz: number; wasReduced: boolean } {
  const config = BEVERAGE_CONFIGS[beverageType];
  const baseEffective = amountOz * config.hydrationFactor;

  // Black coffee special handling: max 30% of daily target
  if (beverageType === 'black-coffee') {
    const maxAllowed = dailyTargetOz * 0.30; // 30% limit
    const newTotal = currentBlackCoffeeOz + baseEffective;
    
    if (newTotal > maxAllowed) {
      const cappedOz = Math.max(0, maxAllowed - currentBlackCoffeeOz);
      return {
        effectiveOz: cappedOz,
        cappedOz: cappedOz,
        wasReduced: true
      };
    }
  }

  return {
    effectiveOz: baseEffective,
    cappedOz: baseEffective,
    wasReduced: false
  };
}

/**
 * Get beverage display name in Chinese
 */
export function getBeverageName(beverageType: BeverageType): string {
  return BEVERAGE_CONFIGS[beverageType].name;
}

/**
 * Get beverage icon
 */
export function getBeverageIcon(beverageType: BeverageType): string {
  return BEVERAGE_CONFIGS[beverageType].icon;
}

/**
 * Get hydration factor for a beverage type
 */
export function getHydrationFactor(beverageType: BeverageType): number {
  return BEVERAGE_CONFIGS[beverageType].hydrationFactor;
}

/**
 * Get beverage category
 */
export function getBeverageCategory(beverageType: BeverageType): 'zero-calorie' | 'caloric' | 'restricted' {
  return BEVERAGE_CONFIGS[beverageType].category;
}

/**
 * Format effective hydration display with original amount
 * 
 * @example "300ml 黑咖啡 → 225ml 有效水分 (75%)"
 */
export function formatHydrationDisplay(
  amountOz: number,
  beverageType: BeverageType,
  unit: 'oz' | 'ml' = 'oz'
): string {
  const { effectiveOz } = calculateEffectiveHydration(amountOz, beverageType, 0, 64);
  const factor = getHydrationFactor(beverageType);
  const factorPercent = Math.round(factor * 100);
  const icon = getBeverageIcon(beverageType);
  const name = getBeverageName(beverageType);
  
  if (unit === 'ml') {
    const amountMl = Math.round(amountOz * 29.5735);
    const effectiveMl = Math.round(effectiveOz * 29.5735);
    return `${amountMl}ml ${icon}${name} → ${effectiveMl}ml 有效水分 (${factorPercent}%)`;
  } else {
    return `${amountOz.toFixed(1)}oz ${icon}${name} → ${effectiveOz.toFixed(1)}oz 有效水分 (${factorPercent}%)`;
  }
}
