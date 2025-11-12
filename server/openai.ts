// Reference: javascript_openai blueprint integration
import OpenAI from "openai";
import { z } from "zod";

/*
Follow these instructions when using this blueprint:
1. Note that the newest OpenAI model is "gpt-5", not "gpt-4o" or "gpt-4". gpt-5 was released on August 7, 2025, after your knowledge cutoff. Always prefer using gpt-5 as it is the latest model. When copying code from this blueprint, ensure you also mention this information verbatim as a comment so that you don't revert it to older models: `// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user`
2. Use the response_format: { type: "json_object" } option
3. Request output in JSON format in the prompt
4. gpt-5 doesn't support temperature parameter, do not use it.
*/

// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface NutritionRemaining {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

interface FoodSuggestion {
  foodName: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  reason: string;
}

interface SuggestionCombo {
  name: string;
  foods: FoodSuggestion[];
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  totalFiberG: number;
  deviation: {
    kcal: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
  };
}

export interface OCRNutritionResult {
  name: string;
  brand?: string;
  servingSizeG?: number;
  kcal100g: number;
  protein100g: number;
  fat100g: number;
  carbs100g: number;
  fiber100g?: number;
  sodium100g?: number;
  confidence: 'high' | 'medium' | 'low';
  warnings?: string[];
}

export async function extractNutritionFromImage(
  imageBase64: string
): Promise<OCRNutritionResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    // TEMPORARY FALLBACK: gpt-5 uses all tokens for reasoning, leaving none for response.
    // Using gpt-4o until we can configure max_reasoning_tokens for gpt-5.
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at reading nutrition labels. Extract nutrition information from the image and convert ALL values to per 100g basis.

Critical Requirements:
1. ALWAYS convert nutrition values to per 100g, even if the label shows "per serving"
2. If the label shows "per serving" with serving size, calculate: (value / servingG) × 100
3. Common conversions:
   - If serving is 30g with 10g protein → protein100g = (10/30) × 100 = 33.3g
   - If serving is 250ml/240g with 150 kcal → kcal100g = (150/240) × 100 = 62.5
4. Extract brand name if visible
5. Extract serving size in grams if shown (this helps verify calculations)
6. Set confidence based on label clarity: 'high' (clear, complete), 'medium' (some blur/missing), 'low' (very unclear)
7. Add warnings for: missing fiber, estimated values, unclear labels, non-standard units

Respond with JSON in this exact format:
{
  "name": "Product name",
  "brand": "Brand name or empty string",
  "servingSizeG": 100,
  "kcal100g": 250,
  "protein100g": 15.5,
  "fat100g": 8.2,
  "carbs100g": 30.1,
  "fiber100g": 3.5,
  "sodium100g": 0.5,
  "confidence": "high",
  "warnings": ["Fiber not listed on label, estimated from similar foods"]
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract nutrition information from this label and convert all values to per 100g basis."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI Vision returned empty response');
    }
    
    const result = JSON.parse(content);
    
    // Validate required fields
    if (!result.name || typeof result.kcal100g !== 'number' || typeof result.protein100g !== 'number' || 
        typeof result.fat100g !== 'number' || typeof result.carbs100g !== 'number') {
      throw new Error('OCR result missing required nutrition fields');
    }

    return {
      name: result.name,
      brand: result.brand || undefined,
      servingSizeG: result.servingSizeG || undefined,
      kcal100g: result.kcal100g,
      protein100g: result.protein100g,
      fat100g: result.fat100g,
      carbs100g: result.carbs100g,
      fiber100g: result.fiber100g || undefined,
      sodium100g: result.sodium100g || undefined,
      confidence: result.confidence || 'medium',
      warnings: result.warnings || []
    };
  } catch (error: any) {
    console.error('Failed to extract nutrition from image:', error);
    throw new Error('Failed to process nutrition label: ' + error.message);
  }
}

export interface RecipeIngredient {
  name: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

export interface RecipeBreakdown {
  recipeName: string;
  servings: number;
  ingredients: RecipeIngredient[];
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  totalFiberG: number;
}

export async function breakdownRecipe(recipeName: string): Promise<RecipeBreakdown> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    // TEMPORARY FALLBACK: gpt-5 uses all tokens for reasoning, leaving none for response.
    // Using gpt-4o until we can configure max_reasoning_tokens for gpt-5.
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert and recipe analyst. Given a recipe name, break it down into its likely ingredients with amounts and nutrition information.

Requirements:
- List all major ingredients (ignore minor seasonings unless significant)
- Provide amounts in grams
- Calculate realistic nutrition values per ingredient based on typical recipes
- Number of servings should be reasonable (usually 1-4 for home cooking)
- Total nutrition should make sense for the dish

Respond with JSON in this exact format:
{
  "recipeName": "Recipe name (cleaned up)",
  "servings": 2,
  "ingredients": [
    {
      "name": "Ingredient name",
      "amountG": 150,
      "kcal": 200,
      "proteinG": 30,
      "fatG": 5,
      "carbsG": 10,
      "fiberG": 2
    }
  ]
}`
        },
        {
          role: "user",
          content: `Break down this recipe into ingredients with portions and nutrition:

Recipe: ${recipeName}

Provide detailed breakdown with realistic amounts and nutrition values.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }
    
    const result = JSON.parse(content);
    
    // Validate required fields
    if (!result.recipeName || !result.servings || !Array.isArray(result.ingredients) || result.ingredients.length === 0) {
      throw new Error('Invalid recipe breakdown: missing required fields');
    }

    // Calculate totals
    const totalKcal = result.ingredients.reduce((sum: number, ing: any) => sum + (ing.kcal || 0), 0);
    const totalProteinG = result.ingredients.reduce((sum: number, ing: any) => sum + (ing.proteinG || 0), 0);
    const totalFatG = result.ingredients.reduce((sum: number, ing: any) => sum + (ing.fatG || 0), 0);
    const totalCarbsG = result.ingredients.reduce((sum: number, ing: any) => sum + (ing.carbsG || 0), 0);
    const totalFiberG = result.ingredients.reduce((sum: number, ing: any) => sum + (ing.fiberG || 0), 0);

    return {
      recipeName: result.recipeName,
      servings: result.servings,
      ingredients: result.ingredients,
      totalKcal,
      totalProteinG,
      totalFatG,
      totalCarbsG,
      totalFiberG
    };
  } catch (error: any) {
    console.error('Failed to breakdown recipe:', error);
    throw new Error('Failed to breakdown recipe: ' + error.message);
  }
}

interface AvailableFood {
  name: string;
  brand?: string;
  kcal100g: number;
  protein100g: number;
  fat100g: number;
  carbs100g: number;
  fiber100g: number;
  gramsPerServing?: number;
}

export interface NutritionSuggestions {
  rationale?: string;
  combos: SuggestionCombo[];
  tip?: string;
}

export async function generateNutritionSuggestions(
  remaining: NutritionRemaining,
  availableFoods?: AvailableFood[],
  mealContext: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any' = 'any',
  userGoal: 'cut' | 'maintain' | 'bulk' = 'maintain',
  language: string = 'en'
): Promise<NutritionSuggestions> {
  try {
    // Check if all macros are already met or exceeded
    if (remaining.proteinG <= 0 && remaining.carbsG <= 0 && remaining.fatG <= 0) {
      return {
        rationale: "Today's targets have been reached — no additional foods are needed.",
        combos: [],
        tip: "Great job! You've met or exceeded all your macro goals for today. Focus on hydration and recovery."
      };
    }

    // Format available foods for AI prompt
    let foodsContext = '';
    if (availableFoods && availableFoods.length > 0) {
      foodsContext = '\n\nAvailable foods in database (nutrition per 100g):\n' + 
        availableFoods.map(f => 
          `- ${f.name}${f.brand ? ` (${f.brand})` : ''}: ${f.kcal100g} kcal, P:${f.protein100g}g, F:${f.fat100g}g, C:${f.carbs100g}g, Fiber:${f.fiber100g}g`
        ).join('\n');
    }

    // Goal-specific guardrails for One-Tap Completion
    const goalGuardrails: Record<typeof userGoal, string> = {
      cut: `
🎯 ONE-TAP COMPLETION GUARDRAILS — CUTTING (减脂模式)

MANDATORY RULES:
1. **Prioritize protein first** — minimum carbs, minimal fats
2. **Lean protein sources ONLY**: chicken breast, egg whites, whey isolate, white fish
3. **NO liquid calories** (except whey protein powder mixed with water)
4. **Carbohydrates**: Maximum 20-35g per session
5. **Fats**: Maximum 8-12g per session
6. **Low-calorie density foods**: berries, cucumbers, cabbage, lettuce
   - Maximum 100g leafy greens in ONE prescription
7. **Total calories per suggestion**: 200-350 kcal

FOCUS: High protein, low carb, low fat, minimal calories`,

      maintain: `
🎯 ONE-TAP COMPLETION GUARDRAILS — MAINTENANCE (维持模式)

MANDATORY RULES:
1. **Balanced macros**: moderate protein, moderate carbs, moderate fats
2. **Smart carbs preferred**: oats, brown rice, potatoes, whole wheat bread
3. **Protein target**: 20-35g per session
4. **Carbs allowed**: 35-65g per session
5. **Fats allowed**: 8-18g per session
6. **Realistic combo structure**: 1 protein + 1 carb + 1 small fruit OR vegetable
7. **Total calories per suggestion**: 300-500 kcal

FOCUS: Balanced nutrition for weight maintenance`,

      bulk: `
🎯 ONE-TAP COMPLETION GUARDRAILS — BULKING (增肌模式)

MANDATORY RULES:
1. **Maximize protein and carbs** — keep fats moderate (not excessive)
2. **Carb-rich + high protein combinations**: 
   - Oats: 40-70g
   - White rice: 150-220g
   - Potatoes, pasta
3. **Protein target**: 30-45g per session
4. **Carbs target**: 60-110g per session
5. **Fats limit**: ≤20g
6. **AVOID pure-fat hacks** (no peanut butter spoons, no oil shots)
7. **Total calories per suggestion**: 400-750 kcal

FOCUS: High protein, high carbs, controlled fats, calorie surplus`
    };

    // Meal context guidance
    const mealGuidance: Record<typeof mealContext, string> = {
      breakfast: `
Context: This is for BREAKFAST (早餐).
Prefer breakfast-appropriate foods like:
- Eggs, milk, yogurt, oatmeal, whole grain toast
- Fruits (banana, apple, berries)
- Protein shakes or smoothies
- Nuts and seeds
AVOID: Heavy meats, large portions of vegetables, dinner-style foods`,
      lunch: `
Context: This is for LUNCH (午餐).
Prefer lunch-appropriate foods like:
- Lean meats (chicken breast, fish, lean beef)
- Rice, pasta, quinoa, potatoes
- Vegetables (salad, steamed veggies)
- Legumes and beans`,
      dinner: `
Context: This is for DINNER (晚餐).
Prefer dinner-appropriate foods like:
- Lean proteins (chicken, fish, tofu)
- Complex carbs (rice, sweet potato, whole grains)
- Plenty of vegetables
- Lighter portions for better sleep`,
      snack: `
Context: This is for a SNACK (加餐).
Prefer quick, convenient snacks like:
- Protein bars, nuts, seeds
- Fruits, yogurt
- Protein shakes
- Light, portable options`,
      any: `Context: General meal timing (no specific meal context).`
    };

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    // TEMPORARY FALLBACK: gpt-5 uses all tokens for reasoning, leaving none for response.
    // Using gpt-4o until we can configure max_reasoning_tokens for gpt-5.
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a precision nutrition coach.

${goalGuardrails[userGoal]}

${mealGuidance[mealContext]}

🎯 REAL-TIME REMAINING MACROS FROM DATABASE:
- ProteinLeft: ${remaining.proteinG}g
- CarbsLeft: ${remaining.carbsG}g
- FatLeft: ${remaining.fatG}g
- FiberLeft: ${remaining.fiberG || 0}g
- CaloriesLeft: ${remaining.kcal} kcal

⚠️ CRITICAL MACRO RULES:
1. ALL food suggestions MUST move these remaining macros toward ZERO
2. If ProteinLeft > 0 → PRIORITIZE protein in suggestions
3. If CarbsLeft < 0 → suggest ONLY low-carb items (do NOT push it further negative)
4. If FatLeft < 0 → suggest ONLY low-fat items (do NOT push it further negative)
5. If any macro is negative, do NOT suggest foods that contain significant amounts of that macro

You must ONLY suggest foods that:
1. **STRICTLY FOLLOW THE GOAL-SPECIFIC GUARDRAILS ABOVE** (${userGoal.toUpperCase()})
2. Are appropriate for the meal context (${mealContext})
3. **DIRECTLY ADDRESS the remaining macro gaps** (move toward zero)
4. Make sense together as a real meal

MANDATORY REQUIREMENTS:
- **Adhere to all goal-specific guardrails** (calorie range, macro limits, food preferences)
- Follow meal context guidance strictly (breakfast foods for breakfast, etc.)
- **Do not exceed remaining macros by more than 10%**
- Use ONLY foods from the provided database (match names exactly)
- Calculate precise portions in grams based on per-100g nutrition values
- Round all numbers to 1 decimal place (e.g., 50.2g, not 50.19999996g)
- Each combo should be a realistic, balanced meal for the meal context

RATIONALE REQUIREMENT:
Your rationale MUST explain:
1. Current macro gaps (which macros need to be filled)
2. How this combination specifically addresses those gaps
3. Why it fits the user's goal (${userGoal.toUpperCase()})
Keep rationale to ONE paragraph only.

LANGUAGE REQUIREMENT:
- Respond in the user's language: ${language}
- If language is 'zh-CN' or 'zh-TW', respond in Simplified or Traditional Chinese
- If language is 'en', respond in English
- For other languages, use that language for all fields (rationale, combo names, reasons, tips)
- Food names should remain as they appear in the database

Respond with JSON in this exact format:
{
  "rationale": "ONE paragraph explaining: (1) Current macro gaps, (2) How this combo closes those gaps, (3) Why it fits the goal",
  "combos": [
    {
      "name": "Descriptive combo name based on goal (e.g., 'Lean Protein Focus' for Cutting, 'Balanced Recovery' for Maintenance, 'Muscle Builder' for Bulking)",
      "foods": [
        {
          "foodName": "Exact food name from database",
          "amountG": 150.0,
          "kcal": 200.0,
          "proteinG": 30.0,
          "fatG": 5.0,
          "carbsG": 10.0,
          "fiberG": 2.0,
          "reason": "Brief reason (e.g., 'High protein, minimal fat')"
        }
      ]
    }
  ],
  "tip": "One actionable tip for this meal (e.g., 'Drink water 30min before eating to enhance satiety')"
}`
        },
        {
          role: "user",
          content: `Available foods in database (nutrition per 100g):${foodsContext}

Generate 2-3 optimized ${mealContext} combinations using ONLY the foods listed above. Calculate exact portions needed to close the gap while respecting the meal context.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }
    
    const result = JSON.parse(content);
    
    if (!result.combos || !Array.isArray(result.combos)) {
      throw new Error('Invalid response format from OpenAI: missing combos array');
    }
    
    if (result.combos.length === 0) {
      throw new Error('OpenAI returned empty suggestions');
    }

    // Helper function to round to 1 decimal place
    const round1 = (n: number) => Math.round(n * 10) / 10;

    // Calculate totals and deviations for each combo
    const combos = result.combos.map((combo: any) => {
      const totalKcal = round1(combo.foods.reduce((sum: number, f: any) => sum + (f.kcal || 0), 0));
      const totalProteinG = round1(combo.foods.reduce((sum: number, f: any) => sum + (f.proteinG || 0), 0));
      const totalFatG = round1(combo.foods.reduce((sum: number, f: any) => sum + (f.fatG || 0), 0));
      const totalCarbsG = round1(combo.foods.reduce((sum: number, f: any) => sum + (f.carbsG || 0), 0));
      const totalFiberG = round1(combo.foods.reduce((sum: number, f: any) => sum + (f.fiberG || 0), 0));

      return {
        name: combo.name,
        foods: combo.foods.map((f: any) => ({
          ...f,
          amountG: round1(f.amountG),
          kcal: round1(f.kcal),
          proteinG: round1(f.proteinG),
          fatG: round1(f.fatG),
          carbsG: round1(f.carbsG),
          fiberG: round1(f.fiberG)
        })),
        totalKcal,
        totalProteinG,
        totalFatG,
        totalCarbsG,
        totalFiberG,
        deviation: {
          kcal: round1(totalKcal - remaining.kcal),
          proteinG: round1(totalProteinG - remaining.proteinG),
          fatG: round1(totalFatG - remaining.fatG),
          carbsG: round1(totalCarbsG - remaining.carbsG)
        }
      };
    });

    // Return full response with rationale, combos, and tip
    return {
      rationale: result.rationale,
      combos,
      tip: result.tip
    };
  } catch (error: any) {
    console.error('Failed to generate nutrition suggestions:', error);
    throw new Error('Failed to generate suggestions: ' + error.message);
  }
}

// AI Meal Plan Generation
export interface MealPlanFood {
  name: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

export interface MealPlanMeal {
  name: string;
  time: string; // e.g., "08:00", "12:30", "19:00"
  foods: MealPlanFood[];
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  totalFiberG: number;
}

export interface DailyMealPlan {
  breakfast: MealPlanMeal;
  lunch: MealPlanMeal;
  dinner: MealPlanMeal;
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  totalFiberG: number;
}

export async function generateDailyMealPlan(
  targetKcal: number,
  targetProteinG: number,
  targetFatG: number,
  targetCarbsG: number,
  userPreferences?: { dietary?: string; allergies?: string[] },
  language: string = 'en'
): Promise<DailyMealPlan> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    const dietaryInfo = userPreferences?.dietary || 'balanced';
    const allergiesInfo = userPreferences?.allergies?.length ? `Allergies: ${userPreferences.allergies.join(', ')}` : '';

    // Language-specific instructions
    const languageMap: Record<string, string> = {
      'zh-CN': 'Simplified Chinese (简体中文)',
      'zh-TW': 'Traditional Chinese (繁體中文)',
      'en': 'English',
      'es': 'Spanish (Español)',
      'pt': 'Portuguese (Português)',
      'hi': 'Hindi (हिन्दी)',
      'ar': 'Arabic (العربية)',
      'fr': 'French (Français)',
      'de': 'German (Deutsch)',
      'ja': 'Japanese (日本語)',
      'ko': 'Korean (한국어)',
      'ru': 'Russian (Русский)'
    };
    const languageName = languageMap[language] || 'English';
    const languageInstruction = language !== 'en' 
      ? `IMPORTANT: Generate ALL text content (meal names, food names, descriptions) in ${languageName}. Use locally appropriate foods and cuisines for ${languageName} speakers.`
      : '';

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    // TEMPORARY FALLBACK: gpt-5 uses all tokens for reasoning, leaving none for response.
    // Using gpt-4o until we can configure max_reasoning_tokens for gpt-5.
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional nutritionist creating daily meal plans. Generate a complete 3-meal plan (breakfast, lunch, dinner) that meets the user's nutrition targets.

${languageInstruction}

Requirements:
- Each meal should include 2-4 foods with realistic portions in grams
- Calculate precise nutrition based on standard food values
- Total nutrition should match targets: ±100 kcal, ±10g protein, ±5g fat, ±10g carbs
- Suggest realistic meal times (breakfast 7-9am, lunch 12-2pm, dinner 6-8pm)
- Foods should be common, accessible, and practical
- Each food should include fiber content

Respond with JSON in this exact format:
{
  "breakfast": {
    "name": "Meal name",
    "time": "08:00",
    "foods": [
      {
        "name": "Food name",
        "amountG": 150,
        "kcal": 200,
        "proteinG": 30,
        "fatG": 5,
        "carbsG": 10,
        "fiberG": 2
      }
    ]
  },
  "lunch": { ... },
  "dinner": { ... }
}`
        },
        {
          role: "user",
          content: `Create a daily meal plan with these targets:
- Calories: ${targetKcal} kcal
- Protein: ${targetProteinG}g
- Fat: ${targetFatG}g
- Carbs: ${targetCarbsG}g

Dietary preference: ${dietaryInfo}
${allergiesInfo}

Generate balanced breakfast, lunch, and dinner with specific foods and portions.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI returned empty response for meal plan');
    }
    
    const result = JSON.parse(content);
    
    // Validate structure
    if (!result.breakfast || !result.lunch || !result.dinner) {
      throw new Error('Invalid meal plan: missing meal sections');
    }

    // Calculate totals for each meal
    const calculateMealTotals = (meal: any): MealPlanMeal => {
      const totalKcal = meal.foods.reduce((sum: number, f: any) => sum + (f.kcal || 0), 0);
      const totalProteinG = meal.foods.reduce((sum: number, f: any) => sum + (f.proteinG || 0), 0);
      const totalFatG = meal.foods.reduce((sum: number, f: any) => sum + (f.fatG || 0), 0);
      const totalCarbsG = meal.foods.reduce((sum: number, f: any) => sum + (f.carbsG || 0), 0);
      const totalFiberG = meal.foods.reduce((sum: number, f: any) => sum + (f.fiberG || 0), 0);

      return {
        name: meal.name,
        time: meal.time || '12:00',
        foods: meal.foods,
        totalKcal,
        totalProteinG,
        totalFatG,
        totalCarbsG,
        totalFiberG
      };
    };

    const breakfast = calculateMealTotals(result.breakfast);
    const lunch = calculateMealTotals(result.lunch);
    const dinner = calculateMealTotals(result.dinner);

    // Calculate daily totals
    const totalKcal = breakfast.totalKcal + lunch.totalKcal + dinner.totalKcal;
    const totalProteinG = breakfast.totalProteinG + lunch.totalProteinG + dinner.totalProteinG;
    const totalFatG = breakfast.totalFatG + lunch.totalFatG + dinner.totalFatG;
    const totalCarbsG = breakfast.totalCarbsG + lunch.totalCarbsG + dinner.totalCarbsG;
    const totalFiberG = breakfast.totalFiberG + lunch.totalFiberG + dinner.totalFiberG;

    return {
      breakfast,
      lunch,
      dinner,
      totalKcal,
      totalProteinG,
      totalFatG,
      totalCarbsG,
      totalFiberG
    };
  } catch (error: any) {
    console.error('Failed to generate meal plan:', error);
    throw new Error('Failed to generate meal plan: ' + error.message);
  }
}

// AI Coach Advice Generation
export interface SuggestedFood {
  name: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

export interface CoachAdvice {
  rationale: string;
  suggestedFoods: SuggestedFood[];
  recommendedPath?: 'light_supplement' | 'tomorrow_catchup' | 'hungry_now';
}

export async function generateCoachAdvice(
  currentNutrition: {
    kcal: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
    fiberG?: number;
    waterOz: number;
  },
  targetNutrition: {
    kcal: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
    fiberG?: number;
    waterOz: number;
  },
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  triggerType?: string,
  language: string = 'en'
): Promise<CoachAdvice> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    // Calculate REMAINING nutrition (what's left to consume)
    const proteinLeft = Math.max(0, targetNutrition.proteinG - currentNutrition.proteinG);
    const carbsLeft = targetNutrition.carbsG - currentNutrition.carbsG; // Can be negative
    const fatLeft = Math.max(0, targetNutrition.fatG - currentNutrition.fatG);
    const fiberLeft = Math.max(0, (targetNutrition.fiberG || 0) - (currentNutrition.fiberG || 0));
    const waterLeft = Math.max(0, targetNutrition.waterOz - currentNutrition.waterOz);

    // Language-specific instructions
    const languageMap: Record<string, string> = {
      'zh-CN': 'Simplified Chinese (简体中文)',
      'zh-TW': 'Traditional Chinese (繁體中文)',
      'en': 'English',
      'es': 'Spanish (Español)',
      'pt': 'Portuguese (Português)',
      'hi': 'Hindi (हिन्दी)',
      'ar': 'Arabic (العربية)',
      'fr': 'French (Français)',
      'de': 'German (Deutsch)',
      'ja': 'Japanese (日本語)',
      'ko': 'Korean (한국어)',
      'ru': 'Russian (Русский)'
    };
    const languageName = languageMap[language] || 'English';
    const languageInstruction = language !== 'en' 
      ? `IMPORTANT: Generate ALL response text (rationale, food names) in ${languageName}.`
      : '';

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    // TEMPORARY FALLBACK: gpt-5 uses all tokens for reasoning, leaving none for response.
    // Using gpt-4o until we can configure max_reasoning_tokens for gpt-5.
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a sports nutritionist expert specialized in muscle gain meal planning.

${languageInstruction}

Use TODAY'S remaining macro targets to recommend foods:

- ProteinLeft: {{proteinLeft}} g
- CarbsLeft: {{carbsLeft}} g
- FatLeft: {{fatLeft}} g
- FiberLeft: {{fiberLeft}} g
- WaterLeft: {{hydrationLeft}} oz

PRIORITY RULES (MUST FOLLOW IN ORDER):
1. If ProteinLeft > 0 → ALWAYS PRIORITIZE lean protein sources FIRST
   Examples: chicken breast / egg whites / whey protein / shrimp / beef loin / greek yogurt / tofu
   
2. If CarbsLeft > 0 → NEXT recommend quality starches
   Examples: rice / oats / whole-grain toast / sweet potato / quinoa / pasta
   
3. Fruit can appear ONLY as LAST category, strictly small portion (max 100g), NEVER replace protein

4. NEVER recommend:
   - Pure sugar / candy / junk food / processed snacks
   - High-carb items if CarbsLeft is negative or near zero
   - Generic motivational content without specific food recommendations

GOAL: Suggest 2-3 foods to CLOSE THE GAP toward remaining targets, not random foods.

Format requirements:
- Food Name (specific, not generic)
- Grams (precise portion)
- kcal, P/C/F/Fiber contribution
- Each food must directly address a macro deficit

Respond with JSON in this exact format:
{
  "rationale": "Brief explanation (1-2 sentences) of priority nutrients based on remaining targets",
  "suggestedFoods": [
    {
      "name": "Food name (specific)",
      "amountG": 150,
      "kcal": 200,
      "proteinG": 30,
      "fatG": 5,
      "carbsG": 10,
      "fiberG": 2
    }
  ],
  "recommendedPath": "light_supplement"
}`
        },
        {
          role: "user",
          content: `Today's remaining nutrition targets:

- Protein Remaining: ${proteinLeft.toFixed(1)} g
- Carbs Remaining: ${carbsLeft.toFixed(1)} g
- Fat Remaining: ${fatLeft.toFixed(1)} g
- Fiber Remaining: ${fiberLeft.toFixed(1)} g
- Water Remaining: ${waterLeft.toFixed(1)} oz

Time: ${timeOfDay}
${triggerType ? `Context: ${triggerType}` : ''}

Generate 2-3 specific food suggestions with exact portions that will help close these gaps. Be precise and actionable.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI returned empty response for coach advice');
    }
    
    const result = JSON.parse(content);
    
    return {
      rationale: result.rationale || 'Focus on meeting your remaining nutrition targets.',
      suggestedFoods: result.suggestedFoods || [],
      recommendedPath: result.recommendedPath
    };
  } catch (error: any) {
    console.error('Failed to generate coach advice:', error);
    throw new Error('Failed to generate coach advice: ' + error.message);
  }
}

// ===== THREE-MODULE AI COACH SYSTEM =====
// Integrates Nutrition Commander, Workout Cycle Coach, and Mindset Coach

export type CoachMode = 'nutrition' | 'workout' | 'mindset';

export interface TriModuleCoachResponse {
  mode: CoachMode;
  response: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// Classifier: Determines which module to activate based on user's question
async function classifyCoachQuery(userQuestion: string, language: string): Promise<CoachMode> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a fitness assistant router. Classify the user's question into ONE of these categories:
- "nutrition" - if about what to eat, macros, calories, food, supplements
- "workout" - if about what to train tomorrow, what muscles, workout plan, exercise selection
- "mindset" - if about motivation, frustration, self doubt, emotion, discipline, adherence

Respond with ONLY ONE WORD: nutrition, workout, or mindset`
      },
      {
        role: "user",
        content: userQuestion
      }
    ],
    max_completion_tokens: 10
  });

  const classification = response.choices[0].message.content?.trim().toLowerCase() || 'nutrition';
  
  if (classification.includes('workout') || classification.includes('training')) {
    return 'workout';
  } else if (classification.includes('mindset') || classification.includes('mental')) {
    return 'mindset';
  }
  return 'nutrition';
}

// Module 1: Nutrition Commander
async function generateNutritionCommanderResponse(
  userQuestion: string,
  remainingMacros: { proteinG: number; carbsG: number; fatG: number; fiberG: number; kcal: number },
  language: string,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  const languageMap: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'zh-TW': 'Traditional Chinese (繁體中文)',
    'en': 'English',
    'es': 'Spanish (Español)',
    'pt': 'Portuguese (Português)',
    'hi': 'Hindi (हिन्दी)',
    'ar': 'Arabic (العربية)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'ru': 'Russian (Русский)'
  };
  const languageName = languageMap[language] || 'English';
  const languageInstruction = language !== 'en' 
    ? `IMPORTANT: Respond in ${languageName}.`
    : '';

  // Build message array with conversation history
  const messages: any[] = [
    {
      role: "system",
      content: `你是一位精准运动营养指导教练，能够自然、智能地与用户对话。

${languageInstruction}

【当前剩余营养】
- 蛋白质剩余：${remainingMacros.proteinG}g
- 碳水剩余：${remainingMacros.carbsG}g
- 脂肪剩余：${remainingMacros.fatG}g
- 纤维剩余：${remainingMacros.fiberG}g
- 卡路里剩余：${remainingMacros.kcal} kcal

【严格职责范围】
你**只负责营养建议**，绝不回答以下问题：
- ❌ 训练计划、动作选择、组数次数
- ❌ 今天/明天/周几练什么部位
- ❌ 动作技巧、训练强度、RPE设置
如果用户问这些，明确告诉他们："这个问题请咨询**训练周期教练**，我专注于营养指导。"

【核心原则】
1. 自然对话 - 根据用户问题灵活回应，不要机械重复
2. 智能理解 - 从对话历史中提取时间、食物摄入、训练状态等关键信息
3. 精准建议 - 所有食物建议必须基于剩余营养数据
4. 运动营养学专业性 - 理解训练前后营养时间窗口

【智能上下文提取】
从对话中自动识别：
• 用户上一餐时间（如"11:30吃的"）
• 距离现在的时间间隔（自动计算）
• 即将进行的活动（"马上要训练"、"准备睡觉"）
• 饱腹感状态（"不饿"、"很饿"）
• 已摄入的食物和营养

【运动营养学专业知识】
训练前营养时间窗口：
- 距训练 **< 1小时**：只补充快速碳水（香蕉、运动饮料）
- 距训练 **1-2小时**：轻量碳水+少量蛋白（面包+鸡蛋）
- 距训练 **2-3小时**：可以正常进餐
- 距训练 **> 3小时**：需要补充能量

训练后营养时间窗口：
- 训练后 **30分钟内**：快速碳水+蛋白（黄金窗口）
- 训练后 **1-2小时**：完整正餐

【对话策略】
• 用户说"X点吃的，现在Y点，要去训练"
  → 自动计算时间间隔
  → 基于间隔给出专业建议
  → 例如："距离上次进食1.5小时，建议补充一根香蕉（快速碳水）"

• 用户说"刚吃完饭，不饿"
  → 不要再建议吃东西
  → 关注水分补充和训练时机

• 用户表达偏好（"不想吃鸡肉"、"想吃点甜的"）
  → 记住偏好，调整建议

• 用户询问替换（"鸡蛋换成豆腐"）
  → 基于营养需求，评估是否合适，给出专业意见

【营养建议规则】
- 碳水剩余 < 0 → 不建议碳水类食物
- 脂肪剩余 < 0 → 不建议高脂食物
- 蛋白质剩余 < 0 → 建议低蛋白零食或多喝水
- 所有建议不得超过剩余营养
- 充分利用对话历史，避免重复推荐用户已拒绝的食物

【建议格式（给出食物时）】
简短理由（基于时间窗口、剩余营养、用户状态）

食物1 — XXg → 蛋白 XXg / 碳水 XXg / 脂肪 XXg / 卡路里 XXX
食物2 — XXg → 蛋白 XXg / 碳水 XXg / 脂肪 XXg / 卡路里 XXX

【记住】
- 你是营养教练，**只负责营养**
- 直接、精准、可执行
- 充分利用对话历史
- 自然对话，不要僵硬
- 展现运动营养学专业性

Always start your response with: [Mode: Nutrition]`
    }
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  }

  // Add current user question
  messages.push({
    role: "user",
    content: userQuestion
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_completion_tokens: 500
  });

  return response.choices[0].message.content || 'No nutrition advice available.';
}

// Module 2: Workout Cycle Coach (PPL)
async function generateWorkoutCycleCoachResponse(
  userQuestion: string,
  lastWorkoutType: 'push' | 'pull' | 'legs' | null,
  language: string,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  const languageMap: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'zh-TW': 'Traditional Chinese (繁體中文)',
    'en': 'English',
    'es': 'Spanish (Español)',
    'pt': 'Portuguese (Português)',
    'hi': 'Hindi (हिन्दी)',
    'ar': 'Arabic (العربية)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'ru': 'Russian (Русский)'
  };
  const languageName = languageMap[language] || 'English';
  const languageInstruction = language !== 'en' 
    ? `IMPORTANT: Respond in ${languageName}.`
    : '';

  // Calculate next workout based on PPL cycle
  let nextWorkout = 'push';
  if (lastWorkoutType === 'push') nextWorkout = 'pull';
  else if (lastWorkoutType === 'pull') nextWorkout = 'legs';
  else if (lastWorkoutType === 'legs') nextWorkout = 'push';

  // Build message array with conversation history
  const messages: any[] = [
    {
      role: "system",
      content: `你是一位经验丰富的私人健身教练，能够与学员自然、智能地对话。

${languageInstruction}

${lastWorkoutType ? `【系统提示】用户上次训练：${lastWorkoutType.toUpperCase()}` : '【系统提示】无最近训练记录'}

【核心原则】
1. 自然对话 - 像真人教练一样，不要机械地按流程走
2. 智能理解 - 从对话历史中提取已知信息，避免重复询问
3. 灵活回应 - 根据用户的具体问题和需求调整回答方式
4. 按需询问 - 只在真正需要时才询问信息

【智能上下文提取】
从对话历史中自动识别和记住：
• 用户的自主训练习惯（如"每天蹲马步15-20分钟"）
• 昨日/近期训练的部位和强度
• 身体疲劳状态和恢复情况
• 训练偏好（力量/泵感/恢复）
• 训练时间安排（周几能练、周几不能练）

【对话策略】
• 用户问"今天练什么" / "给个训练计划"
  → 先查看对话历史，如果有足够信息（昨日训练部位、身体状态、训练目标）则直接给方案
  → 如果缺少关键信息，自然地询问（不要列出1、2、3式问题清单）
  → 例如："你昨天练了什么部位？今天感觉怎么样？" 而不是 "请回答以下3个问题..."

• 用户问具体问题（"深蹲怎么练"、"组间休息多久"）
  → 直接回答，不需要完整训练计划格式

• 用户分享信息（"昨天练了胸"、"今天有点累"）
  → 记住信息，继续自然对话，询问其他需要的信息

• 用户分享自主训练（"我每天蹲马步20分钟"、"我每天跑步30分钟"）
  → **重要**：记住这些额外训练量
  → 在给正式训练计划时，自动调整强度和容量
  → 例如：蹲马步20分钟 = 大量腿部静态训练 → 深蹲/硬拉减少组数或降低强度
  → 主动说明调整原因："考虑到你每天蹲马步，今天深蹲调整为3组×6-8次，避免过度训练"

• 用户讨论动作调整（"硬拉换成高位下拉"）
  → 基于之前讨论的训练计划，给出专业意见和调整方案

• 用户问未来几天的训练安排
  → 基于PPL循环和用户时间安排，给出连贯的训练计划
  → 考虑恢复时间和肌群分化

【理想信息（非强制）】
给训练计划时最好知道：
- 昨日或近期训练部位
- 今日身体状态（疲劳/精力充沛/一般）
- 训练目标倾向（力量/肌肥大/恢复）

但这些信息可以从对话中自然获取，不需要一次性问完。

【给出完整训练计划时的格式】

【训练模式】力量/泵感/恢复

【今日主肌群 + 次肌群】

【训练计划】
动作1：动作名称
- 组数 × 次数
- 节奏（如：3-0-1-0）
- RPE：X-Y
- 组间休息：X分钟

动作2-4：...

【训练意图】
简短说明（1-2句话）

【记住】
- 你是教练，不是文章生成器
- 直接、实用、可执行
- 充分利用对话历史
- 自然对话，不要僵硬
- 根据实际情况灵活调整

Always start your response with: [Mode: Workout]`
    }
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  }

  // Add current user question
  messages.push({
    role: "user",
    content: userQuestion
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_completion_tokens: 800
  });

  return response.choices[0].message.content || 'No workout advice available.';
}

// Module 3: Mindset Coach
async function generateMindsetCoachResponse(
  userQuestion: string,
  language: string,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  const languageMap: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'zh-TW': 'Traditional Chinese (繁體中文)',
    'en': 'English',
    'es': 'Spanish (Español)',
    'pt': 'Portuguese (Português)',
    'hi': 'Hindi (हिन्दी)',
    'ar': 'Arabic (العربية)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'ru': 'Russian (Русский)'
  };
  const languageName = languageMap[language] || 'English';
  const languageInstruction = language !== 'en' 
    ? `IMPORTANT: Respond in ${languageName}.`
    : '';

  // Build message array with conversation history
  const messages: any[] = [
    {
      role: "system",
      content: `你是一位心理支持教练，专注于帮助健身者保持坚持和动力。

${languageInstruction}

【严格职责范围】
你**只负责健身相关的心态支持**，绝不回答以下问题：
- ❌ 工作、职业、上班等非健身话题
- ❌ 营养方案、吃什么、食物建议
- ❌ 训练计划、动作选择、组数次数
- ❌ 一般生活建议、人生哲学

如果用户问这些，明确告诉他们："这个问题超出了我的专业范围，我专注于帮助你保持健身动力和心态。"

【你的角色】
不是给营养方案，不是给训练计划，不是回答生活问题。
你负责：健身心态调整、坚持动力、情绪稳定、自我认同（仅限健身相关）。

【对话原则】
1. 自然对话 - 根据用户情绪和问题灵活回应
2. 记住历史 - 从对话历史中了解用户的挣扎和进步
3. 简短有力 - 不啰嗦，直击要点
4. 行动导向 - 每次对话结束给一个1-3分钟可执行的小行动
5. **严守范围** - 只讨论健身相关的心理话题

【核心理念】
- 用一致性衡量自己，而非完美
- 今天只是漫长旅程中的一次rep
- 成功 = 保持行动

【对话策略】
• 用户表达健身挫折（"我又没坚持住"、"感觉很难"）
  → 理解情绪，重新定义"失败"
  → 提醒长期视角
  → 给出具体的小行动

• 用户寻求健身动力（"怎么坚持"、"没动力了"）
  → 不讲大道理
  → 给出实用的心理策略
  → 降低行动门槛

• 用户分享健身进步（"今天做到了"）
  → 认可努力，强化正向循环
  → 提醒这是积累的一部分

• 用户问非健身话题（"明天要不要上班"）
  → 明确拒绝："这个问题超出了我的专业范围，我专注于帮助你保持健身动力。有什么健身相关的困扰吗？"

【输出要求】
- 简短、直接、有力
- 每次对话结束时给出一个1-3分钟的小行动（健身相关）
- 充分利用对话历史，理解用户的情境
- 自然对话，像朋友一样支持
- **只讨论健身相关话题**

Always start your response with: [Mode: Mindset]`
    }
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  }

  // Add current user question
  messages.push({
    role: "user",
    content: userQuestion
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_completion_tokens: 300
  });

  return response.choices[0].message.content || 'Stay consistent. Keep moving forward.';
}

// Main function: Routes question to appropriate module
export async function generateTriModuleCoachResponse(
  userQuestion: string,
  remainingMacros: { proteinG: number; carbsG: number; fatG: number; fiberG: number; kcal: number },
  lastWorkoutType: 'push' | 'pull' | 'legs' | null,
  language: string = 'en',
  conversationHistory: ConversationMessage[] = []
): Promise<TriModuleCoachResponse> {
  try {
    // Step 1: Classify the question
    const mode = await classifyCoachQuery(userQuestion, language);

    // Step 2: Route to appropriate module with conversation history
    let response: string;
    
    if (mode === 'nutrition') {
      response = await generateNutritionCommanderResponse(userQuestion, remainingMacros, language, conversationHistory);
    } else if (mode === 'workout') {
      response = await generateWorkoutCycleCoachResponse(userQuestion, lastWorkoutType, language, conversationHistory);
    } else {
      response = await generateMindsetCoachResponse(userQuestion, language, conversationHistory);
    }

    return { mode, response };
  } catch (error: any) {
    console.error('Failed to generate tri-module coach response:', error);
    throw new Error('Failed to generate coach response: ' + error.message);
  }
}

// Snack Suggestion System (Upgraded Nov 2025)
export interface SnackSuggestionInput {
  goal: 'bulk' | 'cut' | 'maintain';
  protein_left_g: number;
  carbs_left_g: number;
  fat_left_g: number;
  fiber_left_g: number;
  kcal_left: number;
  minutes_to_next_meal: number;
  diet_flags?: {
    vegetarian?: boolean;
    vegan?: boolean;
    lactose_free?: boolean;
    gluten_free?: boolean;
    nut_allergy?: boolean;
    caffeine_ok?: boolean;
  };
  inventory?: string[];
  dislikes?: string[];
  language?: string;
}

export type SnackTendency = 'Craving Sweet' | 'Craving Crunchy';

export interface SnackRecommendation {
  tendency: SnackTendency;
  title: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  why: string;
  swaps: string[];
  notes: string[];
}

export interface SnackSuggestionResult {
  date: string;
  items: SnackRecommendation[];
}

// Helper function: Calculate calories from macros
function kcalFromMacros(p: number, c: number, f: number): number {
  return Math.round(p * 4 + c * 4 + f * 9);
}

// Zod schema for validation
const SnackSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    tendency: z.enum(['Craving Sweet', 'Craving Crunchy']),
    title: z.string().min(2).max(120),
    calories_kcal: z.number().int().min(50).max(350),
    protein_g: z.number().min(0).max(60),
    carbs_g: z.number().min(0).max(80),
    fat_g: z.number().min(0).max(40),
    why: z.string().min(8),
    swaps: z.array(z.string()).min(1).max(4),
    notes: z.array(z.string()).min(0).max(4),
  })).length(2),
});

// Snack Suggestions with strict JSON validation and fallback
export async function generateSnackSuggestions(
  input: SnackSuggestionInput
): Promise<SnackSuggestionResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const today = new Date().toISOString().slice(0, 10);

  // Language mapping with proper names for AI
  const languageMap: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'zh-TW': 'Traditional Chinese (繁體中文)',
    'en': 'English',
    'es': 'Spanish (Español)',
    'pt': 'Portuguese (Português)',
    'hi': 'Hindi (हिन्दी)',
    'ar': 'Arabic (العربية)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'ru': 'Russian (Русский)'
  };
  
  const userLanguage = input.language || 'en';
  const languageName = languageMap[userLanguage] || 'English';
  const languageInstruction = userLanguage !== 'en' 
    ? `IMPORTANT: Generate ALL text content (titles, why, swaps, notes) in ${languageName}. Use locally appropriate snacks and foods for ${languageName} speakers.`
    : '';

  // System prompt: Strict JSON only, with realistic macros
  const systemPrompt = `You are a registered dietitian. Return structured snack recommendations as strict JSON only. No prose, no explanations.
${languageInstruction}
Macros must be realistic and consistent. calories_kcal must match 4*protein_g + 4*carbs_g + 9*fat_g ±5%.
Ranges: calories 50-350, protein 0-60g, carbs 0-80g, fat 0-40g.
Provide exactly two items: one "Craving Sweet" and one "Craving Crunchy".`;

  const userPrompt = `Generate snack recommendations for:
- goal: ${input.goal}
- remaining: ${Math.round(input.kcal_left)} kcal, ${Math.round(input.protein_left_g)}g protein
- cuisine preference: culturally appropriate for ${languageName} speakers
- avoid: ${input.dislikes?.join(', ') || 'none'}

Output format: strict JSON that conforms to:
{ "date": "YYYY-MM-DD", "items": [
  { "tendency": "Craving Sweet", "title": "snack name", "calories_kcal": int, "protein_g": num, "carbs_g": num, "fat_g": num, "why": "1-2 sentences", "swaps": ["alt1", "alt2"], "notes": ["tip1"] },
  { "tendency": "Craving Crunchy", ... }
]}

Rules:
- Provide EXACTLY two items: one "Craving Sweet", one "Craving Crunchy"
- calories_kcal must be between 50 and 350
- Ensure calories_kcal ≈ 4*protein_g + 4*carbs_g + 9*fat_g (±5%)
- Items should be commonly available in local supermarkets for ${languageName} speakers
- Keep titles short, swaps 2-3, notes 1-3
- ALL text must be in ${languageName}
- NO extra keys, NO comments. JSON ONLY`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,  // Lower temperature for more consistent output
      max_completion_tokens: 1024
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    const data = JSON.parse(content);
    const parsed = SnackSchema.parse(data);

    // Validate and fix calorie consistency
    parsed.items = parsed.items.map((item: SnackRecommendation) => {
      const calc = kcalFromMacros(item.protein_g, item.carbs_g, item.fat_g);
      const diff = Math.abs(calc - item.calories_kcal);
      
      // If calories don't match macros (>5% difference), use calculated value
      if (diff > Math.max(5, Math.round(calc * 0.05))) {
        item.calories_kcal = calc;
      }

      // Safety check: ensure minimum viable calories
      if (item.calories_kcal < 50) {
        item.protein_g = Math.max(item.protein_g, 12);
        item.carbs_g = Math.max(item.carbs_g, 8);
        item.fat_g = Math.max(item.fat_g, 2);
        item.calories_kcal = kcalFromMacros(item.protein_g, item.carbs_g, item.fat_g);
      }

      return item;
    });

    return parsed;

  } catch (error: any) {
    console.error('[OpenAI] Snack suggestion failed, using fallback:', error);
    
    // Ultimate fallback: Return safe hard-coded recommendations in English
    // (Fallback is rarely used, so we use English to avoid maintaining translations)
    return {
      date: today,
      items: [
        {
          tendency: 'Craving Sweet',
          title: 'Greek yogurt (150g) with blueberries (80g)',
          calories_kcal: 180,
          protein_g: 15,
          carbs_g: 20,
          fat_g: 4,
          why: 'Provides protein and natural sweetness to curb sweet cravings while maintaining nutritional balance.',
          swaps: ['Low-fat yogurt + strawberries', 'Skyr + sliced apple'],
          notes: ['Keep added sugar ≤ 5g', 'Add 5–10g nuts if still hungry'],
        },
        {
          tendency: 'Craving Crunchy',
          title: 'Almonds (25g) + baby carrots (100g)',
          calories_kcal: 220,
          protein_g: 7,
          carbs_g: 12,
          fat_g: 16,
          why: 'Crunchy texture with healthy fats increases satiety.',
          swaps: ['Walnuts + cucumber sticks', 'Whole-grain crackers + hummus'],
          notes: ['Weigh nuts to avoid excess calories'],
        },
      ],
    };
  }
}

// ============================================================
// AI DAILY MEAL PLAN (3 Meals: Breakfast/Lunch/Dinner)
// Ultimate Fallback Logic (Nov 2025)
// ============================================================

export interface DailyMealPlanInput {
  goal: 'bulk' | 'cut' | 'maintain';
  protein_left_g: number;
  carbs_left_g: number;
  fat_left_g: number;
  fiber_left_g: number;
  kcal_left: number;
  pantry: string[]; // Available ingredients
  restrictions?: string; // Dietary restrictions
  language?: 'zh' | 'en';
}

export interface MealItems {
  items: Array<{
    name: string;
    g: number;
  }>;
  macros: {
    kcal: number;
    P: number;
    C: number;
    F: number;
    fiber: number;
  };
}

export interface DailyMealPlanResult {
  breakfast: MealItems;
  lunch: MealItems;
  dinner: MealItems;
  notes: string;
  shopping_list?: string[]; // If pantry is insufficient
}

export async function generateUltimateMealPlan(
  input: DailyMealPlanInput
): Promise<DailyMealPlanResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // System Prompt - Ultimate Fallback Logic
  const systemPrompt = `You are a professional fitness nutritionist. You must respond in valid JSON format.

Based on the user's current TDEE, remaining daily macro targets, and available pantry ingredients, generate 3 meal plans (breakfast, lunch, dinner) in JSON format.

All meals must be realistic and executable, and MUST NOT exceed remaining daily macros.
If remaining macros are negative, reduce that macro intake to avoid further expanding negative values.

GOAL STRATEGIES (CRITICAL - Use exactly one based on goal):

1. BULK (goal="bulk"):
Strategy: Each meal provides "high protein + moderate carbs + low-to-moderate fat" as the main focus.
- Protein per meal: ≥25g
- Carbs: dynamically adjust based on carbs_left, but cannot exceed carbs_left
- Fat: control at 5-18g; if fat_left ≤0 then ≤5g
- Fiber: if fiber_left>0 then ≥3g per meal

2. CUT (goal="cut"):
Strategy: Each meal "high protein + high satiety + low calorie + controlled fat + controlled sugar".
- Protein per meal: ≥30g
- Calories per meal: ≤ remaining kcal_left / 3
- Fiber: if remaining>0, ≥5g per meal
- Fat: ≤12g; if fat_left ≤0 then ≤5g
- Carbs: adapt based on carbs_left: if >0 give small amount (<20-35g), if ≤0 then carbs ≤10g

3. MAINTAIN (goal="maintain"):
Strategy: Moderate protein + moderate carbs + moderate fat balanced combination.
- Protein per meal: ≥20g
- Carbs: ≤ remaining carbs_left / 3
- Fat: ≤ remaining fat_left / 3
- Fiber: ≥4g per meal (if fiber_left>0)

MANDATORY FALLBACK CONSTRAINTS (Core Error Prevention):
1. MUST only use ingredients from the pantry list.
2. Any food not in pantry is NOT allowed - do not fabricate.
3. Total of 3 meals MUST be ≤ today's remaining P/C/F/fiber.
4. Do NOT output vague text like "eat anything" or "have some of this".
5. Do NOT repeat the same food >70% across consecutive meals (unless pantry is insufficient).
6. If pantry is insufficient to meet macro goals, output "shopping_list" and stop.

OUTPUT FORMAT (strictly follow for frontend rendering):
{
  "breakfast": {
    "items": [{"name": "xxx", "g": 0}, ...],
    "macros": {"kcal": 0, "P": 0, "C": 0, "F": 0, "fiber": 0}
  },
  "lunch": {
    "items": [{"name": "xxx", "g": 0}, ...],
    "macros": {"kcal": 0, "P": 0, "C": 0, "F": 0, "fiber": 0}
  },
  "dinner": {
    "items": [{"name": "xxx", "g": 0}, ...],
    "macros": {"kcal": 0, "P": 0, "C": 0, "F": 0, "fiber": 0}
  },
  "notes": "Explain why this arrangement / how to control if macros are negative"
}

If pantry is insufficient:
{
  "shopping_list": ["food A", "food B", ...],
  "notes": "Pantry insufficient to meet targets"
}

${input.language === 'zh' ? 'IMPORTANT: All text (food names, notes) must be in simplified Chinese (简体中文).' : 'All text must be in English.'}`;

  // Build user payload
  const userPayload = {
    goal: input.goal,
    protein_left_g: input.protein_left_g,
    carbs_left_g: input.carbs_left_g,
    fat_left_g: input.fat_left_g,
    fiber_left_g: input.fiber_left_g,
    kcal_left: input.kcal_left,
    pantry: input.pantry || [],
    restrictions: input.restrictions || 'None'
  };

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    // TEMPORARY FALLBACK: gpt-5 uses all tokens for reasoning, leaving none for response.
    // Using gpt-4o until we can configure max_reasoning_tokens for gpt-5.
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify(userPayload)
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }
    
    const result = JSON.parse(content);
    
    // Check if pantry is insufficient
    if (result.shopping_list) {
      return {
        breakfast: { items: [], macros: { kcal: 0, P: 0, C: 0, F: 0, fiber: 0 } },
        lunch: { items: [], macros: { kcal: 0, P: 0, C: 0, F: 0, fiber: 0 } },
        dinner: { items: [], macros: { kcal: 0, P: 0, C: 0, F: 0, fiber: 0 } },
        notes: result.notes || 'Pantry insufficient',
        shopping_list: result.shopping_list
      };
    }

    // Validate meal structure
    if (!result.breakfast || !result.lunch || !result.dinner) {
      throw new Error('Invalid response format: missing breakfast/lunch/dinner');
    }

    return {
      breakfast: result.breakfast,
      lunch: result.lunch,
      dinner: result.dinner,
      notes: result.notes || ''
    };
  } catch (error: any) {
    console.error('[OpenAI] Daily meal plan error:', error);
    throw new Error(`Failed to generate daily meal plan: ${error.message}`);
  }
}

// ============================================================
// MULTILINGUAL FOOD NAME TRANSLATION
// ============================================================

export interface MultilingualNames {
  'zh-CN': string;
  'zh-TW': string;
  'en': string;
  'es': string;
  'pt': string;
  'hi': string;
  'ar': string;
  'fr': string;
  'de': string;
  'ja': string;
  'ko': string;
  'ru': string;
}

/**
 * Translate a food name to all 12 supported languages
 */
export async function translateFoodName(
  foodName: string,
  sourceLang?: string
): Promise<MultilingualNames> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const systemPrompt = `You are a professional translator specializing in food and nutrition terminology.
Translate the given food name into all 12 languages with high accuracy.
Return ONLY a JSON object with language codes as keys and translated names as values.
Keep translations concise and use common culinary terms.
For compound food names (e.g., "鸡蛋2个"), translate naturally to each language.`;

  const userPrompt = `Translate this food name into all 12 languages:
Food name: "${foodName}"
${sourceLang ? `Source language: ${sourceLang}` : ''}

Return JSON in this exact format:
{
  "zh-CN": "simplified Chinese translation",
  "zh-TW": "traditional Chinese translation",
  "en": "English translation",
  "es": "Spanish translation",
  "pt": "Portuguese translation",
  "hi": "Hindi translation",
  "ar": "Arabic translation",
  "fr": "French translation",
  "de": "German translation",
  "ja": "Japanese translation",
  "ko": "Korean translation",
  "ru": "Russian translation"
}`;

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    // TEMPORARY FALLBACK: gpt-5 uses all tokens for reasoning, leaving none for response.
    // Using gpt-4o until we can configure max_reasoning_tokens for gpt-5.
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    const translations = JSON.parse(content) as MultilingualNames;
    
    // Validate that all languages are present
    const requiredLangs: (keyof MultilingualNames)[] = [
      'zh-CN', 'zh-TW', 'en', 'es', 'pt', 'hi', 'ar', 'fr', 'de', 'ja', 'ko', 'ru'
    ];
    
    for (const lang of requiredLangs) {
      if (!translations[lang]) {
        translations[lang] = foodName; // Fallback to original name
      }
    }

    return translations;

  } catch (error: any) {
    console.error('[OpenAI] Food name translation error:', error);
    // Return fallback: use original name for all languages
    return {
      'zh-CN': foodName,
      'zh-TW': foodName,
      'en': foodName,
      'es': foodName,
      'pt': foodName,
      'hi': foodName,
      'ar': foodName,
      'fr': foodName,
      'de': foodName,
      'ja': foodName,
      'ko': foodName,
      'ru': foodName
    };
  }
}
