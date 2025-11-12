import { z } from 'zod';

const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// USDA API response schemas
const usdaNutrientSchema = z.object({
  nutrientId: z.number(),
  nutrientName: z.string(),
  nutrientNumber: z.string().optional(),
  unitName: z.string(),
  value: z.number()
});

// Nutrient schema for food details response (different structure than search)
const usdaDetailNutrientSchema = z.object({
  nutrient: z.object({
    id: z.number(),
    number: z.string().optional(),
    name: z.string(),
    rank: z.number().optional(),
    unitName: z.string()
  }),
  amount: z.number().optional()
});

// Food nutrient schema for search response
const usdaFoodNutrientSchema = z.object({
  nutrientId: z.number(),
  nutrientName: z.string(),
  nutrientNumber: z.string().optional(),
  unitName: z.string(),
  value: z.number().optional()
});

const usdaFoodSchema = z.object({
  fdcId: z.number(),
  description: z.string(),
  dataType: z.string().optional(),
  brandOwner: z.string().optional(),
  gtinUpc: z.string().optional(),
  servingSize: z.number().optional(),
  servingSizeUnit: z.string().optional(),
  householdServingFullText: z.string().optional(),
  foodNutrients: z.union([
    z.array(usdaFoodNutrientSchema),
    z.array(usdaDetailNutrientSchema)
  ]).optional()
});

const usdaSearchResponseSchema = z.object({
  totalHits: z.number(),
  currentPage: z.number(),
  totalPages: z.number(),
  foods: z.array(usdaFoodSchema)
});

export type USDAFood = z.infer<typeof usdaFoodSchema>;
export type USDASearchResponse = z.infer<typeof usdaSearchResponseSchema>;

// Nutrient ID mapping (USDA nutrient IDs to our schema fields)
const NUTRIENT_MAP: Record<number, string> = {
  1008: 'kcal',        // Energy (kcal)
  1003: 'protein',     // Protein
  1004: 'fat',         // Total lipid (fat)
  1005: 'carbs',       // Carbohydrate, by difference
  1079: 'fiber',       // Fiber, total dietary
  1093: 'sodium',      // Sodium, Na
  1106: 'vitaminA',    // Vitamin A, RAE
  1162: 'vitaminC',    // Vitamin C, total ascorbic acid
  1114: 'vitaminD',    // Vitamin D (D2 + D3)
  1109: 'vitaminE',    // Vitamin E (alpha-tocopherol)
  1185: 'vitaminK',    // Vitamin K (phylloquinone)
  1178: 'vitaminB12',  // Vitamin B-12
  1087: 'calcium',     // Calcium, Ca
  1089: 'iron',        // Iron, Fe
  1090: 'magnesium',   // Magnesium, Mg
  1095: 'zinc',        // Zinc, Zn
  1092: 'potassium'    // Potassium, K
};

/**
 * Search USDA FoodData Central database
 */
export async function searchUSDAFoods(
  query: string,
  pageSize: number = 25,
  pageNumber: number = 1
): Promise<USDASearchResponse> {
  try {
    const url = new URL(`${USDA_BASE_URL}/foods/search`);
    url.searchParams.append('api_key', USDA_API_KEY);
    url.searchParams.append('query', query);
    url.searchParams.append('pageSize', pageSize.toString());
    url.searchParams.append('pageNumber', pageNumber.toString());
    url.searchParams.append('dataType', 'Foundation,SR Legacy,Branded');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('USDA API key is invalid or rate limit exceeded');
      }
      throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return usdaSearchResponseSchema.parse(data);
  } catch (error: any) {
    console.error('USDA search error:', error);
    throw new Error(`Failed to search USDA database: ${error.message}`);
  }
}

/**
 * Get detailed nutrition information for a specific USDA food item
 */
export async function getUSDAFoodDetails(fdcId: number): Promise<USDAFood> {
  try {
    const url = new URL(`${USDA_BASE_URL}/food/${fdcId}`);
    url.searchParams.append('api_key', USDA_API_KEY);
    url.searchParams.append('format', 'full');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('USDA API key is invalid or rate limit exceeded');
      }
      throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return usdaFoodSchema.parse(data);
  } catch (error: any) {
    console.error('USDA food details error:', error);
    throw new Error(`Failed to get USDA food details: ${error.message}`);
  }
}

/**
 * Convert USDA food data to our FoodItem format (per 100g basis)
 */
export function convertUSDAToFoodItem(usdaFood: USDAFood) {
  const nutrients = usdaFood.foodNutrients || [];
  
  // Extract serving size in grams
  let servingSizeG = usdaFood.servingSize || 100;
  if (usdaFood.servingSizeUnit?.toLowerCase() === 'ml') {
    // Assume 1ml = 1g for liquids (approximation)
    servingSizeG = usdaFood.servingSize || 100;
  }
  
  // Create nutrient map from USDA data
  const nutrientValues: Record<string, number> = {};
  
  for (const nutrient of nutrients) {
    // Handle both search response format and detail response format
    let nutrientId: number | undefined;
    let value: number | undefined;
    
    if ('nutrientId' in nutrient) {
      // Search response format
      nutrientId = nutrient.nutrientId;
      value = nutrient.value;
    } else if ('nutrient' in nutrient) {
      // Detail response format
      nutrientId = nutrient.nutrient.id;
      value = nutrient.amount;
    }
    
    if (nutrientId !== undefined) {
      const fieldName = NUTRIENT_MAP[nutrientId];
      if (fieldName && value !== undefined) {
        nutrientValues[fieldName] = value;
      }
    }
  }
  
  // Convert to per 100g if needed
  const conversionFactor = 100 / servingSizeG;
  
  const converted = {
    name: usdaFood.description,
    brand: usdaFood.brandOwner || undefined,
    source: 'usda' as const,
    externalId: `usda_${usdaFood.fdcId}`,
    grams_per_serving: servingSizeG !== 100 ? servingSizeG : undefined,
    
    // Macronutrients (per 100g)
    kcal100g: Math.round((nutrientValues.kcal || 0) * conversionFactor),
    protein100g: parseFloat(((nutrientValues.protein || 0) * conversionFactor).toFixed(1)),
    fat100g: parseFloat(((nutrientValues.fat || 0) * conversionFactor).toFixed(1)),
    carbs100g: parseFloat(((nutrientValues.carbs || 0) * conversionFactor).toFixed(1)),
    fiber100g: parseFloat(((nutrientValues.fiber || 0) * conversionFactor).toFixed(1)),
    sodium100g: parseFloat(((nutrientValues.sodium || 0) * conversionFactor / 1000).toFixed(3)), // mg to g
    
    // Micronutrients (per 100g)
    vitaminAMcg100g: parseFloat(((nutrientValues.vitaminA || 0) * conversionFactor).toFixed(1)),
    vitaminCMg100g: parseFloat(((nutrientValues.vitaminC || 0) * conversionFactor).toFixed(1)),
    vitaminDMcg100g: parseFloat(((nutrientValues.vitaminD || 0) * conversionFactor).toFixed(1)),
    vitaminEMg100g: parseFloat(((nutrientValues.vitaminE || 0) * conversionFactor).toFixed(1)),
    vitaminKMcg100g: parseFloat(((nutrientValues.vitaminK || 0) * conversionFactor).toFixed(1)),
    vitaminB12Mcg100g: parseFloat(((nutrientValues.vitaminB12 || 0) * conversionFactor).toFixed(1)),
    calciumMg100g: parseFloat(((nutrientValues.calcium || 0) * conversionFactor).toFixed(1)),
    ironMg100g: parseFloat(((nutrientValues.iron || 0) * conversionFactor).toFixed(1)),
    magnesiumMg100g: parseFloat(((nutrientValues.magnesium || 0) * conversionFactor).toFixed(1)),
    zincMg100g: parseFloat(((nutrientValues.zinc || 0) * conversionFactor).toFixed(1)),
    potassiumMg100g: parseFloat(((nutrientValues.potassium || 0) * conversionFactor).toFixed(1))
  };
  
  return converted;
}
