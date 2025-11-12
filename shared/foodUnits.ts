/**
 * Food Units Conversion Table
 * 
 * Provides conversion factors from various units to grams for food measurement.
 * Supports 3 modes:
 * 1. Weight units (g, oz, lb)
 * 2. Volume/household units (cup, tbsp, tsp, piece, slice)
 * 3. Hand portion estimation (fist, palm, thumb, cupped_hand)
 */

export type FoodUnitType = 
  | 'g' | 'oz' | 'lb'  // Weight
  | 'cup' | 'tbsp' | 'tsp' | 'piece' | 'slice' | 'bowl'  // Volume/household
  | 'fist' | 'palm' | 'thumb' | 'cupped_hand';  // Hand estimation

export interface UnitConversion {
  [unit: string]: number;  // unit -> grams per unit
}

export interface FoodUnitMap {
  [foodKey: string]: UnitConversion;
}

/**
 * Default unit conversion table
 * 
 * Structure:
 * - __generic__: Fallback values when no specific food mapping exists
 * - {foodKey}: Specific conversions for common foods
 */
export const DEFAULT_UNIT_MAP: FoodUnitMap = {
  // Generic fallback values (used when no specific food mapping exists)
  __generic__: {
    // Weight units
    g: 1,
    oz: 28.35,
    lb: 453.59,
    
    // Volume/household units (approximations)
    cup: 120,           // 1 cup general diced/cooked food ≈ 120g
    tbsp: 15,           // 1 tablespoon ≈ 15g
    tsp: 5,             // 1 teaspoon ≈ 5g
    piece: 60,          // 1 piece/unit ≈ 60g (generic)
    slice: 30,          // 1 slice ≈ 30g (generic)
    bowl: 200,          // 1 bowl ≈ 200g (generic)
    
    // Hand portion estimation
    fist: 180,          // 1 fist volume ≈ 180g (veggies/rice/pasta)
    palm: 100,          // 1 palm (no fingers) ≈ 100g (cooked meat/protein)
    thumb: 15,          // 1 thumb ≈ 15g (fats/butter/nuts)
    cupped_hand: 40     // 1 cupped hand ≈ 40g (nuts/dried fruit/snacks)
  },

  // Rice (cooked)
  rice_cooked: {
    g: 1,
    cup: 158,           // 1 cup cooked rice ≈ 158g
    bowl: 220,          // 1 bowl ≈ 220g (Chinese rice bowl)
    fist: 180,          // 1 fist ≈ 180g
    piece: 220
  },

  // Rice (raw/dry)
  rice_raw: {
    g: 1,
    cup: 185,           // 1 cup raw rice ≈ 185g
    tbsp: 12
  },

  // Chicken breast (cooked)
  chicken_breast_cooked: {
    g: 1,
    oz: 28.35,
    palm: 120,          // 1 palm ≈ 120g (deck of cards size)
    piece: 120,         // 1 piece ≈ 120g
    slice: 50
  },

  // Chicken breast (raw)
  chicken_breast_raw: {
    g: 1,
    oz: 28.35,
    palm: 130,
    piece: 150
  },

  // Beef steak (cooked)
  beef_steak_cooked: {
    g: 1,
    oz: 28.35,
    palm: 130,          // 1 palm ≈ 130g
    piece: 130
  },

  // Ground beef (cooked)
  beef_ground_cooked: {
    g: 1,
    oz: 28.35,
    cup: 210,
    palm: 100
  },

  // Broccoli (cooked)
  broccoli_cooked: {
    g: 1,
    cup: 156,           // 1 cup chopped ≈ 156g
    fist: 90,           // 1 fist ≈ 90g
    piece: 180
  },

  // Broccoli (raw)
  broccoli_raw: {
    g: 1,
    cup: 91,
    fist: 85
  },

  // Spinach (cooked)
  spinach_cooked: {
    g: 1,
    cup: 180,
    fist: 120
  },

  // Spinach (raw)
  spinach_raw: {
    g: 1,
    cup: 30,            // 1 cup raw ≈ 30g (very light)
    fist: 25
  },

  // Olive oil
  olive_oil: {
    g: 1,
    tbsp: 14,           // 1 tablespoon ≈ 14g
    tsp: 4.5,           // 1 teaspoon ≈ 4.5g
    thumb: 12           // 1 thumb tip ≈ 12g
  },

  // Butter
  butter: {
    g: 1,
    tbsp: 14,
    tsp: 5,
    thumb: 10
  },

  // Peanut butter
  peanut_butter: {
    g: 1,
    tbsp: 16,
    tsp: 5,
    thumb: 12
  },

  // Egg (whole, raw)
  egg_raw: {
    g: 1,
    piece: 50           // 1 large egg ≈ 50g
  },

  // Egg white (raw)
  egg_white_raw: {
    g: 1,
    piece: 33           // 1 large egg white ≈ 33g
  },

  // Bread (slice)
  bread_slice: {
    g: 1,
    slice: 28,          // 1 slice ≈ 28g
    piece: 28
  },

  // Pasta (cooked)
  pasta_cooked: {
    g: 1,
    cup: 140,           // 1 cup cooked pasta ≈ 140g
    fist: 130
  },

  // Pasta (dry)
  pasta_dry: {
    g: 1,
    cup: 100,
    oz: 28.35
  },

  // Oatmeal (dry)
  oatmeal_dry: {
    g: 1,
    cup: 80,
    tbsp: 6
  },

  // Oatmeal (cooked)
  oatmeal_cooked: {
    g: 1,
    cup: 240,
    bowl: 250
  },

  // Milk
  milk: {
    g: 1,
    cup: 245,           // 1 cup ≈ 245g
    tbsp: 15,
    oz: 28.35           // fl oz ≈ 28.35g (for water-based liquids)
  },

  // Yogurt (plain)
  yogurt_plain: {
    g: 1,
    cup: 245,
    tbsp: 15,
    bowl: 200
  },

  // Cheese (shredded)
  cheese_shredded: {
    g: 1,
    cup: 113,
    tbsp: 7,
    thumb: 30
  },

  // Cheese (slice)
  cheese_slice: {
    g: 1,
    slice: 28,
    piece: 28
  },

  // Tomato (raw)
  tomato_raw: {
    g: 1,
    cup: 180,           // 1 cup chopped ≈ 180g
    piece: 120,         // 1 medium tomato ≈ 120g
    slice: 25
  },

  // Potato (cooked)
  potato_cooked: {
    g: 1,
    cup: 156,
    piece: 200,         // 1 medium potato ≈ 200g
    fist: 180
  },

  // Banana
  banana: {
    g: 1,
    piece: 120          // 1 medium banana ≈ 120g (with peel removed)
  },

  // Apple
  apple: {
    g: 1,
    piece: 180,         // 1 medium apple ≈ 180g
    slice: 35
  },

  // Orange
  orange: {
    g: 1,
    piece: 140          // 1 medium orange ≈ 140g (peeled)
  },

  // Almonds
  almonds: {
    g: 1,
    cup: 143,
    tbsp: 9,
    cupped_hand: 30,    // 1 cupped hand ≈ 30g
    piece: 1.2          // 1 almond ≈ 1.2g
  },

  // Walnuts
  walnuts: {
    g: 1,
    cup: 120,
    cupped_hand: 30,
    piece: 2.5          // 1 walnut half ≈ 2.5g
  },

  // Protein powder (whey)
  protein_powder: {
    g: 1,
    tbsp: 8,
    // Note: Usually measured by scoop (see gramsPerServing in food database)
  },

  // Sugar
  sugar: {
    g: 1,
    cup: 200,
    tbsp: 12.5,
    tsp: 4
  },

  // Honey
  honey: {
    g: 1,
    tbsp: 21,
    tsp: 7
  },

  // Avocado
  avocado: {
    g: 1,
    piece: 200,         // 1 whole avocado ≈ 200g
    slice: 30
  },

  // Salmon (cooked)
  salmon_cooked: {
    g: 1,
    oz: 28.35,
    palm: 120,
    piece: 140
  },

  // Tuna (canned, drained)
  tuna_canned: {
    g: 1,
    oz: 28.35,
    cup: 140,
    piece: 140          // 1 can ≈ 140g
  },

  // Beans (cooked, black/kidney/pinto)
  beans_cooked: {
    g: 1,
    cup: 172,
    fist: 150,
    tbsp: 12
  },

  // Tofu (firm)
  tofu_firm: {
    g: 1,
    cup: 252,
    palm: 85,
    piece: 85           // 1 serving ≈ 85g
  },

  // Strawberries
  strawberries: {
    g: 1,
    cup: 144,
    piece: 12,          // 1 medium strawberry ≈ 12g
    fist: 120
  },

  // Blueberries
  blueberries: {
    g: 1,
    cup: 148,
    cupped_hand: 70
  },

  // Carrots (raw)
  carrots_raw: {
    g: 1,
    cup: 128,           // 1 cup chopped ≈ 128g
    piece: 61,          // 1 medium carrot ≈ 61g
    fist: 90
  },

  // Sweet potato (cooked)
  sweet_potato_cooked: {
    g: 1,
    cup: 200,
    piece: 150,
    fist: 180
  }
};

/**
 * Get hand portion estimation descriptions (for UI tooltips)
 */
export const HAND_PORTION_DESCRIPTIONS = {
  fist: {
    zh: '拳头 ≈ 一杯蔬菜/饭的体积 → 约 150–200g',
    en: 'Fist ≈ 1 cup of veggies/rice → ~150–200g'
  },
  palm: {
    zh: '手掌(去指) ≈ 一片肉排/鸡胸 → 约 100–130g',
    en: 'Palm (no fingers) ≈ 1 portion of meat → ~100–130g'
  },
  thumb: {
    zh: '拇指 ≈ 一小段脂肪/酱 → 约 10–15g',
    en: 'Thumb ≈ 1 serving of fats/butter → ~10–15g'
  },
  cupped_hand: {
    zh: '捧手 ≈ 一小把坚果/干果 → 约 30–50g',
    en: 'Cupped hand ≈ 1 handful of nuts/dried fruit → ~30–50g'
  }
};

/**
 * Get unit display name in Chinese
 */
export const UNIT_DISPLAY_NAMES: Record<string, string> = {
  // Weight
  g: '克',
  oz: '盎司',
  lb: '磅',
  
  // Volume/household
  cup: '杯',
  tbsp: '汤匙',
  tsp: '茶匙',
  piece: '个',
  slice: '片',
  bowl: '碗',
  
  // Hand estimation
  fist: '拳头',
  palm: '手掌',
  thumb: '拇指',
  cupped_hand: '捧手'
};

/**
 * Resolve grams per unit for a given food and unit
 * 
 * Priority:
 * 1. User custom units (from database)
 * 2. Food-specific mapping
 * 3. Generic fallback
 * 
 * @param foodKey - Food identifier (e.g., 'chicken_breast_cooked')
 * @param unit - Unit name (e.g., 'palm', 'cup', 'g')
 * @param userUnitsMap - User's custom units (optional)
 * @returns Grams per unit
 */
export function resolveGramsPerUnit(
  foodKey: string,
  unit: string,
  userUnitsMap?: Record<string, Record<string, number>>
): number {
  // 1) User custom units (highest priority)
  if (userUnitsMap && userUnitsMap[foodKey] && userUnitsMap[foodKey][unit] !== undefined) {
    return userUnitsMap[foodKey][unit];
  }

  // 2) Food-specific mapping
  const foodMap = DEFAULT_UNIT_MAP[foodKey];
  if (foodMap && foodMap[unit] !== undefined) {
    return foodMap[unit];
  }

  // 3) Generic fallback
  if (DEFAULT_UNIT_MAP.__generic__[unit] !== undefined) {
    return DEFAULT_UNIT_MAP.__generic__[unit];
  }

  // Default to 1 (assumes unit is already in grams)
  return 1;
}

/**
 * Convert amount in given unit to grams
 * 
 * @param amount - Quantity
 * @param unit - Unit name
 * @param foodKey - Food identifier
 * @param userUnitsMap - User's custom units (optional)
 * @returns Weight in grams
 */
export function convertToGrams(
  amount: number,
  unit: string,
  foodKey: string,
  userUnitsMap?: Record<string, Record<string, number>>
): number {
  const gramsPerUnit = resolveGramsPerUnit(foodKey, unit, userUnitsMap);
  return amount * gramsPerUnit;
}
