// Unit conversion constants
export const OZ_TO_GRAMS = 28.3495;
export const KG_TO_GRAMS = 1000;
export const OZ_TO_ML = 29.5735;

// Unit types
export type WeightUnit = 'g' | 'oz' | 'kg' | 'serving';
export type VolumeUnit = 'oz' | 'ml';

/**
 * Convert any weight unit to grams
 * @param value - The numeric value
 * @param unit - The unit (g, oz, kg, serving)
 * @param gramsPerServing - Required if unit is 'serving'
 * @returns Value in grams
 */
export function toGrams(
  value: number,
  unit: WeightUnit,
  gramsPerServing?: number
): number {
  if (unit === 'g') return value;
  if (unit === 'oz') return value * OZ_TO_GRAMS;
  if (unit === 'kg') return value * KG_TO_GRAMS;
  if (unit === 'serving') {
    if (!gramsPerServing) {
      throw new Error('gramsPerServing is required when unit is "serving"');
    }
    return value * gramsPerServing;
  }
  return value;
}

/**
 * Convert grams to any weight unit
 * @param grams - Value in grams
 * @param unit - Target unit
 * @param gramsPerServing - Required if unit is 'serving'
 * @returns Value in target unit
 */
export function fromGrams(
  grams: number,
  unit: WeightUnit,
  gramsPerServing?: number
): number {
  if (unit === 'g') return grams;
  if (unit === 'oz') return grams / OZ_TO_GRAMS;
  if (unit === 'kg') return grams / KG_TO_GRAMS;
  if (unit === 'serving') {
    if (!gramsPerServing) {
      throw new Error('gramsPerServing is required when unit is "serving"');
    }
    return grams / gramsPerServing;
  }
  return grams;
}

/**
 * Convert oz to ml
 */
export function ozToMl(oz: number): number {
  return oz * OZ_TO_ML;
}

/**
 * Convert ml to oz
 */
export function mlToOz(ml: number): number {
  return ml / OZ_TO_ML;
}

/**
 * Nutrition per 100g interface (including micronutrients)
 */
export interface NutritionPer100g {
  kcal: number;
  P: number; // Protein
  F: number; // Fat
  C: number; // Carbs
  fiber: number;
  sodium?: number; // Sodium (mg)
  // Micronutrients (optional for backward compatibility)
  vitaminA?: number; // Vitamin A (mcg RAE)
  vitaminC?: number; // Vitamin C (mg)
  vitaminD?: number; // Vitamin D (mcg)
  vitaminE?: number; // Vitamin E (mg)
  vitaminK?: number; // Vitamin K (mcg)
  vitaminB12?: number; // Vitamin B12 (mcg)
  calcium?: number; // Calcium (mg)
  iron?: number; // Iron (mg)
  magnesium?: number; // Magnesium (mg)
  zinc?: number; // Zinc (mg)
  potassium?: number; // Potassium (mg)
}

/**
 * Calculate nutrition values for a specific intake amount
 * @param grams - Amount consumed in grams
 * @param per100g - Nutrition values per 100g
 * @returns Calculated nutrition for the intake amount
 */
export function calcNutritionPerIntake(
  grams: number,
  per100g: NutritionPer100g
): NutritionPer100g {
  const ratio = grams / 100;
  return {
    kcal: +(per100g.kcal * ratio).toFixed(1),
    P: +(per100g.P * ratio).toFixed(1),
    F: +(per100g.F * ratio).toFixed(1),
    C: +(per100g.C * ratio).toFixed(1),
    fiber: +(per100g.fiber * ratio).toFixed(1),
    sodium: per100g.sodium ? +(per100g.sodium * ratio).toFixed(1) : 0,
    // Micronutrients (only calculate if provided)
    vitaminA: per100g.vitaminA ? +(per100g.vitaminA * ratio).toFixed(1) : 0,
    vitaminC: per100g.vitaminC ? +(per100g.vitaminC * ratio).toFixed(1) : 0,
    vitaminD: per100g.vitaminD ? +(per100g.vitaminD * ratio).toFixed(2) : 0,
    vitaminE: per100g.vitaminE ? +(per100g.vitaminE * ratio).toFixed(1) : 0,
    vitaminK: per100g.vitaminK ? +(per100g.vitaminK * ratio).toFixed(1) : 0,
    vitaminB12: per100g.vitaminB12 ? +(per100g.vitaminB12 * ratio).toFixed(2) : 0,
    calcium: per100g.calcium ? +(per100g.calcium * ratio).toFixed(1) : 0,
    iron: per100g.iron ? +(per100g.iron * ratio).toFixed(1) : 0,
    magnesium: per100g.magnesium ? +(per100g.magnesium * ratio).toFixed(1) : 0,
    zinc: per100g.zinc ? +(per100g.zinc * ratio).toFixed(1) : 0,
    potassium: per100g.potassium ? +(per100g.potassium * ratio).toFixed(1) : 0,
  };
}

/**
 * Calculate servings needed based on protein requirement (protein-first approach)
 * @param remainingProtein - Remaining protein needed (g)
 * @param proteinPerServing - Protein per serving (g)
 * @param minServings - Minimum servings (default 0.5)
 * @param maxServings - Maximum servings (default 3)
 * @returns Calculated servings (rounded to nearest 0.5)
 */
export function servingsForProteinFirst(
  remainingProtein: number,
  proteinPerServing: number,
  minServings: number = 0.5,
  maxServings: number = 3
): number {
  if (proteinPerServing <= 0) return 1;
  const servings = remainingProtein / proteinPerServing;
  const constrained = Math.min(maxServings, Math.max(minServings, servings));
  // Round to nearest 0.5
  return Math.round(constrained * 2) / 2;
}

/**
 * Format nutrition value with appropriate decimal places
 * @param value - Nutrition value
 * @param decimalPlaces - Number of decimal places (0 or 1)
 * @returns Formatted string
 */
export function formatNutrition(value: number, decimalPlaces: number = 1): string {
  return value.toFixed(decimalPlaces);
}

/**
 * Calculate micronutrient RDI (Recommended Daily Intake) targets based on sex and age
 * Based on FDA/NIH Dietary Reference Intakes (DRI)
 * 
 * @param sex - Biological sex ('male' or 'female')
 * @param age - Age in years
 * @returns Object with micronutrient RDI values
 */
export function calculateMicronutrientRDI(sex: 'male' | 'female' = 'male', age: number = 30): {
  sodiumMg: number;
  vitaminAMcg: number;
  vitaminCMg: number;
  vitaminDMcg: number;
  vitaminEMg: number;
  vitaminKMcg: number;
  vitaminB12Mcg: number;
  calciumMg: number;
  ironMg: number;
  magnesiumMg: number;
  zincMg: number;
  potassiumMg: number;
} {
  const isMale = sex === 'male';
  
  // Age cohorts for precise RDI calculation (FDA/NIH guidelines)
  // 19-30, 31-50, 51-70, 70+
  
  return {
    // Sodium: FDA upper limit (same for all adults)
    sodiumMg: 2300,
    
    // Vitamin A (mcg RAE): Male 900, Female 700 (all ages)
    vitaminAMcg: isMale ? 900 : 700,
    
    // Vitamin C (mg): Male 90, Female 75 (all ages)
    vitaminCMg: isMale ? 90 : 75,
    
    // Vitamin D (mcg): 15 mcg (19-70), 20 mcg (70+)
    vitaminDMcg: age >= 70 ? 20 : 15,
    
    // Vitamin E (mg alpha-tocopherol): 15 mg for all adults
    vitaminEMg: 15,
    
    // Vitamin K (mcg): Male 120, Female 90 (all ages)
    vitaminKMcg: isMale ? 120 : 90,
    
    // Vitamin B12 (mcg): 2.4 mcg for all adults
    vitaminB12Mcg: 2.4,
    
    // Calcium (mg): 1000 mg (19-50 & males 51-70), 1200 mg (females 51+ & males 71+)
    calciumMg: (() => {
      if (age < 51) return 1000; // All adults 19-50
      if (isMale && age < 71) return 1000; // Males 51-70
      return 1200; // Females 51+ & Males 71+
    })(),
    
    // Iron (mg): Male 8 (all ages), Female 18 (19-50), Female 8 (51+)
    ironMg: isMale ? 8 : (age < 51 ? 18 : 8),
    
    // Magnesium (mg): Age and sex-specific
    // Males: 400 (19-30), 420 (31+)
    // Females: 310 (19-30), 320 (31+)
    magnesiumMg: (() => {
      if (isMale) {
        return age < 31 ? 400 : 420; // Males 19-30: 400, 31+: 420
      } else {
        return age < 31 ? 310 : 320; // Females 19-30: 310, 31+: 320
      }
    })(),
    
    // Zinc (mg): Male 11, Female 8 (all ages)
    zincMg: isMale ? 11 : 8,
    
    // Potassium (mg): Male 3400, Female 2600 (all ages)
    potassiumMg: isMale ? 3400 : 2600
  };
}

/**
 * Calculate daily nutrition targets based on user profile
 * Uses the Mifflin-St Jeor equation for BMR calculation (most accurate):
 * - Male: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
 * - Female: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
 * - TDEE = BMR × activity_factor
 * 
 * Activity factors:
 * - sedentary: 1.2 (little to no exercise)
 * - light: 1.375 (1-3 days/week)
 * - moderate: 1.55 (3-5 days/week)
 * - active: 1.725 (6-7 days/week)
 * - very_active: 1.9 (twice per day, extra heavy workouts)
 * 
 * Macronutrient targets:
 * - BULK: protein = 1.9g/kg (muscle gain focus)
 * - CUT: protein = 2.2g/kg (muscle preservation during deficit)
 * - MAINTAIN: protein = 1.8g/kg (maintenance)
 * - fat = weight(lb) × 0.35g (hormonal balance)
 * - carbs = (kcal - protein*4 - fat*9) / 4
 * - water = weight(kg) × 35ml/kg (EFSA guideline), +20% bulk, +10% cut
 * - fiber = kcal / 1000 × 14 (minimum 14g per 1000 kcal)
 */
export function calculateDailyTargets(profile: {
  weightLb: number;
  heightCm?: number;
  age?: number;
  sex?: 'male' | 'female';
  goal: 'cut' | 'maintain' | 'bulk';
  activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  proteinGPerKg?: number; // Custom protein override (g/kg)
  fatGPerKg?: number; // Custom fat override (g/kg)
}): {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  waterOz: number;
  sodiumMg: number;
  vitaminAMcg: number;
  vitaminCMg: number;
  vitaminDMcg: number;
  vitaminEMg: number;
  vitaminKMcg: number;
  vitaminB12Mcg: number;
  calciumMg: number;
  ironMg: number;
  magnesiumMg: number;
  zincMg: number;
  potassiumMg: number;
} {
  const { weightLb, heightCm = 170, age = 30, sex = 'male', goal, activity, proteinGPerKg, fatGPerKg } = profile;
  
  // Convert lb to kg
  const weightKg = weightLb * 0.453592;
  
  // Calculate BMR using Mifflin-St Jeor equation
  let bmr: number;
  if (sex === 'male') {
    // Male: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    // Female: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  
  // Activity multiplier for TDEE calculation
  let activityFactor = 1.55; // moderate default
  if (activity === 'sedentary') activityFactor = 1.2;
  if (activity === 'light') activityFactor = 1.375;
  if (activity === 'active') activityFactor = 1.725;
  if (activity === 'very_active') activityFactor = 1.9;
  
  // Calculate TDEE (Total Daily Energy Expenditure)
  let kcal = bmr * activityFactor;
  
  // Goal-specific protein targets (g/kg bodyweight)
  let defaultProteinGPerKg = 1.8; // maintain default
  let defaultFatGPerKg = 0.4; // balanced fat intake for all goals
  
  // Adjust defaults by goal
  if (goal === 'cut') {
    kcal -= 400; // deficit for cutting
    defaultProteinGPerKg = 2.2; // Higher protein to preserve muscle during deficit
    defaultFatGPerKg = 0.35; // Slightly lower fat to allow more protein/carbs
  } else if (goal === 'bulk') {
    kcal += 300; // surplus for bulking
    defaultProteinGPerKg = 1.9; // Optimal for muscle gain
    defaultFatGPerKg = 0.4; // Adequate fat for hormone production
  } else {
    // maintain
    defaultProteinGPerKg = 1.8;
    defaultFatGPerKg = 0.4;
  }
  
  // Use custom values if provided, otherwise use defaults
  const finalProteinGPerKg = proteinGPerKg ?? defaultProteinGPerKg;
  const finalFatGPerKg = fatGPerKg ?? defaultFatGPerKg;
  
  // Protein: customizable g/kg
  const proteinG = weightKg * finalProteinGPerKg;
  
  // Fat: customizable g/kg
  const fatG = weightKg * finalFatGPerKg;
  
  // Carbs: remainder of calories (4 kcal/g protein, 9 kcal/g fat, 4 kcal/g carbs)
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsKcal = kcal - proteinKcal - fatKcal;
  const carbsG = Math.max(0, carbsKcal / 4); // Ensure non-negative
  
  // Fiber: minimum 14g per 1000 kcal
  const fiberG = (kcal / 1000) * 14;
  
  // Water: Simplified formula = 0.5 oz per lb bodyweight
  // Example: 150 lb person = 150 × 0.5 = 75 oz/day (2.2 L/day) ✓
  // This is easier to remember and roughly equivalent to EFSA guidelines
  let waterOz = weightLb * 0.5;
  
  // Goal-based water adjustments
  if (goal === 'bulk') {
    waterOz *= 1.20; // +20% for muscle protein synthesis and workout recovery
  } else if (goal === 'cut') {
    waterOz *= 1.10; // +10% for increased metabolic waste and appetite control
  }
  // Maintain: no adjustment (baseline hydration)
  
  // Calculate micronutrient RDI based on sex and age
  const micronutrientRDI = calculateMicronutrientRDI(sex, age);
  
  return {
    kcal: +kcal.toFixed(0),
    proteinG: +proteinG.toFixed(1),
    fatG: +fatG.toFixed(1),
    carbsG: +carbsG.toFixed(1),
    fiberG: +fiberG.toFixed(1),
    waterOz: +waterOz.toFixed(0),
    ...micronutrientRDI
  };
}
