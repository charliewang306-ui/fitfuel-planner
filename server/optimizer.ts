// Multi-food optimization algorithm using Linear Programming
import type { FoodItem } from "@shared/schema";
// @ts-ignore - no type definitions available
import solver from 'javascript-lp-solver';

interface NutritionTarget {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

interface FoodPortion {
  food: FoodItem;
  amountG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  score: number;
}

interface OptimizedCombo {
  name: string;
  foods: FoodPortion[];
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  totalFiberG: number;
  deviation: number;
}

/**
 * Calculate deviation score (lower is better)
 * Weighted to prioritize protein matching
 */
function calculateDeviation(
  actual: NutritionTarget,
  target: NutritionTarget
): number {
  const kcalDev = Math.abs(actual.kcal - target.kcal) / 50;
  const proteinDev = Math.abs(actual.proteinG - target.proteinG) / 3;
  const fatDev = Math.abs(actual.fatG - target.fatG) / 2;
  const carbsDev = Math.abs(actual.carbsG - target.carbsG) / 5;
  const fiberDev = Math.abs(actual.fiberG - target.fiberG) / 3;
  
  return kcalDev + (proteinDev * 3) + fatDev + carbsDev + (fiberDev * 0.5);
}

/**
 * Solve LP problem to find optimal food combination
 * Minimizes weighted deviation from nutrition targets
 */
function solveLinearProgram(
  foods: FoodItem[],
  target: NutritionTarget,
  maxFoods: number = 3
): { amounts: Map<string, number>, deviation: number } | null {
  if (foods.length === 0) return null;

  // Build LP model
  const model: any = {
    optimize: 'deviation',
    opType: 'min',
    constraints: {},
    variables: {},
    ints: {} // Integer constraints for discrete portions
  };

  // Decision variables: amount (in grams) of each food
  foods.forEach((food, idx) => {
    const varName = `food_${idx}`;
    
    model.variables[varName] = {
      deviation: 0, // We'll use soft constraints via slack variables
      // Contribution to each nutrient per 100g
      kcal: food.kcal100g / 100,
      protein: food.protein100g / 100,
      fat: food.fat100g / 100,
      carbs: food.carbs100g / 100,
      fiber: food.fiber100g / 100
    };
    
    // Portion size constraints (50g-500g)
    model.constraints[`${varName}_min`] = { min: 0 };
    model.constraints[`${varName}_max`] = { max: 500 };
    
    // Each variable represents grams
    model.variables[varName][`${varName}_min`] = 1;
    model.variables[varName][`${varName}_max`] = 1;
  });

  // Add slack variables for soft nutrient constraints
  // These measure deviation from targets
  const nutrients = ['kcal', 'protein', 'fat', 'carbs', 'fiber'];
  const weights = { kcal: 1/50, protein: 3/3, fat: 1/2, carbs: 1/5, fiber: 0.5/3 };
  
  nutrients.forEach(nutrient => {
    // Positive deviation (over target)
    model.variables[`slack_${nutrient}_pos`] = {
      deviation: weights[nutrient as keyof typeof weights],
      [`${nutrient}_constraint`]: 1
    };
    model.constraints[`slack_${nutrient}_pos_min`] = { min: 0 };
    model.variables[`slack_${nutrient}_pos`][`slack_${nutrient}_pos_min`] = 1;
    
    // Negative deviation (under target)
    model.variables[`slack_${nutrient}_neg`] = {
      deviation: weights[nutrient as keyof typeof weights],
      [`${nutrient}_constraint`]: -1
    };
    model.constraints[`slack_${nutrient}_neg_min`] = { min: 0 };
    model.variables[`slack_${nutrient}_neg`][`slack_${nutrient}_neg_min`] = 1;
  });

  // Nutrient balance constraints (total nutrients = target + slack)
  model.constraints.kcal_constraint = { 
    equal: target.kcal,
  };
  model.constraints.protein_constraint = { 
    equal: target.proteinG,
  };
  model.constraints.fat_constraint = { 
    equal: target.fatG,
  };
  model.constraints.carbs_constraint = { 
    equal: target.carbsG,
  };
  model.constraints.fiber_constraint = { 
    equal: target.fiberG,
  };

  foods.forEach((food, idx) => {
    const varName = `food_${idx}`;
    model.variables[varName].kcal_constraint = food.kcal100g / 100;
    model.variables[varName].protein_constraint = food.protein100g / 100;
    model.variables[varName].fat_constraint = food.fat100g / 100;
    model.variables[varName].carbs_constraint = food.carbs100g / 100;
    model.variables[varName].fiber_constraint = food.fiber100g / 100;
  });

  // Solve the LP
  try {
    const result = solver.Solve(model);
    
    if (!result || !result.feasible) {
      return null;
    }

    // Extract solution
    const amounts = new Map<string, number>();
    let totalDeviation = 0;
    
    foods.forEach((food, idx) => {
      const varName = `food_${idx}`;
      const amount = result[varName] || 0;
      if (amount >= 20) { // Filter out negligible amounts
        amounts.set(food.id, Math.round(amount));
      }
    });

    // Calculate actual deviation from result
    nutrients.forEach(nutrient => {
      const posSlack = result[`slack_${nutrient}_pos`] || 0;
      const negSlack = result[`slack_${nutrient}_neg`] || 0;
      totalDeviation += (posSlack + negSlack) * weights[nutrient as keyof typeof weights];
    });

    return { amounts, deviation: totalDeviation };
  } catch (error) {
    console.error('LP solver error:', error);
    return null;
  }
}

/**
 * Generate multiple LP-based combinations by varying food subsets
 */
function generateLPCombinations(
  foods: FoodItem[],
  target: NutritionTarget,
  maxCombos: number = 3
): OptimizedCombo[] {
  const combos: OptimizedCombo[] = [];
  
  // Strategy 1: Use all available foods
  const fullSolution = solveLinearProgram(foods, target, foods.length);
  if (fullSolution && fullSolution.amounts.size > 0 && fullSolution.amounts.size <= 3) {
    const combo = buildComboFromSolution(foods, fullSolution.amounts, target, 'Optimal Mix');
    if (combo) combos.push(combo);
  }

  // Strategy 2: High-protein foods only
  const proteinFoods = foods
    .filter(f => f.protein100g / Math.max(f.kcal100g, 1) > 0.15)
    .slice(0, 20);
  if (proteinFoods.length >= 2) {
    const proteinSolution = solveLinearProgram(proteinFoods, target, 3);
    if (proteinSolution && proteinSolution.amounts.size > 0) {
      const combo = buildComboFromSolution(proteinFoods, proteinSolution.amounts, target, 'Protein Focus');
      if (combo) combos.push(combo);
    }
  }

  // Strategy 3: Balanced macro foods (protein + carbs)
  const balancedFoods = foods
    .filter(f => {
      const proteinRatio = f.protein100g / Math.max(f.kcal100g, 1);
      const carbsRatio = f.carbs100g / Math.max(f.kcal100g, 1);
      return (proteinRatio > 0.1 && proteinRatio < 0.4) || (carbsRatio > 0.3 && carbsRatio < 0.7);
    })
    .slice(0, 20);
  if (balancedFoods.length >= 2) {
    const balancedSolution = solveLinearProgram(balancedFoods, target, 3);
    if (balancedSolution && balancedSolution.amounts.size > 0) {
      const combo = buildComboFromSolution(balancedFoods, balancedSolution.amounts, target, 'Balanced Meal');
      if (combo) combos.push(combo);
    }
  }

  // Strategy 4: Low-calorie dense foods (for larger portions)
  const lowCalDense = foods
    .filter(f => f.kcal100g < 200 && f.kcal100g > 50)
    .slice(0, 20);
  if (lowCalDense.length >= 2) {
    const lowCalSolution = solveLinearProgram(lowCalDense, target, 3);
    if (lowCalSolution && lowCalSolution.amounts.size > 0) {
      const combo = buildComboFromSolution(lowCalDense, lowCalSolution.amounts, target, 'Light & Filling');
      if (combo) combos.push(combo);
    }
  }

  // Strategy 5: Single food solutions (for simplicity)
  const singleFoodCombos = foods
    .slice(0, 30)
    .map(food => {
      // Calculate optimal portion for single food
      const optimalGrams = Math.max(50, Math.min(500, 
        (target.kcal / food.kcal100g) * 100
      ));
      
      const amounts = new Map([[food.id, optimalGrams]]);
      return buildComboFromSolution([food], amounts, target, 'Simple');
    })
    .filter((c): c is OptimizedCombo => c !== null)
    .sort((a, b) => a.deviation - b.deviation)
    .slice(0, 2);
  
  combos.push(...singleFoodCombos);

  // Deduplicate and return best results
  const uniqueCombos = deduplicateCombos(combos);
  return uniqueCombos
    .sort((a, b) => a.deviation - b.deviation)
    .slice(0, maxCombos);
}

/**
 * Build OptimizedCombo object from LP solution
 */
function buildComboFromSolution(
  foods: FoodItem[],
  amounts: Map<string, number>,
  target: NutritionTarget,
  namePrefix: string
): OptimizedCombo | null {
  // Convert map to array and sort by amount descending
  const portionCandidates: Array<{ food: FoodItem, amountG: number }> = [];
  
  amounts.forEach((amountG, foodId) => {
    const food = foods.find(f => f.id === foodId);
    if (food && amountG >= 20 && amountG <= 500) {
      portionCandidates.push({ food, amountG });
    }
  });

  // Take only top 3 foods by amount
  const topPortions = portionCandidates
    .sort((a, b) => b.amountG - a.amountG)
    .slice(0, 3);

  if (topPortions.length === 0) return null;

  // Calculate portions and totals
  const portions: FoodPortion[] = [];
  let totalKcal = 0;
  let totalProteinG = 0;
  let totalFatG = 0;
  let totalCarbsG = 0;
  let totalFiberG = 0;

  topPortions.forEach(({ food, amountG }) => {
    const portion = calculatePortion(food, amountG);
    portions.push(portion);
    
    totalKcal += portion.kcal;
    totalProteinG += portion.proteinG;
    totalFatG += portion.fatG;
    totalCarbsG += portion.carbsG;
    totalFiberG += portion.fiberG;
  });

  const foodNames = portions.map(p => p.food.name).join(' + ');
  const deviation = calculateDeviation(
    { kcal: totalKcal, proteinG: totalProteinG, fatG: totalFatG, carbsG: totalCarbsG, fiberG: totalFiberG },
    target
  );

  return {
    name: `${namePrefix}: ${foodNames}`,
    foods: portions,
    totalKcal,
    totalProteinG,
    totalFatG,
    totalCarbsG,
    totalFiberG,
    deviation
  };
}

/**
 * Remove duplicate combinations (same foods in different order)
 */
function deduplicateCombos(combos: OptimizedCombo[]): OptimizedCombo[] {
  const seen = new Set<string>();
  return combos.filter(combo => {
    const signature = combo.foods
      .map(f => f.food.id)
      .sort()
      .join(',');
    
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function calculatePortion(food: FoodItem, amountG: number): FoodPortion {
  const multiplier = amountG / 100;
  
  return {
    food,
    amountG: Math.round(amountG),
    kcal: Math.round(food.kcal100g * multiplier),
    proteinG: Math.round(food.protein100g * multiplier * 10) / 10,
    fatG: Math.round(food.fat100g * multiplier * 10) / 10,
    carbsG: Math.round(food.carbs100g * multiplier * 10) / 10,
    fiberG: Math.round(food.fiber100g * multiplier * 10) / 10,
    score: 0
  };
}

/**
 * Main export: Optimize food combinations using Linear Programming
 * Uses javascript-lp-solver to find mathematically optimal portions
 */
export function optimizeFoodCombinations(
  foods: FoodItem[],
  target: NutritionTarget,
  maxCombos: number = 3
): OptimizedCombo[] {
  if (foods.length === 0) {
    return [];
  }

  // Filter out foods with invalid nutrition data
  const validFoods = foods.filter(f => 
    f.kcal100g > 0 && 
    f.protein100g >= 0 && 
    f.fat100g >= 0 && 
    f.carbs100g >= 0
  );

  if (validFoods.length === 0) {
    return [];
  }

  return generateLPCombinations(validFoods, target, maxCombos);
}
