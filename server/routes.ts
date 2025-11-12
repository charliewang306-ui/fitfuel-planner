import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { 
  insertUserProfileSchema,
  insertFoodItemSchema,
  insertFoodLogSchema,
  insertWaterLogSchema,
  insertCheckinWeightSchema,
  insertMealPlanSchema,
  insertMealPlanItemSchema,
  type FoodItem,
  type InsertFoodLog
} from "@shared/schema";
import { calculateDailyTargets, calcNutritionPerIntake, toGrams } from "@shared/utils";
import { generateNutritionSuggestions, generateDailyMealPlan, generateCoachAdvice, generateTriModuleCoachResponse } from "./openai";
import { searchUSDAFoods, getUSDAFoodDetails, convertUSDAToFoodItem } from "./usda";
import { runAutoCompleteCheck } from "./auto-complete";
import Stripe from "stripe";

// Initialize Stripe (optional - gracefully degrades if not configured)
const STRIPE_ENABLED = !!process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_ENABLED ? new Stripe(process.env.STRIPE_SECRET_KEY!) : null;

// Simple in-memory daily usage tracking for free users (V1 implementation)
// Key format: `${userId}_${date}` -> usage count
// In production, this should be a proper database table
const aiUsageCache = new Map<string, number>();

// Reset daily usage cache at midnight (simple cron-like implementation)
const resetDailyUsage = () => {
  aiUsageCache.clear();
};
setInterval(resetDailyUsage, 24 * 60 * 60 * 1000); // Reset every 24 hours

// Helper: Get localized food name based on user language
function getLocalizedFoodName(foodName: string, foodNames: any, language: string): string {
  if (!foodNames || typeof foodNames !== 'object') {
    return foodName; // Fallback to original name
  }
  
  // Try to get the name in user's language
  if (foodNames[language]) {
    return foodNames[language];
  }
  
  // Fallback chain: user language -> English -> original name
  return foodNames['en'] || foodName;
}

// Helper: Translate text using OpenAI (for meal names and descriptions)
async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || targetLang === 'en') return text;
  
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const languageMap: Record<string, string> = {
      'zh-CN': 'Simplified Chinese',
      'zh-TW': 'Traditional Chinese',
      'en': 'English',
      'es': 'Spanish',
      'pt': 'Portuguese',
      'hi': 'Hindi',
      'ar': 'Arabic',
      'fr': 'French',
      'de': 'German',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ru': 'Russian'
    };
    
    const targetLanguage = languageMap[targetLang] || 'English';
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Translate this meal name to ${targetLanguage}. Return ONLY the translation, nothing else:\n\n"${text}"`
      }],
      max_completion_tokens: 50,
      temperature: 0.3
    });
    
    const translation = response.choices[0].message.content?.trim();
    return translation || text;
  } catch (error) {
    console.error('[Translation] Error translating text:', error);
    return text; // Fallback to original
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper: Get or create demo user (for V1, no auth)
  const getDemoUser = async () => {
    const DEMO_USER_ID = 'demo-user-1';
    let user = await storage.getUserProfile(DEMO_USER_ID);
    
    if (!user) {
      // Create default demo user with explicit ID using raw insert
      // We bypass the insert schema here to set a stable ID for the demo user
      const { db } = await import('./db');
      const { userProfiles } = await import('@shared/schema');
      
      const [created] = await db
        .insert(userProfiles)
        .values({
          id: DEMO_USER_ID,
          weightLb: 160,
          heightCm: 170,
          goal: 'maintain',
          activity: 'moderate',
          wakeTime: '07:00',
          sleepTime: '23:00',
          unitPref: 'g',
          decimalPlaces: 1,
          role: 'admin', // Demo user is admin for testing
          subscriptionTier: 'pro', // Demo user has pro for testing
          subscriptionStatus: 'active'
        })
        .returning();
      
      user = created;
    }
    
    return user;
  };

  // Admin middleware: Check if user is admin or staff
  const requireAdmin = (user: any): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'staff';
  };

  // Helper: Record audit log
  const recordAudit = async (actorId: string, action: string, targetId?: string, targetType?: string, metadata?: any, req?: any) => {
    const { db } = await import('./db');
    const { auditLog } = await import('@shared/schema');
    
    await db.insert(auditLog).values({
      actorId,
      action,
      targetId: targetId || null,
      targetType: targetType || null,
      metadata: metadata || null,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      userAgent: req?.headers?.['user-agent'] || null
    });
  };

  // Helper: Check if user has PRO subscription
  const isPro = (user: any): boolean => {
    if (!user) return false;
    
    const status = user.subscriptionStatus;
    const tier = user.subscriptionTier;
    const endsAt = user.subscriptionEndsAt;
    
    // Check if subscription is active or trialing AND tier is pro
    if (status === 'active' || status === 'trialing') {
      // For backward compatibility, assume pro if no tier specified
      if (!tier || tier === 'pro') {
        // For trialing, check if trial hasn't ended
        if (status === 'trialing' && endsAt) {
          const now = new Date();
          const endDate = new Date(endsAt);
          return now < endDate;
        }
        return true;
      }
    }
    
    return false;
  };

  // Helper: Check if user has PLUS or PRO subscription
  const isPlus = (user: any): boolean => {
    if (!user) return false;
    
    const status = user.subscriptionStatus;
    const tier = user.subscriptionTier;
    const endsAt = user.subscriptionEndsAt;
    
    // Check if subscription is active or trialing AND tier is plus or pro
    if (status === 'active' || status === 'trialing') {
      // Check tier (default to pro for backward compatibility)
      if (!tier || tier === 'plus' || tier === 'pro') {
        // For trialing, check if trial hasn't ended
        if (status === 'trialing' && endsAt) {
          const now = new Date();
          const endDate = new Date(endsAt);
          return now < endDate;
        }
        return true;
      }
    }
    
    return false;
  };

  // ============================================================
  // HEALTH CHECK / DIAGNOSTICS
  // ============================================================
  
  // Health check endpoint for debugging API issues
  app.get("/api/ping", (req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // ============================================================
  // USER PROFILE
  // ============================================================
  
  app.get("/api/profile", async (req, res) => {
    try {
      const user = await getDemoUser();
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/profile", async (req, res) => {
    try {
      const data = insertUserProfileSchema.parse(req.body);
      const user = await getDemoUser();
      const updated = await storage.updateUserProfile(user.id, data);
      
      if (!updated) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }
      
      // Recalculate today's targets with new profile data
      const today = new Date().toISOString().split('T')[0];
      const calculated = calculateDailyTargets({
        weightLb: updated.weightLb,
        heightCm: updated.heightCm,
        age: updated.age,
        sex: updated.sex,
        goal: updated.goal,
        activity: updated.activity
      });
      
      // Delete old target and create new one
      await storage.createDailyTarget({
        userId: user.id,
        date: today,
        ...calculated
      });
      
      // Regenerate today's reminders with updated settings
      // Import scheduler functions
      const { generateDailyReminders: generateReminders } = await import('./scheduler');
      
      // Delete existing reminders for today
      await storage.deleteRemindersByDate(user.id, today);
      
      // Build config with all user settings
      const config = {
        wakeTime: updated.wakeTime || '07:00',
        sleepTime: updated.sleepTime || '23:00',
        preSleepCutoffHours: updated.preSleepCutoffHours || 2.5,
        nightModeBufferMin: updated.nightModeBufferMin || 90,
        lastReminderBufferMin: updated.lastReminderBufferMin || 60,
        allowLightProteinAfterCutoff: updated.allowLightProteinAfterCutoff !== false,
        autoRescheduleMeals: updated.autoRescheduleMeals !== false,
        minGapBetweenMealsMin: updated.minGapBetweenMealsMin || 120,
        snacksCount: updated.snacksCount || 0,
        waterIntervalHours: updated.waterIntervalHours || 2.5,
        quietPeriodEnabled: updated.quietPeriodEnabled || false,
        waterRemindersPerDay: updated.waterRemindersPerDay || 8,
      };
      
      // Generate new reminders
      const reminders = generateReminders(config);
      
      // Insert new reminders into database
      for (const reminder of reminders) {
        await storage.createReminder({
          userId: user.id,
          type: reminder.type,
          scheduledTime: reminder.scheduledTime,
          date: today,
          status: 'pending',
        });
      }
      
      console.log(`[Profile Update] Regenerated ${reminders.length} reminders for ${user.id} (Water: ${config.waterRemindersPerDay}/day)`);
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // DAILY TARGETS
  // ============================================================
  
  app.get("/api/targets/today", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      
      // Try to get existing target
      let target = await storage.getDailyTarget(user.id, today);
      
      // If doesn't exist, calculate and create
      if (!target) {
        const calculated = calculateDailyTargets({
          weightLb: user.weightLb,
          heightCm: user.heightCm,
          age: user.age,
          sex: user.sex,
          goal: user.goal,
          activity: user.activity
        });
        
        target = await storage.createDailyTarget({
          userId: user.id,
          date: today,
          ...calculated
        });
      }
      
      res.json(target);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // FOOD ITEMS
  // ============================================================
  
  app.get("/api/foods/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const language = (req.query.lang as string) || 'en';
      
      let foods;
      if (!query) {
        foods = await storage.getAllFoodItems();
      } else {
        foods = await storage.searchFoodItems(query);
      }
      
      // Localize food names based on user language
      const localizedFoods = foods.map((food: any) => ({
        ...food,
        name: getLocalizedFoodName(food.name, food.names, language)
      }));
      
      res.json(localizedFoods);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/foods", async (req, res) => {
    try {
      const user = await getDemoUser();
      const data = insertFoodItemSchema.parse(req.body);
      const food = await storage.createFoodItem({
        ...data,
        contributedBy: user.id,
        source: 'user',
        isPublic: true,
        isVerified: false
      });
      res.json(food);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Contribute food to public database
  app.post("/api/foods/contribute", async (req, res) => {
    try {
      const user = await getDemoUser();
      const data = insertFoodItemSchema.parse(req.body);
      
      const food = await storage.createFoodItem({
        ...data,
        contributedBy: user.id,
        source: 'user',
        isPublic: true,
        isVerified: false
      });
      
      res.json(food);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get my contributions (must be before /:id route)
  app.get("/api/foods/my-contributions", async (req, res) => {
    try {
      const user = await getDemoUser();
      const contributions = await storage.getUserContributions(user.id);
      res.json(contributions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get protein powder templates (must be before /:id route)
  app.get("/api/foods/templates", async (req, res) => {
    try {
      const category = req.query.category as string;
      
      // Get all template foods
      const { db } = await import('./db');
      const { foodItems } = await import('@shared/schema');
      const { eq, and, sql } = await import('drizzle-orm');
      
      // Build where conditions
      const conditions = [eq(foodItems.source, 'template')];
      
      // Filter by category tag if provided
      if (category) {
        conditions.push(sql`${category} = ANY(${foodItems.tags})`);
      }
      
      const templates = await db
        .select()
        .from(foodItems)
        .where(and(...conditions));
      
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // USDA FOOD DATABASE
  // ============================================================
  
  // Search USDA FoodData Central (PRO feature)
  app.get("/api/usda/search", async (req, res) => {
    try {
      const user = await getDemoUser();
      
      if (!isPro(user)) {
        res.status(403).json({ error: 'USDA food database requires PRO subscription' });
        return;
      }
      
      const query = req.query.q as string;
      const pageSize = parseInt(req.query.pageSize as string) || 25;
      const pageNumber = parseInt(req.query.pageNumber as string) || 1;
      
      if (!query) {
        res.status(400).json({ error: 'Query parameter "q" is required' });
        return;
      }
      
      const result = await searchUSDAFoods(query, pageSize, pageNumber);
      res.json(result);
    } catch (error: any) {
      console.error('USDA search error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get USDA food details and convert to our format (PRO feature)
  app.get("/api/usda/food/:fdcId", async (req, res) => {
    try {
      const user = await getDemoUser();
      
      if (!isPro(user)) {
        res.status(403).json({ error: 'USDA food database requires PRO subscription' });
        return;
      }
      
      const fdcId = parseInt(req.params.fdcId);
      
      if (isNaN(fdcId)) {
        res.status(400).json({ error: 'Invalid FDC ID' });
        return;
      }
      
      const usdaFood = await getUSDAFoodDetails(fdcId);
      const converted = convertUSDAToFoodItem(usdaFood);
      
      res.json({
        original: usdaFood,
        converted: converted
      });
    } catch (error: any) {
      console.error('USDA food details error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Import USDA food to local database (PRO feature)
  app.post("/api/usda/import", async (req, res) => {
    try {
      const user = await getDemoUser();
      
      if (!isPro(user)) {
        res.status(403).json({ error: 'USDA food database requires PRO subscription' });
        return;
      }
      
      const schema = z.object({
        fdcId: z.number()
      });
      
      const { fdcId } = schema.parse(req.body);
      
      // Check if already imported
      const existing = await storage.getFoodItemByExternalId(`usda_${fdcId}`);
      if (existing) {
        res.json({ 
          success: true,
          foodItem: existing,
          alreadyExists: true
        });
        return;
      }
      
      // Fetch from USDA and convert
      const usdaFood = await getUSDAFoodDetails(fdcId);
      const converted = convertUSDAToFoodItem(usdaFood);
      
      // Create in local database
      const foodItem = await storage.createFoodItem({
        ...converted,
        contributedBy: user.id,
        isPublic: true,
        isVerified: true // USDA data is verified
      });
      
      res.json({
        success: true,
        foodItem,
        alreadyExists: false
      });
    } catch (error: any) {
      console.error('USDA import error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/foods/:id", async (req, res) => {
    try {
      const food = await storage.getFoodItem(req.params.id);
      if (!food) {
        res.status(404).json({ error: 'Food not found' });
        return;
      }
      res.json(food);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // BARCODE SCANNING
  // ============================================================
  
  app.get("/api/barcode/:gtin", async (req, res) => {
    try {
      const gtin = req.params.gtin;
      
      // First, try local database lookup
      const result = await storage.getFoodByBarcode(gtin);
      
      if (result) {
        res.json(result.food);
        return;
      }
      
      // Fallback to Open Food Facts API
      console.log(`Barcode ${gtin} not found locally, querying Open Food Facts...`);
      
      try {
        const offResponse = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${gtin}?fields=product_name,brands,nutriments,serving_size,serving_quantity`
        );
        
        if (!offResponse.ok) {
          res.status(404).json({ error: 'Barcode not found in local database or Open Food Facts' });
          return;
        }
        
        const offData = await offResponse.json();
        
        if (offData.status !== 1 || !offData.product) {
          res.status(404).json({ error: 'Barcode not found in local database or Open Food Facts' });
          return;
        }
        
        const product = offData.product;
        const nutriments = product.nutriments || {};
        
        // Parse serving size in grams more robustly
        let gramsPerServing: number | undefined = undefined;
        
        // Try serving_quantity first (most reliable if available)
        if (product.serving_quantity && typeof product.serving_quantity === 'number' && !isNaN(product.serving_quantity)) {
          gramsPerServing = product.serving_quantity;
        } 
        // Try parsing serving_size string for gram values
        else if (product.serving_size && typeof product.serving_size === 'string') {
          // Look for patterns like "56g", "56 g", "(56g)", "(56 g)"
          const gramMatch = product.serving_size.match(/\(?\s*(\d+(?:\.\d+)?)\s*g\s*\)?/i);
          if (gramMatch) {
            const parsed = parseFloat(gramMatch[1]);
            if (!isNaN(parsed) && parsed > 0) {
              gramsPerServing = parsed;
            }
          }
        }
        
        // Log warning if serving size couldn't be parsed
        if (product.serving_size && gramsPerServing === undefined) {
          console.warn(`Could not parse serving size for ${product.product_name}: "${product.serving_size}"`);
        }
        
        // Convert Open Food Facts data to our food item format (per 100g)
        const foodData = {
          name: product.product_name || 'Unknown Product',
          brand: product.brands || undefined,
          perUnitType: 'per100g' as const,
          gramsPerServing,
          kcal100g: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
          protein100g: nutriments['proteins_100g'] || nutriments.proteins || 0,
          fat100g: nutriments['fat_100g'] || nutriments.fat || 0,
          carbs100g: nutriments['carbohydrates_100g'] || nutriments.carbohydrates || 0,
          fiber100g: nutriments['fiber_100g'] || nutriments.fiber || 0,
          sodium100g: nutriments['sodium_100g'] || nutriments.sodium || 0,
          tags: [] as string[],
          source: 'official'
        };
        
        // Create food item in database
        const { db } = await import('./db');
        const { foodItems, foodBarcodes } = await import('@shared/schema');
        
        const [createdFood] = await db
          .insert(foodItems)
          .values(foodData)
          .returning();
        
        // Create barcode mapping
        await db.insert(foodBarcodes).values({
          gtin,
          foodId: createdFood.id
        });
        
        console.log(`Created food item from Open Food Facts: ${createdFood.name} (${gtin})`);
        
        res.json(createdFood);
      } catch (offError: any) {
        console.error('Open Food Facts API error:', offError);
        res.status(404).json({ error: 'Barcode not found in local database or Open Food Facts' });
      }
    } catch (error: any) {
      console.error('Barcode lookup error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // PROTEIN POWDER PRESETS
  // ============================================================

  // Get all protein powder presets for current user
  app.get("/api/protein-presets", async (req, res) => {
    try {
      const user = await getDemoUser();
      const presets = await storage.getProteinPowderPresets(user.id);
      res.json(presets);
    } catch (error: any) {
      console.error('Get protein presets error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new protein powder preset
  app.post("/api/protein-presets", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { insertProteinPowderPresetSchema } = await import('@shared/schema');
      
      const data = insertProteinPowderPresetSchema.parse(req.body);
      
      // If this preset is marked as default, unset all other defaults
      if (data.isDefault) {
        await storage.unsetDefaultProteinPreset(user.id);
      }
      
      const preset = await storage.createProteinPowderPreset({
        userId: user.id,
        ...data
      });
      
      res.json(preset);
    } catch (error: any) {
      console.error('Create protein preset error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Set a protein powder preset as default
  app.patch("/api/protein-presets/:id/default", async (req, res) => {
    try {
      const user = await getDemoUser();
      const presetId = req.params.id;
      
      // Verify preset belongs to user
      const preset = await storage.getProteinPowderPreset(presetId);
      if (!preset || preset.userId !== user.id) {
        res.status(404).json({ error: 'Preset not found' });
        return;
      }
      
      // Unset all other defaults
      await storage.unsetDefaultProteinPreset(user.id);
      
      // Set this one as default
      const updated = await storage.updateProteinPowderPreset(presetId, { isDefault: true });
      res.json(updated);
    } catch (error: any) {
      console.error('Set default preset error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a protein powder preset
  app.delete("/api/protein-presets/:id", async (req, res) => {
    try {
      const user = await getDemoUser();
      const presetId = req.params.id;
      
      // Verify preset belongs to user
      const preset = await storage.getProteinPowderPreset(presetId);
      if (!preset || preset.userId !== user.id) {
        res.status(404).json({ error: 'Preset not found' });
        return;
      }
      
      await storage.deleteProteinPowderPreset(presetId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete protein preset error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // OCR NUTRITION LABEL SCANNING
  // ============================================================
  
  app.post("/api/ocr/nutrition", async (req, res) => {
    try {
      const schema = z.object({
        imageBase64: z.string().min(1, 'Image data is required')
      });
      
      const data = schema.parse(req.body);
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      
      // PRO Feature Gating: Server-side enforcement
      const userIsPro = isPro(user);
      
      if (!userIsPro) {
        // Track daily usage for free users using in-memory cache
        const usageKey = `${user.id}_${today}`;
        const currentUsage = aiUsageCache.get(usageKey) || 0;
        
        // Free users: limit to 3 AI requests per day (shared across all AI features)
        if (currentUsage >= 3) {
          res.status(403).json({ 
            error: 'DAILY_LIMIT_REACHED',
            message: '免费版每天只能使用3次AI功能。请升级到PRO版本获得无限使用。',
            upgradeUrl: '/upgrade-pro',
            usage: currentUsage,
            limit: 3
          });
          return;
        }
        
        // Increment usage counter
        aiUsageCache.set(usageKey, currentUsage + 1);
      }
      
      // Extract nutrition information using OpenAI Vision
      const { extractNutritionFromImage } = await import('./openai');
      const result = await extractNutritionFromImage(data.imageBase64);
      
      res.json(result);
    } catch (error: any) {
      console.error('OCR processing error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // RECIPE BREAKDOWN
  // ============================================================
  
  app.post("/api/recipe/breakdown", async (req, res) => {
    try {
      const schema = z.object({
        recipeName: z.string().min(1, 'Recipe name is required')
      });
      
      const data = schema.parse(req.body);
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      
      // PRO Feature Gating: Server-side enforcement
      const userIsPro = isPro(user);
      
      if (!userIsPro) {
        // Track daily usage for free users using in-memory cache
        const usageKey = `${user.id}_${today}`;
        const currentUsage = aiUsageCache.get(usageKey) || 0;
        
        // Free users: limit to 3 AI requests per day (shared across all AI features)
        if (currentUsage >= 3) {
          res.status(403).json({ 
            error: 'DAILY_LIMIT_REACHED',
            message: '免费版每天只能使用3次AI功能。请升级到PRO版本获得无限使用。',
            upgradeUrl: '/upgrade-pro',
            usage: currentUsage,
            limit: 3
          });
          return;
        }
        
        // Increment usage counter
        aiUsageCache.set(usageKey, currentUsage + 1);
      }
      
      // Break down recipe using AI
      const { breakdownRecipe } = await import('./openai');
      const result = await breakdownRecipe(data.recipeName);
      
      res.json(result);
    } catch (error: any) {
      console.error('Recipe breakdown error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recipe/log-all", async (req, res) => {
    try {
      const schema = z.object({
        ingredients: z.array(z.object({
          name: z.string(),
          amountG: z.number(),
          kcal: z.number(),
          proteinG: z.number(),
          fatG: z.number(),
          carbsG: z.number(),
          fiberG: z.number()
        }))
      });
      
      const data = schema.parse(req.body);
      const user = await getDemoUser();
      
      // Create or find food items for each ingredient and log them
      const logs = [];
      
      for (const ingredient of data.ingredients) {
        // Try to find existing food item by name
        let food = await storage.searchFoodItems(ingredient.name, 1);
        
        if (food.length === 0 || !food[0].name.toLowerCase().includes(ingredient.name.toLowerCase())) {
          // Create new food item for this ingredient
          const kcal100g = (ingredient.kcal / ingredient.amountG) * 100;
          const protein100g = (ingredient.proteinG / ingredient.amountG) * 100;
          const fat100g = (ingredient.fatG / ingredient.amountG) * 100;
          const carbs100g = (ingredient.carbsG / ingredient.amountG) * 100;
          const fiber100g = (ingredient.fiberG / ingredient.amountG) * 100;
          
          food = [await storage.createFoodItem({
            name: ingredient.name,
            perUnitType: 'per100g',
            kcal100g,
            protein100g,
            fat100g,
            carbs100g,
            fiber100g,
            sodium100g: 0,
            tags: ['recipe-ingredient'],
            source: 'ai-generated'
          })];
        }
        
        // Log the food with the specified amount
        const log = await storage.createFoodLog({
          userId: user.id,
          foodId: food[0].id,
          amountG: ingredient.amountG,
          kcal: ingredient.kcal,
          proteinG: ingredient.proteinG,
          fatG: ingredient.fatG,
          carbsG: ingredient.carbsG,
          fiberG: ingredient.fiberG
        });
        
        logs.push(log);
      }
      
      res.json({ success: true, logsCreated: logs.length, logs });
    } catch (error: any) {
      console.error('Recipe log-all error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // FOOD LOGS
  // ============================================================
  
  app.get("/api/foodlogs/today", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      const language = req.query.lang as string || req.headers['accept-language']?.split(',')[0] || 'en';
      
      const logs = await storage.getFoodLogsByDate(user.id, today);
      
      // Localize food names based on user language
      const localizedLogs = logs.map((log: any) => ({
        ...log,
        foodName: getLocalizedFoodName(log.foodName || '', log.foodNames, language)
      }));
      
      res.json(localizedLogs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/foodlog", async (req, res) => {
    try {
      const schema = z.object({
        foodId: z.string().optional(),
        // Inline food creation if foodId not provided
        foodName: z.string().optional(),
        kcal100g: z.number().optional(),
        protein100g: z.number().optional(),
        fat100g: z.number().optional(),
        carbs100g: z.number().optional(),
        fiber100g: z.number().optional(),
        // Amount
        amountG: z.number().optional(),
        amountValue: z.number().optional(),
        amountUnit: z.enum(['g', 'oz', 'kg', 'serving']).optional(),
        scheduleId: z.string().optional() // Link to reminder if logged from schedule
      });
      
      const data = schema.parse(req.body);
      console.log('[API] POST /api/foodlog scheduleId:', data.scheduleId);
      const user = await getDemoUser();
      
      let food: FoodItem;
      
      // If foodId provided, fetch it
      if (data.foodId) {
        const existingFood = await storage.getFoodItem(data.foodId);
        if (!existingFood) {
          res.status(404).json({ error: 'Food not found' });
          return;
        }
        food = existingFood;
      } 
      // Otherwise create food item inline
      else if (data.foodName && data.kcal100g !== undefined && data.protein100g !== undefined && 
               data.fat100g !== undefined && data.carbs100g !== undefined) {
        // Normalize food name for matching (trim, lowercase)
        const normalizedName = data.foodName.trim().toLowerCase();
        
        // Check if food already exists by exact name match
        const existing = await storage.searchFoodItems(data.foodName, 5);
        const exactMatch = existing.find(f => f.name.toLowerCase() === normalizedName);
        
        if (exactMatch) {
          // Use existing food item
          food = exactMatch;
        } else {
          // Create new food item with validated nutrition values
          food = await storage.createFoodItem({
            name: data.foodName.trim(),
            kcal100g: Math.max(0, data.kcal100g),
            protein100g: Math.max(0, data.protein100g),
            fat100g: Math.max(0, data.fat100g),
            carbs100g: Math.max(0, data.carbs100g),
            fiber100g: Math.max(0, data.fiber100g || 0),
            source: 'ai_generated'
          });
        }
      } else {
        res.status(400).json({ error: 'Must provide either foodId or inline food data (foodName, kcal100g, protein100g, fat100g, carbs100g)' });
        return;
      }
      
      // Calculate amount in grams
      let amountG: number;
      if (data.amountG) {
        amountG = data.amountG;
      } else if (data.amountValue && data.amountUnit) {
        amountG = toGrams(data.amountValue, data.amountUnit, food.gramsPerServing || undefined);
      } else {
        res.status(400).json({ error: 'Must provide amountG or (amountValue + amountUnit)' });
        return;
      }
      
      // Calculate nutrition for this intake (including micronutrients)
      const nutrition = calcNutritionPerIntake(amountG, {
        kcal: food.kcal100g,
        P: food.protein100g,
        F: food.fat100g,
        C: food.carbs100g,
        fiber: food.fiber100g,
        sodium: food.sodium100g ?? 0,
        vitaminA: food.vitaminAMcg100g ?? 0,
        vitaminC: food.vitaminCMg100g ?? 0,
        vitaminD: food.vitaminDMcg100g ?? 0,
        vitaminE: food.vitaminEMg100g ?? 0,
        vitaminK: food.vitaminKMcg100g ?? 0,
        vitaminB12: food.vitaminB12Mcg100g ?? 0,
        calcium: food.calciumMg100g ?? 0,
        iron: food.ironMg100g ?? 0,
        magnesium: food.magnesiumMg100g ?? 0,
        zinc: food.zincMg100g ?? 0,
        potassium: food.potassiumMg100g ?? 0
      });
      
      const log = await storage.createFoodLog({
        userId: user.id,
        foodId: food.id,
        amountG,
        scheduleId: data.scheduleId,
        kcal: nutrition.kcal,
        proteinG: nutrition.P,
        fatG: nutrition.F,
        carbsG: nutrition.C,
        fiberG: nutrition.fiber,
        sodiumMg: nutrition.sodium,
        vitaminAMcg: nutrition.vitaminA,
        vitaminCMg: nutrition.vitaminC,
        vitaminDMcg: nutrition.vitaminD,
        vitaminEMg: nutrition.vitaminE,
        vitaminKMcg: nutrition.vitaminK,
        vitaminB12Mcg: nutrition.vitaminB12,
        calciumMg: nutrition.calcium,
        ironMg: nutrition.iron,
        magnesiumMg: nutrition.magnesium,
        zincMg: nutrition.zinc,
        potassiumMg: nutrition.potassium
      });

      // If logged from schedule, mark the reminder as completed
      if (data.scheduleId) {
        await storage.updateReminder(data.scheduleId, {
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      // Trigger auto-complete check after food log
      const today = new Date().toISOString().split('T')[0];
      runAutoCompleteCheck(user.id, today).catch(err => 
        console.error('[AutoComplete] Check failed:', err)
      );
      
      res.json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/foodlog/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        amountG: z.number().positive().optional(),
        amountValue: z.number().positive().optional(),
        amountUnit: z.enum(['g', 'oz', 'kg', 'serving']).optional()
      });
      
      const data = schema.parse(req.body);
      const user = await getDemoUser();
      
      // Get existing log
      const existing = await storage.getFoodLog(id);
      if (!existing) {
        res.status(404).json({ error: 'Food log not found' });
        return;
      }
      
      // Verify ownership
      if (existing.userId !== user.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      
      // If amount changed, recalculate nutrition
      let updates: Partial<InsertFoodLog> = {};
      
      if (data.amountG || (data.amountValue && data.amountUnit)) {
        const food = await storage.getFoodItem(existing.foodId);
        if (!food) {
          res.status(404).json({ error: 'Food not found' });
          return;
        }
        
        // Calculate amount in grams
        let amountG: number;
        if (data.amountG) {
          amountG = data.amountG;
        } else if (data.amountValue && data.amountUnit) {
          amountG = toGrams(data.amountValue, data.amountUnit, food.gramsPerServing || undefined);
        } else {
          res.status(400).json({ error: 'Must provide amountG or (amountValue + amountUnit)' });
          return;
        }
        
        // Calculate nutrition for new amount
        const nutrition = calcNutritionPerIntake(amountG, {
          kcal: food.kcal100g,
          P: food.protein100g,
          F: food.fat100g,
          C: food.carbs100g,
          fiber: food.fiber100g,
          sodium: food.sodium100g ?? 0,
          vitaminA: food.vitaminAMcg100g ?? 0,
          vitaminC: food.vitaminCMg100g ?? 0,
          vitaminD: food.vitaminDMcg100g ?? 0,
          vitaminE: food.vitaminEMg100g ?? 0,
          vitaminK: food.vitaminKMcg100g ?? 0,
          vitaminB12: food.vitaminB12Mcg100g ?? 0,
          calcium: food.calciumMg100g ?? 0,
          iron: food.ironMg100g ?? 0,
          magnesium: food.magnesiumMg100g ?? 0,
          zinc: food.zincMg100g ?? 0,
          potassium: food.potassiumMg100g ?? 0
        });
        
        updates = {
          amountG,
          kcal: nutrition.kcal,
          proteinG: nutrition.P,
          fatG: nutrition.F,
          carbsG: nutrition.C,
          fiberG: nutrition.fiber,
          sodiumMg: nutrition.sodium,
          vitaminAMcg: nutrition.vitaminA,
          vitaminCMg: nutrition.vitaminC,
          vitaminDMcg: nutrition.vitaminD,
          vitaminEMg: nutrition.vitaminE,
          vitaminKMcg: nutrition.vitaminK,
          vitaminB12Mcg: nutrition.vitaminB12,
          calciumMg: nutrition.calcium,
          ironMg: nutrition.iron,
          magnesiumMg: nutrition.magnesium,
          zincMg: nutrition.zinc,
          potassiumMg: nutrition.potassium
        };
      }
      
      const updated = await storage.updateFoodLog(id, updates);
      
      // Trigger auto-complete check after edit
      const today = new Date().toISOString().split('T')[0];
      runAutoCompleteCheck(user.id, today).catch(err => 
        console.error('[AutoComplete] Check failed:', err)
      );
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/foodlog/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await getDemoUser();
      
      // Get existing log to verify ownership
      const existing = await storage.getFoodLog(id);
      if (!existing) {
        res.status(404).json({ error: 'Food log not found' });
        return;
      }
      
      // Verify ownership
      if (existing.userId !== user.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      
      await storage.deleteFoodLog(id);
      
      // Trigger auto-complete check after delete
      const today = new Date().toISOString().split('T')[0];
      runAutoCompleteCheck(user.id, today).catch(err => 
        console.error('[AutoComplete] Check failed:', err)
      );
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // WATER LOGS
  // ============================================================
  
  app.get("/api/waterlogs/today", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      const logs = await storage.getWaterLogsByDate(user.id, today);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/waterlog", async (req, res) => {
    try {
      const schema = z.object({
        amountOz: z.number().positive(),
        beverageType: z.enum([
          'water', 
          'sparkling-water', 
          'unsweetened-tea', 
          'black-coffee',
          'sweetened-coffee',
          'milk',
          'juice',
          'sports-drink',
          'sugary-soda',
          'energy-drink',
          'plant-milk',
          'other'
        ]).default('water'),
        scheduleId: z.string().optional() // Link to reminder if logged from schedule
      });
      
      const data = schema.parse(req.body);
      const user = await getDemoUser();
      
      // Get today's date (UTC)
      const today = new Date().toISOString().split('T')[0];
      
      // Get user's daily water target
      const targets = await storage.getDailyTarget(user.id, today);
      const dailyTargetOz = targets?.waterOz || 64;
      
      // Get today's black coffee total for 30% limit calculation
      const todayLogs = await storage.getWaterLogsByDate(user.id, today);
      const currentBlackCoffeeOz = todayLogs
        .filter(log => log.beverageType === 'black-coffee')
        .reduce((sum, log) => sum + (log.effectiveOz || 0), 0);
      
      // Calculate effective hydration with black coffee 30% limit
      const { calculateEffectiveHydration } = await import('../shared/beverageTypes');
      const { effectiveOz, cappedOz, wasReduced } = calculateEffectiveHydration(
        data.amountOz,
        data.beverageType,
        currentBlackCoffeeOz,
        dailyTargetOz
      );
      
      const log = await storage.createWaterLog({
        userId: user.id,
        amountOz: data.amountOz,
        beverageType: data.beverageType,
        effectiveOz: effectiveOz,
        scheduleId: data.scheduleId
      });

      // If logged from schedule, mark the reminder as completed
      if (data.scheduleId) {
        await storage.updateReminder(data.scheduleId, {
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      // Trigger auto-complete check after water log
      runAutoCompleteCheck(user.id, today).catch(err => 
        console.error('[AutoComplete] Check failed:', err)
      );
      
      // Return log with additional metadata for client
      res.json({
        ...log,
        wasReduced, // Indicates if black coffee was capped at 30%
        cappedOz
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update water log (edit amount or beverage type)
  app.patch("/api/waterlog/:id", async (req, res) => {
    try {
      const schema = z.object({
        amountOz: z.number().positive().optional(),
        beverageType: z.enum([
          'water', 
          'sparkling-water', 
          'unsweetened-tea', 
          'black-coffee',
          'sweetened-coffee',
          'milk',
          'juice',
          'sports-drink',
          'sugary-soda',
          'energy-drink',
          'plant-milk',
          'other'
        ]).optional()
      });
      
      const data = schema.parse(req.body);
      const user = await getDemoUser();
      const logId = req.params.id;
      
      // Get existing log to check ownership
      const existingLog = await storage.getWaterLogById(logId);
      if (!existingLog) {
        return res.status(404).json({ error: 'Water log not found' });
      }
      if (existingLog.userId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      // Get today's date and target for black coffee limit
      const today = new Date().toISOString().split('T')[0];
      const targets = await storage.getDailyTarget(user.id, today);
      const dailyTargetOz = targets?.waterOz || 64;
      
      // Get today's black coffee total (excluding this log being edited)
      const todayLogs = await storage.getWaterLogsByDate(user.id, today);
      const currentBlackCoffeeOz = todayLogs
        .filter(log => log.id !== logId && log.beverageType === 'black-coffee')
        .reduce((sum, log) => sum + (log.effectiveOz || 0), 0);
      
      // Calculate new effective hydration if either field changed
      const { calculateEffectiveHydration } = await import('../shared/beverageTypes');
      const newAmountOz = data.amountOz ?? existingLog.amountOz;
      const newBeverageType = data.beverageType ?? existingLog.beverageType;
      const { effectiveOz: newEffectiveOz } = calculateEffectiveHydration(
        newAmountOz,
        newBeverageType,
        currentBlackCoffeeOz,
        dailyTargetOz
      );
      
      const updatedLog = await storage.updateWaterLog(logId, {
        amountOz: newAmountOz,
        beverageType: newBeverageType,
        effectiveOz: newEffectiveOz
      });
      
      // Trigger auto-complete check after updating water log
      runAutoCompleteCheck(user.id, today).catch(err => 
        console.error('[AutoComplete] Check failed:', err)
      );
      
      res.json(updatedLog);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete water log
  app.delete("/api/waterlog/:id", async (req, res) => {
    try {
      const user = await getDemoUser();
      const logId = req.params.id;
      
      // Get existing log to check ownership
      const existingLog = await storage.getWaterLogById(logId);
      if (!existingLog) {
        return res.status(404).json({ error: 'Water log not found' });
      }
      if (existingLog.userId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      await storage.deleteWaterLog(logId);
      
      // Trigger auto-complete check after deleting water log
      const today = new Date().toISOString().split('T')[0];
      runAutoCompleteCheck(user.id, today).catch(err => 
        console.error('[AutoComplete] Check failed:', err)
      );
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Water Guidance - Dynamic water intake recommendations (Imperial-first)
  app.post("/api/water/guidance", async (req, res) => {
    try {
      const user = await getDemoUser();
      const profile = await storage.getUserProfile(user.id);
      if (!profile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      // Get today's water intake
      const today = new Date().toISOString().split('T')[0];
      const waterLogs = await storage.getWaterLogsByDate(user.id, today);
      const drankOz = waterLogs.reduce((sum, log) => sum + log.effectiveOz, 0);

      // Calculate minutes to bedtime
      const now = new Date();
      const [sleepHour, sleepMin] = profile.sleepTime.split(':').map(Number);
      const bedtime = new Date(now);
      bedtime.setHours(sleepHour, sleepMin, 0, 0);
      if (bedtime < now) {
        bedtime.setDate(bedtime.getDate() + 1); // Next day bedtime
      }
      const minutesToBed = Math.floor((bedtime.getTime() - now.getTime()) / (1000 * 60));

      // Get remaining water reminders count for today
      const allReminders = await storage.getRemindersByDate(user.id, today);
      const waterReminders = allReminders.filter(r => 
        r.type === 'water' && r.status === 'pending'
      );
      const remindersLeft = waterReminders.length;

      // Import water calculation utilities
      const { 
        defaultDailyTargetOz, 
        exerciseBonusOz, 
        suggestPerReminderOz, 
        MAX_HOURLY_OZ,
        toMl,
        toOz 
      } = await import('../shared/utils/water');

      // Calculate target (with optional manual override)
      const baseTargetOz = profile.waterGoalOverrideOz ?? defaultDailyTargetOz(profile.weightLb);
      const bonusOz = exerciseBonusOz(profile.todayExerciseMinutes || 0);
      const targetOz = Math.round(baseTargetOz + bonusOz);

      const remainingOz = Math.max(0, targetOz - drankOz);
      const isLate = minutesToBed <= 120; // ≤2 hours to bedtime
      const perReminderOz = suggestPerReminderOz(remainingOz, remindersLeft, isLate);

      // Imperial-first: Always return oz/lb units (water system uses imperial by default)
      // Note: unitPref is for food nutrition display, not water intake
      const response = {
        unit: 'imperial' as const,
        target: targetOz,
        drank: Math.round(drankOz),
        remaining: Math.max(0, Math.round(remainingOz)),
        bonusFromExercise: Math.round(bonusOz),
        suggestPerReminder: perReminderOz,
        maxHourly: MAX_HOURLY_OZ,
        remindersLeft,
        flags: { isLate },
        rationale: {
          baseFormula: '目标=体重(lb)×0.6；可手动覆盖',
          exerciseRule: '每30–60分钟 +12～24oz，线性估算',
          lateNight: '睡前≤2h降低当晚建议量，留到明早补',
          safety: '最大安全速度 ≤32oz/小时（不是建议量）',
        }
      };

      res.json(response);
    } catch (error: any) {
      console.error('[Water Guidance] Error:', error);
      res.status(500).json({ error: error.message || 'Internal error' });
    }
  });

  // ============================================================
  // WEIGHT TRACKING
  // ============================================================
  
  app.get("/api/weights/trend", async (req, res) => {
    try {
      const user = await getDemoUser();
      const days = parseInt(req.query.days as string) || 7;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const weights = await storage.getWeightsByDateRange(
        user.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      res.json(weights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/weight", async (req, res) => {
    try {
      const schema = z.object({
        weightLb: z.number().positive(),
        date: z.string().optional()
      });
      
      const data = schema.parse(req.body);
      const user = await getDemoUser();
      const date = data.date || new Date().toISOString().split('T')[0];
      
      const weight = await storage.createCheckinWeight({
        userId: user.id,
        date,
        weightLb: data.weightLb
      });
      
      // Also update user profile weight
      await storage.updateUserProfile(user.id, { weightLb: data.weightLb });
      
      res.json(weight);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // AI SUGGESTIONS (FILL REMAINING)
  // ============================================================
  
  app.post("/api/suggest", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      
      // PRO Feature Gating: Server-side enforcement
      const userIsPro = isPro(user);
      
      if (!userIsPro) {
        // Track daily usage for free users using in-memory cache
        const usageKey = `${user.id}_${today}`;
        const currentUsage = aiUsageCache.get(usageKey) || 0;
        
        // Free users: limit to 3 AI suggestions per day
        if (currentUsage >= 3) {
          res.status(403).json({ 
            error: 'DAILY_LIMIT_REACHED',
            message: '免费版每天只能使用3次AI推荐。请升级到PRO版本获得无限使用。',
            upgradeUrl: '/upgrade-pro',
            usage: currentUsage,
            limit: 3
          });
          return;
        }
        
        // Increment usage counter
        aiUsageCache.set(usageKey, currentUsage + 1);
      }
      
      const schema = z.object({
        kcal: z.number(),
        proteinG: z.number(),
        fatG: z.number(),
        carbsG: z.number(),
        fiberG: z.number(),
        mealContext: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'any']).optional(),
        language: z.string().optional()
      });
      
      const data = schema.parse(req.body);
      const remaining = {
        kcal: data.kcal,
        proteinG: data.proteinG,
        fatG: data.fatG,
        carbsG: data.carbsG,
        fiberG: data.fiberG
      };
      const mealContext = data.mealContext || 'any';
      const language = data.language || 'en';
      
      // Get all foods from database to provide to AI
      const allFoods = await storage.searchFoodItems('', 100);
      
      // Shuffle foods to add randomness for "换一组" functionality
      const shuffledFoods = [...allFoods];
      for (let i = shuffledFoods.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledFoods[i], shuffledFoods[j]] = [shuffledFoods[j], shuffledFoods[i]];
      }
      
      // Use AI to generate nutrition suggestions
      const { generateNutritionSuggestions } = await import('./openai');
      const aiSuggestions = await generateNutritionSuggestions(
        remaining,
        shuffledFoods.slice(0, 50).map(f => ({
          name: f.name,
          brand: f.brand || undefined,
          kcal100g: f.kcal100g,
          protein100g: f.protein100g,
          fat100g: f.fat100g,
          carbs100g: f.carbs100g,
          fiber100g: f.fiber100g,
          gramsPerServing: f.gramsPerServing || undefined
        })),
        mealContext,
        user.goal || 'maintain', // Pass user's goal (cut/maintain/bulk), default to 'maintain' if not set
        language // Pass user's language preference
      );
      
      res.json(aiSuggestions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // AI SNACK SUGGESTIONS (GOAL-SPECIFIC)
  // ============================================================
  
  app.post("/api/snacks/suggest", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      
      // PRO Feature Gating: Server-side enforcement
      const userIsPro = isPro(user);
      
      if (!userIsPro) {
        // Track daily usage for free users using in-memory cache
        const usageKey = `${user.id}_${today}`;
        const currentUsage = aiUsageCache.get(usageKey) || 0;
        
        // Free users: limit to 3 AI suggestions per day (shared with /api/suggest)
        if (currentUsage >= 3) {
          res.status(403).json({ 
            error: 'DAILY_LIMIT_REACHED',
            message: '免费版每天只能使用3次AI推荐。请升级到PRO版本获得无限使用。',
            upgradeUrl: '/upgrade-pro',
            usage: currentUsage,
            limit: 3
          });
          return;
        }
        
        // Increment usage counter
        aiUsageCache.set(usageKey, currentUsage + 1);
      }
      
      // New simplified input schema (Nov 2025)
      const schema = z.object({
        protein_left_g: z.number(),
        carbs_left_g: z.number(),
        fat_left_g: z.number(),
        fiber_left_g: z.number(),
        kcal_left: z.number(),
        minutes_to_next_meal: z.number().optional().default(120),
        diet_flags: z.object({
          vegetarian: z.boolean().optional(),
          vegan: z.boolean().optional(),
          lactose_free: z.boolean().optional(),
          gluten_free: z.boolean().optional(),
          nut_allergy: z.boolean().optional(),
          caffeine_ok: z.boolean().optional()
        }).optional().default({}),
        inventory: z.array(z.string()).optional().default([]),
        dislikes: z.string().optional().default(''),
        language: z.string().optional()
      });
      
      const data = schema.parse(req.body);
      
      // Map user goal: cut/maintain/bulk
      const userGoal = user.goal === 'cut' ? 'cut' 
        : user.goal === 'bulk' ? 'bulk' 
        : 'maintain';
      
      // Use AI to generate snack suggestions with new format
      const { generateSnackSuggestions } = await import('./openai');
      const snackSuggestions = await generateSnackSuggestions({
        goal: userGoal,
        protein_left_g: data.protein_left_g,
        carbs_left_g: data.carbs_left_g,
        fat_left_g: data.fat_left_g,
        fiber_left_g: data.fiber_left_g,
        kcal_left: data.kcal_left,
        minutes_to_next_meal: data.minutes_to_next_meal,
        diet_flags: data.diet_flags,
        inventory: data.inventory,
        dislikes: data.dislikes ? data.dislikes.split(',').map(s => s.trim()).filter(Boolean) : [],
        language: data.language || 'en' // Default to English, follow user's language preference
      });
      
      res.json(snackSuggestions);
    } catch (error: any) {
      console.error('Failed to generate snack suggestions:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // AI ULTIMATE MEAL PLAN (3 Meals with Pantry-Aware Logic)
  // ============================================================
  
  app.post("/api/ai/ultimate-meal-plan", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      
      // PRO Feature Gating: Server-side enforcement
      const userIsPro = isPro(user);
      
      if (!userIsPro) {
        // Track daily usage for free users using in-memory cache
        const usageKey = `${user.id}_${today}`;
        const currentUsage = aiUsageCache.get(usageKey) || 0;
        
        // Free users: limit to 3 AI suggestions per day (shared quota)
        if (currentUsage >= 3) {
          res.status(403).json({ 
            error: 'DAILY_LIMIT_REACHED',
            message: '免费版每天只能使用3次AI推荐。请升级到PRO版本获得无限使用。',
            upgradeUrl: '/upgrade-pro',
            usage: currentUsage,
            limit: 3
          });
          return;
        }
        
        // Increment usage counter
        aiUsageCache.set(usageKey, currentUsage + 1);
      }
      
      // Input schema
      const schema = z.object({
        protein_left_g: z.number(),
        carbs_left_g: z.number(),
        fat_left_g: z.number(),
        fiber_left_g: z.number(),
        kcal_left: z.number(),
        pantry: z.array(z.string()).optional().default([]),
        restrictions: z.string().optional().default(''),
        language: z.enum(['zh', 'en']).optional().default('zh')
      });
      
      const data = schema.parse(req.body);
      
      // Map user goal: cut/maintain/bulk
      const userGoal = user.goal === 'cut' ? 'cut' 
        : user.goal === 'bulk' ? 'bulk' 
        : 'maintain';
      
      // Use AI to generate ultimate meal plan
      const { generateUltimateMealPlan } = await import('./openai');
      const mealPlan = await generateUltimateMealPlan({
        goal: userGoal,
        protein_left_g: data.protein_left_g,
        carbs_left_g: data.carbs_left_g,
        fat_left_g: data.fat_left_g,
        fiber_left_g: data.fiber_left_g,
        kcal_left: data.kcal_left,
        pantry: data.pantry,
        restrictions: data.restrictions,
        language: data.language
      });
      
      res.json(mealPlan);
    } catch (error: any) {
      console.error('Failed to generate ultimate meal plan:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // REMINDERS
  // ============================================================
  
  app.get("/api/reminders/today", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      const reminders = await storage.getRemindersByDate(user.id, today);
      res.json(reminders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/reminder/:id", async (req, res) => {
    try {
      const schema = z.object({
        status: z.enum(['pending', 'countdown', 'completed', 'delayed', 'skipped']).optional(),
        delayedUntil: z.string().optional(),
        completedAt: z.string().optional(),
        scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
        type: z.enum(['meal', 'water', 'snack', 'pre_workout', 'post_workout']).optional()
      });
      
      const data = schema.parse(req.body);
      
      // Build update object with only provided fields
      const updateData: any = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.delayedUntil !== undefined) updateData.delayedUntil = new Date(data.delayedUntil);
      if (data.completedAt !== undefined) updateData.completedAt = new Date(data.completedAt);
      if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime;
      if (data.type !== undefined) updateData.type = data.type;
      
      const updated = await storage.updateReminder(req.params.id, updateData);
      
      if (!updated) {
        res.status(404).json({ error: 'Reminder not found' });
        return;
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create a new reminder
  app.post("/api/reminder", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      
      const schema = z.object({
        type: z.enum(['meal', 'water', 'snack', 'pre_workout', 'post_workout']),
        scheduledTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
        date: z.string().optional() // Optional, defaults to today
      });
      
      const data = schema.parse(req.body);
      
      const reminder = await storage.createReminder({
        userId: user.id,
        date: data.date || today,
        type: data.type,
        scheduledTime: data.scheduledTime,
        status: 'pending'
      });
      
      res.json(reminder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a reminder
  app.delete("/api/reminder/:id", async (req, res) => {
    try {
      await storage.deleteReminder(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // SCHEDULE ACTIONS - Complete/Postpone/Skip
  // ============================================================

  // Complete a scheduled reminder (creates food/water log)
  app.post("/api/schedule/:id/complete", async (req, res) => {
    try {
      const user = await getDemoUser();
      const reminder = await storage.getReminder(req.params.id);
      
      if (!reminder) {
        res.status(404).json({ error: 'Reminder not found' });
        return;
      }

      // Parse request body based on reminder type
      const schema = z.object({
        foodId: z.string().optional(),
        amountG: z.number().positive().optional(),
        amountOz: z.number().positive().optional(),
      });

      const data = schema.parse(req.body);

      if (reminder.type === 'water') {
        // Create water log
        if (!data.amountOz) {
          res.status(400).json({ error: 'amountOz is required for water reminders' });
          return;
        }

        const waterLog = await storage.createWaterLog({
          userId: user.id,
          amountOz: data.amountOz,
          scheduleId: reminder.id,
        });

        // Update reminder status to completed
        await storage.updateReminder(reminder.id, {
          status: 'completed',
          completedAt: new Date(),
        });

        res.json({ waterLog, reminder: { ...reminder, status: 'completed' } });
      } else {
        // Create food log (meal/snack)
        if (!data.foodId || !data.amountG) {
          res.status(400).json({ error: 'foodId and amountG are required for meal reminders' });
          return;
        }

        const foodItem = await storage.getFoodItem(data.foodId);
        if (!foodItem) {
          res.status(404).json({ error: 'Food item not found' });
          return;
        }

        // Calculate nutrition based on amount
        const factor = data.amountG / 100;
        const foodLog = await storage.createFoodLog({
          userId: user.id,
          foodId: data.foodId,
          amountG: data.amountG,
          scheduleId: reminder.id,
          kcal: foodItem.kcal100g * factor,
          proteinG: foodItem.protein100g * factor,
          fatG: foodItem.fat100g * factor,
          carbsG: foodItem.carbs100g * factor,
          fiberG: foodItem.fiber100g * factor,
          sodiumMg: (foodItem.sodium100g || 0) * factor,
          vitaminAMcg: (foodItem.vitaminAMcg100g || 0) * factor,
          vitaminCMg: (foodItem.vitaminCMg100g || 0) * factor,
          vitaminDMcg: (foodItem.vitaminDMcg100g || 0) * factor,
          vitaminEMg: (foodItem.vitaminEMg100g || 0) * factor,
          vitaminKMcg: (foodItem.vitaminKMcg100g || 0) * factor,
          vitaminB12Mcg: (foodItem.vitaminB12Mcg100g || 0) * factor,
          calciumMg: (foodItem.calciumMg100g || 0) * factor,
          ironMg: (foodItem.ironMg100g || 0) * factor,
          magnesiumMg: (foodItem.magnesiumMg100g || 0) * factor,
          zincMg: (foodItem.zincMg100g || 0) * factor,
          potassiumMg: (foodItem.potassiumMg100g || 0) * factor,
        });

        // Update reminder status to completed
        await storage.updateReminder(reminder.id, {
          status: 'completed',
          completedAt: new Date(),
        });

        res.json({ foodLog, reminder: { ...reminder, status: 'completed' } });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Postpone a scheduled reminder
  app.post("/api/schedule/:id/postpone", async (req, res) => {
    try {
      const reminder = await storage.getReminder(req.params.id);
      
      if (!reminder) {
        res.status(404).json({ error: 'Reminder not found' });
        return;
      }

      const schema = z.object({
        delayMinutes: z.number().int().min(5).max(180), // 5-180 minutes
      });

      const data = schema.parse(req.body);

      const delayedUntil = new Date();
      delayedUntil.setMinutes(delayedUntil.getMinutes() + data.delayMinutes);

      const updated = await storage.updateReminder(reminder.id, {
        status: 'postponed',
        delayedUntil,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Skip a scheduled reminder
  app.post("/api/schedule/:id/skip", async (req, res) => {
    try {
      const reminder = await storage.getReminder(req.params.id);
      
      if (!reminder) {
        res.status(404).json({ error: 'Reminder not found' });
        return;
      }

      const updated = await storage.updateReminder(reminder.id, {
        status: 'skipped',
        completedAt: new Date(),
      });

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // SUMMARY/STATS
  // ============================================================
  
  app.get("/api/summary/today", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      
      // Get targets - auto-create if not exists
      let target = await storage.getDailyTarget(user.id, today);
      if (!target) {
        // Calculate and create new target
        const calculated = calculateDailyTargets({
          weightLb: user.weightLb,
          heightCm: user.heightCm,
          age: user.age,
          sex: user.sex,
          goal: user.goal,
          activity: user.activity
        });
        
        target = await storage.createDailyTarget({
          userId: user.id,
          date: today,
          ...calculated
        });
      }
      
      // Get food logs
      const foodLogs = await storage.getFoodLogsByDate(user.id, today);
      const foodTotals = foodLogs.reduce((acc, log) => ({
        kcal: acc.kcal + log.kcal,
        proteinG: acc.proteinG + log.proteinG,
        fatG: acc.fatG + log.fatG,
        carbsG: acc.carbsG + log.carbsG,
        fiberG: acc.fiberG + log.fiberG,
        sodiumMg: acc.sodiumMg + (log.sodiumMg || 0),
        vitaminAMcg: acc.vitaminAMcg + (log.vitaminAMcg || 0),
        vitaminCMg: acc.vitaminCMg + (log.vitaminCMg || 0),
        vitaminDMcg: acc.vitaminDMcg + (log.vitaminDMcg || 0),
        vitaminEMg: acc.vitaminEMg + (log.vitaminEMg || 0),
        vitaminKMcg: acc.vitaminKMcg + (log.vitaminKMcg || 0),
        vitaminB12Mcg: acc.vitaminB12Mcg + (log.vitaminB12Mcg || 0),
        calciumMg: acc.calciumMg + (log.calciumMg || 0),
        ironMg: acc.ironMg + (log.ironMg || 0),
        magnesiumMg: acc.magnesiumMg + (log.magnesiumMg || 0),
        zincMg: acc.zincMg + (log.zincMg || 0),
        potassiumMg: acc.potassiumMg + (log.potassiumMg || 0)
      }), { 
        kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0,
        sodiumMg: 0, vitaminAMcg: 0, vitaminCMg: 0, vitaminDMcg: 0,
        vitaminEMg: 0, vitaminKMcg: 0, vitaminB12Mcg: 0, calciumMg: 0,
        ironMg: 0, magnesiumMg: 0, zincMg: 0, potassiumMg: 0
      });
      
      // Get water logs
      const waterLogs = await storage.getWaterLogsByDate(user.id, today);
      const waterTotal = waterLogs.reduce((sum, log) => sum + log.effectiveOz, 0);
      
      // Calculate remaining (including micronutrients)
      const remaining = {
        kcal: target.kcal - foodTotals.kcal,
        proteinG: target.proteinG - foodTotals.proteinG,
        fatG: target.fatG - foodTotals.fatG,
        carbsG: target.carbsG - foodTotals.carbsG,
        fiberG: target.fiberG - foodTotals.fiberG,
        waterOz: target.waterOz - waterTotal,
        sodiumMg: (target.sodiumMg || 2300) - foodTotals.sodiumMg,
        vitaminAMcg: (target.vitaminAMcg || 900) - foodTotals.vitaminAMcg,
        vitaminCMg: (target.vitaminCMg || 90) - foodTotals.vitaminCMg,
        vitaminDMcg: (target.vitaminDMcg || 15) - foodTotals.vitaminDMcg,
        vitaminEMg: (target.vitaminEMg || 15) - foodTotals.vitaminEMg,
        vitaminKMcg: (target.vitaminKMcg || 120) - foodTotals.vitaminKMcg,
        vitaminB12Mcg: (target.vitaminB12Mcg || 2.4) - foodTotals.vitaminB12Mcg,
        calciumMg: (target.calciumMg || 1000) - foodTotals.calciumMg,
        ironMg: (target.ironMg || 8) - foodTotals.ironMg,
        magnesiumMg: (target.magnesiumMg || 400) - foodTotals.magnesiumMg,
        zincMg: (target.zincMg || 11) - foodTotals.zincMg,
        potassiumMg: (target.potassiumMg || 3400) - foodTotals.potassiumMg
      };
      
      res.json({
        target,
        current: {
          ...foodTotals,
          waterOz: waterTotal
        },
        remaining
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // WEIGHT TRACKING
  // ============================================================
  
  // Get weight history (last 7 days by default)
  app.get("/api/weights", async (req, res) => {
    try {
      const user = await getDemoUser();
      const days = parseInt(req.query.days as string) || 7;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const weights = await storage.getWeightsByDateRange(
        user.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      res.json(weights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Check if weight was logged on a specific date
  app.get("/api/weights/check/:date", async (req, res) => {
    try {
      const user = await getDemoUser();
      const date = req.params.date;
      
      const weight = await storage.getWeightByDate(user.id, date);
      
      if (!weight) {
        res.status(404).json(null);
        return;
      }
      
      res.json(weight);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get latest weight
  app.get("/api/weights/latest", async (req, res) => {
    try {
      const user = await getDemoUser();
      const latest = await storage.getLatestWeight(user.id);
      
      if (!latest) {
        res.status(404).json({ error: 'No weight records found' });
        return;
      }
      
      res.json(latest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Log new weight (upsert - update if exists for same day)
  app.post("/api/weights", async (req, res) => {
    try {
      const user = await getDemoUser();
      const data = insertCheckinWeightSchema.parse({
        ...req.body,
        userId: user.id
      });
      
      // Check if weight already logged today
      const existingWeight = await storage.getWeightByDate(user.id, data.date);
      
      let weight;
      if (existingWeight) {
        // Update existing weight
        weight = await storage.updateCheckinWeight(existingWeight.id, {
          weightLb: data.weightLb
        });
      } else {
        // Create new weight record
        weight = await storage.createCheckinWeight(data);
      }
      
      // Also update user profile weight
      await storage.updateUserProfile(user.id, {
        weightLb: data.weightLb
      });
      
      res.json(weight);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================
  // MEAL PLANNING
  // ============================================================

  // Get all meal plans for user
  app.get("/api/meal-plans", async (req, res) => {
    try {
      const user = await getDemoUser();
      const plans = await storage.getMealPlans(user.id);
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific meal plan with all items
  app.get("/api/meal-plans/:id", async (req, res) => {
    try {
      const user = await getDemoUser();
      const plan = await storage.getMealPlan(req.params.id);
      
      if (!plan) {
        res.status(404).json({ error: 'Meal plan not found' });
        return;
      }
      
      // Verify ownership
      if (plan.userId !== user.id) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }
      
      const items = await storage.getMealPlanItems(req.params.id);
      
      res.json({ ...plan, items });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new meal plan
  app.post("/api/meal-plans", async (req, res) => {
    try {
      const user = await getDemoUser();
      const data = insertMealPlanSchema.parse({
        ...req.body,
        userId: user.id
      });
      
      const plan = await storage.createMealPlan(data);
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update meal plan
  app.patch("/api/meal-plans/:id", async (req, res) => {
    try {
      const user = await getDemoUser();
      const plan = await storage.getMealPlan(req.params.id);
      
      if (!plan || plan.userId !== user.id) {
        res.status(404).json({ error: 'Meal plan not found' });
        return;
      }
      
      // Only allow updating name, startDate, endDate, isActive - prevent userId changes
      const allowedUpdates = insertMealPlanSchema.pick({
        name: true,
        startDate: true,
        endDate: true,
        isActive: true
      }).parse(req.body);
      
      const updated = await storage.updateMealPlan(req.params.id, allowedUpdates);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete meal plan
  app.delete("/api/meal-plans/:id", async (req, res) => {
    try {
      const user = await getDemoUser();
      const plan = await storage.getMealPlan(req.params.id);
      
      if (!plan || plan.userId !== user.id) {
        res.status(404).json({ error: 'Meal plan not found' });
        return;
      }
      
      await storage.deleteMealPlan(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add item to meal plan
  app.post("/api/meal-plans/:id/items", async (req, res) => {
    try {
      const user = await getDemoUser();
      const plan = await storage.getMealPlan(req.params.id);
      
      if (!plan || plan.userId !== user.id) {
        res.status(404).json({ error: 'Meal plan not found' });
        return;
      }
      
      const data = insertMealPlanItemSchema.parse({
        ...req.body,
        mealPlanId: req.params.id
      });
      
      const item = await storage.createMealPlanItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update meal plan item
  app.patch("/api/meal-plans/:planId/items/:itemId", async (req, res) => {
    try {
      const user = await getDemoUser();
      const plan = await storage.getMealPlan(req.params.planId);
      
      if (!plan || plan.userId !== user.id) {
        res.status(404).json({ error: 'Meal plan not found' });
        return;
      }
      
      // Only allow updating date, mealType, foodId, gramsAmount, notes - prevent mealPlanId changes
      const allowedUpdates = insertMealPlanItemSchema.pick({
        date: true,
        mealType: true,
        foodId: true,
        gramsAmount: true,
        notes: true
      }).parse(req.body);
      
      const updated = await storage.updateMealPlanItem(req.params.itemId, allowedUpdates);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete meal plan item
  app.delete("/api/meal-plans/:planId/items/:itemId", async (req, res) => {
    try {
      const user = await getDemoUser();
      const plan = await storage.getMealPlan(req.params.planId);
      
      if (!plan || plan.userId !== user.id) {
        res.status(404).json({ error: 'Meal plan not found' });
        return;
      }
      
      await storage.deleteMealPlanItem(req.params.itemId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate shopping list from meal plan
  app.get("/api/meal-plans/:id/shopping-list", async (req, res) => {
    try {
      const items = await storage.getMealPlanItems(req.params.id);
      
      // Group by food and sum quantities
      const foodMap = new Map<string, { food: any; totalGrams: number }>();
      
      for (const item of items) {
        const food = await storage.getFood(item.foodId);
        if (!food) continue;
        
        const existing = foodMap.get(item.foodId);
        if (existing) {
          existing.totalGrams += item.gramsAmount;
        } else {
          foodMap.set(item.foodId, {
            food,
            totalGrams: item.gramsAmount
          });
        }
      }
      
      // Convert to array format
      const shoppingList = Array.from(foodMap.values()).map(({ food, totalGrams }) => ({
        foodId: food.id,
        name: food.name,
        brand: food.brand,
        totalGrams,
        purchased: false
      }));
      
      res.json(shoppingList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // SUBSCRIPTION / STRIPE
  // ============================================================

  // Create checkout session - Simplified single-tier subscription ($14.99/month with 7-day trial)
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
      res.status(503).json({ error: 'Subscription features are not available' });
      return;
    }
    
    try {
      const user = await getDemoUser();
      const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
      
      // Get Stripe Price ID from environment (single tier: $14.99/month with 7-day trial)
      const priceId = process.env.STRIPE_PRICE_ID;
      if (!priceId) {
        return res.status(500).json({ error: 'Stripe Price ID not configured' });
      }
      console.log('[Stripe] Using Price ID:', priceId);
      
      // Check if user already has active subscription
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            res.status(400).json({ 
              error: '您已经有一个活跃的订阅',
              status: subscription.status 
            });
            return;
          }
        } catch (err) {
          // Subscription doesn't exist in Stripe, continue with creating new one
          console.error('Subscription retrieve error (will create new):', err);
        }
      }
      
      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.id + '@fitfuel.app', // Using userId as email placeholder
          metadata: { userId: user.id }
        });
        customerId = customer.id;
        await storage.updateUserProfile(user.id, { stripeCustomerId: customerId });
      } else {
        // Verify customer still exists
        try {
          await stripe.customers.retrieve(customerId);
        } catch (err) {
          // Customer deleted, create new one
          const customer = await stripe.customers.create({
            email: user.id + '@fitfuel.app',
            metadata: { userId: user.id }
          });
          customerId = customer.id;
          await storage.updateUserProfile(user.id, { stripeCustomerId: customerId });
        }
      }
      
      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        subscription_data: {
          trial_period_days: 7,
          metadata: {
            userId: user.id
          }
        },
        success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/billing/cancel`,
        metadata: {
          userId: user.id
        }
      });
      
      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error('Checkout session creation error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get subscription status
  app.get("/api/subscription-status", async (req, res) => {
    try {
      const user = await getDemoUser();
      
      // Check if user has local admin/premium status (bypasses Stripe for admin accounts)
      if (user.subscriptionStatus === 'active' && user.subscriptionTier === 'pro' && !user.stripeSubscriptionId) {
        // Admin account - return Premium status directly from database (using 'premium' for new single-tier system)
        res.json({ 
          isPro: true,    // Legacy field for backward compatibility
          isPlus: true,   // Legacy field for backward compatibility
          plan: 'premium' as const,  // Updated to match pricing.ts
          status: 'active',
          subscriptionEndsAt: null
        });
        return;
      }
      
      if (!STRIPE_ENABLED || !stripe) {
        res.json({ isPro: false, status: 'free', message: 'Subscription features not configured' });
        return;
      }
      
      if (!user.stripeSubscriptionId) {
        res.json({ 
          isPro: false,
          isPlus: false,
          plan: 'free' as const,
          status: 'free',
          subscriptionEndsAt: null
        });
        return;
      }
      
      let subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      } catch (stripeError: any) {
        // Handle invalid/deleted subscription gracefully
        console.error('Stripe subscription retrieve error:', stripeError.message);
        
        // Clear invalid subscription from user profile
        await storage.updateUserProfile(user.id, {
          stripeSubscriptionId: null,
          subscriptionStatus: 'free',
          subscriptionTier: null,
          subscriptionEndsAt: null
        });
        
        res.json({ 
          isPro: false,
          isPlus: false,
          plan: 'free' as const,
          status: 'free',
          subscriptionEndsAt: null
        });
        return;
      }
      
      // Determine plan tier from subscription metadata (defaults to 'pro' for backward compatibility)
      const tier = (subscription.metadata?.tier as 'plus' | 'pro') || 'pro';
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      const isPro = isActive && tier === 'pro';
      const isPlus = isActive && tier === 'plus';
      const plan = isActive ? tier : 'free';
      
      // Update local status if it changed
      if (user.subscriptionStatus !== subscription.status || user.subscriptionTier !== tier) {
        await storage.updateUserProfile(user.id, {
          subscriptionStatus: subscription.status,
          subscriptionTier: tier,
          subscriptionEndsAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null
        });
      }
      
      const subData: any = subscription;
      res.json({
        isPro,
        isPlus,
        plan,
        status: subscription.status,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        subscriptionEndsAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null
      });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Cancel subscription (schedule cancellation at period end)
  app.post("/api/cancel-subscription", async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
      res.status(503).json({ error: 'Subscription features are not available' });
      return;
    }
    
    try {
      const user = await getDemoUser();
      
      if (!user.stripeSubscriptionId) {
        res.status(404).json({ error: 'No active subscription' });
        return;
      }
      
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      
      const subData: any = subscription;
      const endsAt = subData.current_period_end ? new Date(subData.current_period_end * 1000) : null;
      
      // Set status to 'cancel_at_period_end' to indicate scheduled cancellation
      await storage.updateUserProfile(user.id, {
        subscriptionStatus: 'cancel_at_period_end',
        subscriptionCurrentPeriodEnd: endsAt
      });
      
      res.json({ 
        success: true,
        message: '已安排在当前计费期末取消，可在此之前随时恢复。',
        endsAt
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // New endpoint: /api/subscription/cancel (alias for compatibility)
  app.post("/api/subscription/cancel", async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
      res.status(503).json({ error: 'Subscription features are not available' });
      return;
    }
    
    try {
      const user = await getDemoUser();
      
      if (!user.stripeSubscriptionId) {
        res.status(404).json({ error: '没有找到活跃的订阅' });
        return;
      }
      
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      
      const subData: any = subscription;
      const currentPeriodEnd = subData.current_period_end ? new Date(subData.current_period_end * 1000) : null;
      
      await storage.updateUserProfile(user.id, {
        subscriptionStatus: 'cancel_at_period_end',
        subscriptionCurrentPeriodEnd: currentPeriodEnd
      });
      
      res.json({ 
        success: true,
        message: '已安排在当前计费期末取消，可在此之前随时恢复。',
        currentPeriodEnd
      });
    } catch (error: any) {
      console.error('Subscription cancel error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Restore subscription (reactivate before period end)
  app.post("/api/restore-subscription", async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
      res.status(503).json({ error: 'Subscription features are not available' });
      return;
    }
    
    try {
      const user = await getDemoUser();
      
      if (!user.stripeSubscriptionId) {
        res.status(404).json({ error: 'No subscription to restore' });
        return;
      }
      
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false
      });
      
      // Restore to active/trialing based on current subscription status
      const newStatus = subscription.status === 'trialing' ? 'trialing' : 'active';
      const subData: any = subscription;
      
      await storage.updateUserProfile(user.id, {
        subscriptionStatus: newStatus,
        subscriptionCurrentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null
      });
      
      res.json({ 
        success: true,
        message: '订阅已成功恢复',
        status: newStatus
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // New endpoint: /api/subscription/resume (alias for compatibility)
  app.post("/api/subscription/resume", async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
      res.status(503).json({ error: 'Subscription features are not available' });
      return;
    }
    
    try {
      const user = await getDemoUser();
      
      if (!user.stripeSubscriptionId) {
        res.status(404).json({ error: '没有找到要恢复的订阅' });
        return;
      }
      
      // Check if subscription is scheduled for cancellation
      const currentSub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (!currentSub.cancel_at_period_end) {
        res.status(400).json({ error: '订阅未计划取消，无需恢复' });
        return;
      }
      
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false
      });
      
      const newStatus = subscription.status === 'trialing' ? 'trialing' : 'active';
      const subData: any = subscription;
      
      await storage.updateUserProfile(user.id, {
        subscriptionStatus: newStatus,
        subscriptionCurrentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null
      });
      
      res.json({ 
        success: true,
        message: '订阅已成功恢复',
        status: newStatus
      });
    } catch (error: any) {
      console.error('Subscription resume error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create Customer Portal Session for subscription management
  app.post("/api/customer-portal", async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
      res.status(503).json({ error: 'Subscription features are not available' });
      return;
    }
    
    try {
      const user = await getDemoUser();
      
      if (!user.stripeCustomerId) {
        res.status(404).json({ error: 'No customer found' });
        return;
      }
      
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.headers.origin || 'http://localhost:5000'}/settings`,
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================
  // AI FEATURES
  // ============================================================
  
  // Generate AI Meal Plan
  app.post("/api/ai/meal-plan/generate", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { language = 'en' } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      // Check feature access and usage limit
      const limitCheck = await storage.checkUsageLimit(user.id, 'ai_meal_plan', today);
      
      if (!limitCheck.allowed) {
        res.status(429).json({ 
          error: 'Daily limit reached',
          current: limitCheck.current,
          limit: limitCheck.limit
        });
        return;
      }
      
      // Get current nutrition status
      const dailyTarget = await storage.getDailyTarget(user.id, today);
      const foodLogs = await storage.getFoodLogsByDate(user.id, today);
      
      // Calculate current totals (foodLogs already have calculated nutrition values)
      let currentKcal = 0, currentProtein = 0, currentFat = 0, currentCarbs = 0;
      for (const log of foodLogs) {
        currentKcal += log.kcal;
        currentProtein += log.proteinG;
        currentFat += log.fatG;
        currentCarbs += log.carbsG;
      }
      
      // Calculate remaining needs (clamp at 0 to avoid negative targets)
      const remainingKcal = Math.max(0, (dailyTarget?.kcal || 2000) - currentKcal);
      const remainingProtein = Math.max(0, (dailyTarget?.proteinG || 150) - currentProtein);
      const remainingFat = Math.max(0, (dailyTarget?.fatG || 60) - currentFat);
      const remainingCarbs = Math.max(0, (dailyTarget?.carbsG || 200) - currentCarbs);
      
      // Generate AI meal plan using OpenAI
      const planUuid = randomUUID();
      let mealPlan;
      
      try {
        mealPlan = await generateDailyMealPlan(
          remainingKcal,
          remainingProtein,
          remainingFat,
          remainingCarbs,
          { dietary: 'balanced' }, // TODO: Add dietary preferences to user profile
          language
        );
      } catch (aiError: any) {
        console.error('AI generation failed, not consuming quota:', aiError);
        res.status(500).json({ 
          error: 'Failed to generate meal plan',
          details: aiError.message,
          quotaConsumed: false
        });
        return;
      }
      
      // Store the generated plan
      const aiPlan = await storage.createAiMealPlan({
        userId: user.id,
        planUuid,
        targetDate: today,
        totalKcal: mealPlan.totalKcal,
        totalProteinG: mealPlan.totalProteinG,
        totalFatG: mealPlan.totalFatG,
        totalCarbsG: mealPlan.totalCarbsG,
        planData: mealPlan,
        userPreferences: {
          currentKcal,
          currentProtein,
          currentFat,
          currentCarbs,
          dietary: 'balanced'
        }
      });
      
      // Increment usage
      await storage.incrementUsage(user.id, 'ai_meal_plan', today);
      
      res.json({ plan: aiPlan, usage: { current: limitCheck.current + 1, limit: limitCheck.limit } });
    } catch (error: any) {
      console.error('AI meal plan generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get AI Meal Plans by date
  app.get("/api/ai/meal-plan/list/:date", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { date } = req.params;
      const language = req.query.lang as string || req.headers['accept-language']?.split(',')[0] || 'en';
      
      const plans = await storage.getAiMealPlansByDate(user.id, date);
      
      // Localize food names in each plan
      const localizedPlans = await Promise.all(plans.map(async (plan: any) => {
        const planData = plan.planData as any;
        
        // Helper function to localize foods in a meal
        const localizeMealFoods = async (foods: any[]) => {
          return Promise.all(foods.map(async (food: any) => {
            // Try to find matching food in database by name
            const dbFoods = await storage.searchFoodItems(food.name, 5);
            if (dbFoods.length > 0) {
              const matchedFood = dbFoods[0];
              return {
                ...food,
                name: getLocalizedFoodName(matchedFood.name, matchedFood.names, language)
              };
            }
            // If no match found, keep original name
            return food;
          }));
        };
        
        // Localize each meal's foods and meal names
        const [breakfastFoods, lunchFoods, dinnerFoods, breakfastName, lunchName, dinnerName] = await Promise.all([
          localizeMealFoods(planData.breakfast?.foods || []),
          localizeMealFoods(planData.lunch?.foods || []),
          localizeMealFoods(planData.dinner?.foods || []),
          translateText(planData.breakfast?.name || '', language),
          translateText(planData.lunch?.name || '', language),
          translateText(planData.dinner?.name || '', language)
        ]);
        
        return {
          ...plan,
          planData: {
            ...planData,
            breakfast: {
              ...planData.breakfast,
              name: breakfastName,
              foods: breakfastFoods
            },
            lunch: {
              ...planData.lunch,
              name: lunchName,
              foods: lunchFoods
            },
            dinner: {
              ...planData.dinner,
              name: dinnerName,
              foods: dinnerFoods
            }
          }
        };
      }));
      
      res.json(localizedPlans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get AI Meal Plan history
  app.get("/api/ai/meal-plan", async (req, res) => {
    try {
      const user = await getDemoUser();
      const plans = await storage.getAiMealPlans(user.id, 20);
      res.json({ plans });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get specific AI Meal Plan
  app.get("/api/ai/meal-plan/:uuid", async (req, res) => {
    try {
      const user = await getDemoUser();
      const plan = await storage.getAiMealPlanByUuid(user.id, req.params.uuid);
      
      if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }
      
      res.json({ plan });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Apply AI Meal Plan to food logs (matches frontend POST /api/ai/meal-plan/apply with { planUuid })
  app.post("/api/ai/meal-plan/apply", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { planUuid } = req.body;
      
      if (!planUuid) {
        res.status(400).json({ error: 'planUuid is required' });
        return;
      }
      
      const plan = await storage.getAiMealPlanByUuid(user.id, planUuid);
      
      if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      // Create food logs from meal plan
      // First create food items, then create food logs referencing them
      const planData = plan.planData as any; // JSONB field - type assertion needed
      const meals = [planData.breakfast, planData.lunch, planData.dinner];
      for (const meal of meals) {
        for (const food of meal.foods) {
          // Create food item first (nutrition stored per 100g)
          const foodItem = await storage.createFoodItem({
            name: food.name,
            kcal100g: (food.kcal / food.amountG) * 100,
            protein100g: (food.proteinG / food.amountG) * 100,
            fat100g: (food.fatG / food.amountG) * 100,
            carbs100g: (food.carbsG / food.amountG) * 100,
            fiber100g: ((food.fiberG || 0) / food.amountG) * 100,
            sodium100g: 0,
            source: 'ai_generated'
          });
          
          // Then create food log with reference to food item
          await storage.createFoodLog({
            userId: user.id,
            foodId: foodItem.id,
            amountG: food.amountG,
            kcal: food.kcal,
            proteinG: food.proteinG,
            fatG: food.fatG,
            carbsG: food.carbsG,
            fiberG: food.fiberG || 0,
            sodiumMg: 0
          });
        }
      }
      
      // Mark as applied
      await storage.updateAiMealPlan(plan.id, {
        isApplied: true,
        appliedAt: new Date()
      });
      
      res.json({ success: true, message: 'Plan applied successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Unified AI Coach Advice endpoint (matches frontend expectations)
  app.post("/api/ai/coach-advice", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { mode, question, language = 'en' } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      // Get current nutrition status
      const dailyTarget = await storage.getDailyTarget(user.id, today);
      const foodLogs = await storage.getFoodLogsByDate(user.id, today);
      const waterLogs = await storage.getWaterLogsByDate(user.id, today);
      
      // Calculate current totals
      let currentKcal = 0, currentProtein = 0, currentFat = 0, currentCarbs = 0, currentFiber = 0;
      for (const log of foodLogs) {
        currentKcal += log.kcal;
        currentProtein += log.proteinG;
        currentFat += log.fatG;
        currentCarbs += log.carbsG;
        currentFiber += log.fiberG || 0;
      }
      
      const totalWaterOz = waterLogs.reduce((sum, log) => sum + log.effectiveOz, 0);
      const targetWaterOz = dailyTarget?.waterOz || 85;
      
      // Handle different modes
      if (mode === 'evening') {
        // Evening advice - free for all users
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        
        const advice = await generateCoachAdvice(
          { kcal: currentKcal, proteinG: currentProtein, fatG: currentFat, carbsG: currentCarbs, fiberG: currentFiber, waterOz: totalWaterOz },
          { kcal: dailyTarget?.kcal || 2000, proteinG: dailyTarget?.proteinG || 150, fatG: dailyTarget?.fatG || 60, carbsG: dailyTarget?.carbsG || 200, fiberG: dailyTarget?.fiberG || 30, waterOz: targetWaterOz },
          timeOfDay,
          'basic_tips',
          language
        );
        
        res.json({ advice, quotaConsumed: false });
      } else if (mode === 'conversation') {
        // Conversation mode - requires Plus/Pro
        if (!isPlus(user)) {
          res.status(403).json({ error: 'This feature requires Plus or Pro subscription' });
          return;
        }
        
        // Check usage limit
        const limitCheck = await storage.checkUsageLimit(user.id, 'ai_coach', today);
        
        if (!limitCheck.allowed) {
          // Friendly error message with helpful guidance
          const resetTime = new Date();
          resetTime.setHours(24, 0, 0, 0); // Next midnight
          const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));
          
          res.status(429).json({ 
            error: 'quota_exceeded',
            message: language === 'zh-CN' || language === 'zh-TW'
              ? `今日AI对话次数已用完（${limitCheck.current}/${limitCheck.limit}次）`
              : `Daily AI conversation limit reached (${limitCheck.current}/${limitCheck.limit})`,
            current: limitCheck.current,
            limit: limitCheck.limit,
            resetIn: hoursUntilReset,
            suggestion: language === 'zh-CN' || language === 'zh-TW'
              ? `${hoursUntilReset}小时后自动重置`
              : `Resets in ${hoursUntilReset} hours`
          });
          return;
        }
        
        // Generate conversation advice with user's question
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        
        const advice = await generateCoachAdvice(
          { kcal: currentKcal, proteinG: currentProtein, fatG: currentFat, carbsG: currentCarbs, fiberG: currentFiber, waterOz: totalWaterOz },
          { kcal: dailyTarget?.kcal || 2000, proteinG: dailyTarget?.proteinG || 150, fatG: dailyTarget?.fatG || 60, carbsG: dailyTarget?.carbsG || 200, fiberG: dailyTarget?.fiberG || 30, waterOz: targetWaterOz },
          timeOfDay,
          'conversation',  // triggerType includes the question context
          language
        );
        
        // Record usage by incrementing the usage count
        await storage.incrementUsage(user.id, 'ai_coach', today);
        
        const remaining = limitCheck.limit - (limitCheck.current + 1);
        res.json({ advice, quotaConsumed: true, remaining });
      } else {
        res.status(400).json({ error: 'Invalid mode. Must be "evening" or "conversation"' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // AI Coach: Basic Tips (all tiers)
  app.post("/api/ai/coach/basic-tips", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];
      
      // Get current nutrition status
      const dailyTarget = await storage.getDailyTarget(user.id, today);
      const foodLogs = await storage.getFoodLogsByDate(user.id, today);
      const waterLogs = await storage.getWaterLogsByDate(user.id, today);
      
      // Calculate current totals (foodLogs already have calculated nutrition values)
      let currentKcal = 0, currentProtein = 0, currentFat = 0, currentCarbs = 0, currentFiber = 0;
      for (const log of foodLogs) {
        currentKcal += log.kcal;
        currentProtein += log.proteinG;
        currentFat += log.fatG;
        currentCarbs += log.carbsG;
        currentFiber += log.fiberG || 0;
      }
      
      const totalWaterOz = waterLogs.reduce((sum, log) => sum + log.effectiveOz, 0);
      const targetWaterOz = dailyTarget?.waterOz || 85;
      
      // Determine time of day
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      
      // Generate AI coach advice
      const advice = await generateCoachAdvice(
        {
          kcal: currentKcal,
          proteinG: currentProtein,
          fatG: currentFat,
          carbsG: currentCarbs,
          fiberG: currentFiber,
          waterOz: totalWaterOz
        },
        {
          kcal: dailyTarget?.kcal || 2000,
          proteinG: dailyTarget?.proteinG || 150,
          fatG: dailyTarget?.fatG || 60,
          carbsG: dailyTarget?.carbsG || 200,
          fiberG: dailyTarget?.fiberG || 30,
          waterOz: targetWaterOz
        },
        timeOfDay,
        'basic_tips'
      );
      
      res.json(advice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // AI Coach: Conversation (Plus/Pro only)
  app.post("/api/ai/coach/conversation", async (req, res) => {
    try {
      const user = await getDemoUser();
      
      // Check Plus/Pro access
      if (!isPlus(user)) {
        res.status(403).json({ error: 'This feature requires Plus or Pro subscription' });
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const { language = 'en' } = req.body;
      
      // Check usage limit
      const limitCheck = await storage.checkUsageLimit(user.id, 'ai_coach', today);
      
      if (!limitCheck.allowed) {
        // Friendly error message with helpful guidance
        const resetTime = new Date();
        resetTime.setHours(24, 0, 0, 0); // Next midnight
        const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));
        
        res.status(429).json({ 
          error: 'quota_exceeded',
          message: language === 'zh-CN' || language === 'zh-TW'
            ? `今日AI对话次数已用完（${limitCheck.current}/${limitCheck.limit}次）`
            : `Daily AI conversation limit reached (${limitCheck.current}/${limitCheck.limit})`,
          current: limitCheck.current,
          limit: limitCheck.limit,
          resetIn: hoursUntilReset,
          suggestion: language === 'zh-CN' || language === 'zh-TW'
            ? `${hoursUntilReset}小时后自动重置`
            : `Resets in ${hoursUntilReset} hours`
        });
        return;
      }
      
      // Get current nutrition status
      const dailyTarget = await storage.getDailyTarget(user.id, today);
      const foodLogs = await storage.getFoodLogsByDate(user.id, today);
      const waterLogs = await storage.getWaterLogsByDate(user.id, today);
      
      // Calculate current totals (foodLogs already have calculated nutrition values)
      let currentKcal = 0, currentProtein = 0, currentFat = 0, currentCarbs = 0, currentFiber = 0;
      for (const log of foodLogs) {
        currentKcal += log.kcal;
        currentProtein += log.proteinG;
        currentFat += log.fatG;
        currentCarbs += log.carbsG;
        currentFiber += log.fiberG || 0;
      }
      
      const totalWaterOz = waterLogs.reduce((sum, log) => sum + log.effectiveOz, 0);
      const targetWaterOz = dailyTarget?.waterOz || 85;
      
      // Determine time of day
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      
      // Generate AI coach conversation using OpenAI
      let coachAdvice;
      
      try {
        coachAdvice = await generateCoachAdvice(
          {
            kcal: currentKcal,
            proteinG: currentProtein,
            fatG: currentFat,
            carbsG: currentCarbs,
            fiberG: currentFiber,
            waterOz: totalWaterOz
          },
          {
            kcal: dailyTarget?.kcal || 2000,
            proteinG: dailyTarget?.proteinG || 150,
            fatG: dailyTarget?.fatG || 60,
            carbsG: dailyTarget?.carbsG || 200,
            fiberG: dailyTarget?.fiberG || 30,
            waterOz: targetWaterOz
          },
          timeOfDay,
          'evening_dual_path'
        );
      } catch (aiError: any) {
        console.error('AI coach generation failed, not consuming quota:', aiError);
        res.status(500).json({ 
          error: 'Failed to generate coach advice',
          details: aiError.message,
          quotaConsumed: false
        });
        return;
      }
      
      // Create coach session with AI-generated advice
      const session = await storage.createAiCoachSession({
        userId: user.id,
        sessionDate: today,
        sessionTime: new Date(),
        triggerType: 'evening_dual_path',
        triggerTime: new Date().toTimeString().slice(0, 5),
        currentKcal,
        currentProteinG: currentProtein,
        currentFatG: currentFat,
        currentCarbsG: currentCarbs,
        currentWaterOz: totalWaterOz,
        targetKcal: dailyTarget?.kcal || 2000,
        targetProteinG: dailyTarget?.proteinG || 150,
        targetFatG: dailyTarget?.fatG || 60,
        targetCarbsG: dailyTarget?.carbsG || 200,
        targetWaterOz: targetWaterOz,
        coachResponse: coachAdvice,
        recommendedPath: coachAdvice.recommendedPath || 'light_supplement',
        conversationTurns: 0,
        conversationData: {}
      });
      
      // Increment usage
      await storage.incrementUsage(user.id, 'ai_coach', today);
      
      res.json({ session, usage: { current: limitCheck.current + 1, limit: limitCheck.limit } });
    } catch (error: any) {
      console.error('AI coach conversation error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ===== TRAINING LOG ROUTES =====
  // Get user's training logs
  app.get("/api/training-logs", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }
      
      const logs = await storage.getTrainingLogsByDateRange(user.id, startDate as string, endDate as string);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get latest training log
  app.get("/api/training-logs/latest", async (req, res) => {
    try {
      const user = await getDemoUser();
      const latestLog = await storage.getLatestTrainingLog(user.id);
      res.json(latestLog || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get training log by date
  app.get("/api/training-logs/:date", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { date } = req.params;
      const log = await storage.getTrainingLogByDate(user.id, date);
      res.json(log || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create training log
  app.post("/api/training-logs", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { date, workoutType, notes } = req.body;
      
      if (!date || !workoutType) {
        res.status(400).json({ error: 'date and workoutType are required' });
        return;
      }
      
      if (!['push', 'pull', 'legs'].includes(workoutType)) {
        res.status(400).json({ error: 'workoutType must be push, pull, or legs' });
        return;
      }
      
      // Check if log already exists for this date
      const existing = await storage.getTrainingLogByDate(user.id, date);
      if (existing) {
        res.status(409).json({ error: 'Training log already exists for this date' });
        return;
      }
      
      const log = await storage.createTrainingLog({
        userId: user.id,
        date,
        workoutType,
        notes: notes || null
      });
      
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update training log
  app.patch("/api/training-logs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { workoutType, notes } = req.body;
      
      if (workoutType && !['push', 'pull', 'legs'].includes(workoutType)) {
        res.status(400).json({ error: 'workoutType must be push, pull, or legs' });
        return;
      }
      
      const updated = await storage.updateTrainingLog(id, { workoutType, notes });
      
      if (!updated) {
        res.status(404).json({ error: 'Training log not found' });
        return;
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete training log
  app.delete("/api/training-logs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTrainingLog(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ===== THREE-MODULE AI COACH =====
  // Get AI Coach quota status
  app.get("/api/ai/coach/quota", async (req, res) => {
    try {
      const user = await getDemoUser();
      
      if (!isPlus(user)) {
        res.json({ 
          allowed: false,
          current: 0,
          limit: 0,
          remaining: 0,
          requiresUpgrade: true
        });
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const limitCheck = await storage.checkUsageLimit(user.id, 'ai_coach', today);
      
      const remaining = limitCheck.limit === -1 
        ? -1  // Unlimited
        : Math.max(0, limitCheck.limit - limitCheck.current);
      
      res.json({
        allowed: limitCheck.allowed,
        current: limitCheck.current,
        limit: limitCheck.limit,
        remaining,
        isUnlimited: limitCheck.limit === -1,
        requiresUpgrade: false
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Tri-Module Coach (Nutrition + Workout + Mindset)
  app.post("/api/ai/tri-module-coach", async (req, res) => {
    try {
      const user = await getDemoUser();
      
      // Check Plus/Pro access for advanced coach
      if (!isPlus(user)) {
        res.status(403).json({ error: 'This feature requires Plus or Pro subscription' });
        return;
      }
      
      const { question, language = 'en' } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      if (!question || !question.trim()) {
        res.status(400).json({ error: 'Question is required' });
        return;
      }
      
      // Check usage limit
      const limitCheck = await storage.checkUsageLimit(user.id, 'ai_coach', today);
      
      if (!limitCheck.allowed) {
        // Friendly error message with helpful guidance
        const resetTime = new Date();
        resetTime.setHours(24, 0, 0, 0); // Next midnight
        const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));
        
        res.status(429).json({ 
          error: 'quota_exceeded',
          message: language === 'zh-CN' || language === 'zh-TW'
            ? `今日AI对话次数已用完（${limitCheck.current}/${limitCheck.limit}次）`
            : `Daily AI conversation limit reached (${limitCheck.current}/${limitCheck.limit})`,
          current: limitCheck.current,
          limit: limitCheck.limit,
          resetIn: hoursUntilReset,
          suggestion: language === 'zh-CN' || language === 'zh-TW'
            ? `${hoursUntilReset}小时后自动重置`
            : `Resets in ${hoursUntilReset} hours`
        });
        return;
      }
      
      // Get current nutrition status
      const dailyTarget = await storage.getDailyTarget(user.id, today);
      const foodLogs = await storage.getFoodLogsByDate(user.id, today);
      
      // Calculate remaining macros
      let currentKcal = 0, currentProtein = 0, currentFat = 0, currentCarbs = 0, currentFiber = 0;
      for (const log of foodLogs) {
        currentKcal += log.kcal;
        currentProtein += log.proteinG;
        currentFat += log.fatG;
        currentCarbs += log.carbsG;
        currentFiber += log.fiberG || 0;
      }
      
      const remainingMacros = {
        proteinG: Math.max(0, (dailyTarget?.proteinG || 150) - currentProtein),
        carbsG: (dailyTarget?.carbsG || 200) - currentCarbs,
        fatG: Math.max(0, (dailyTarget?.fatG || 60) - currentFat),
        fiberG: Math.max(0, (dailyTarget?.fiberG || 30) - currentFiber),
        kcal: Math.max(0, (dailyTarget?.kcal || 2000) - currentKcal)
      };
      
      // Get latest training log for workout recommendations
      const latestTraining = await storage.getLatestTrainingLog(user.id);
      const lastWorkoutType = latestTraining?.workoutType || null;
      
      // Get today's conversation history
      const todaySessions = await storage.getAiCoachSessionsByDate(user.id, today);
      const conversationHistory: any[] = [];
      
      // Extract conversation history from sessions
      for (const session of todaySessions) {
        if (session.conversationData && Array.isArray(session.conversationData)) {
          conversationHistory.push(...session.conversationData);
        }
      }
      
      // CRITICAL: Limit conversation history to prevent token overflow
      // Keep only the last 20 messages (10 conversation pairs) to stay within OpenAI token limits
      // This prevents 500 errors when users have long conversation sessions
      const MAX_HISTORY_MESSAGES = 20;
      const limitedHistory = conversationHistory.length > MAX_HISTORY_MESSAGES
        ? conversationHistory.slice(-MAX_HISTORY_MESSAGES)
        : conversationHistory;
      
      // Generate tri-module coach response with limited conversation history
      const coachResponse = await generateTriModuleCoachResponse(
        question,
        remainingMacros,
        lastWorkoutType,
        language,
        limitedHistory
      );
      
      // Get water logs for session snapshot
      const waterLogs = await storage.getWaterLogsByDate(user.id, today);
      let currentWaterOz = 0;
      for (const log of waterLogs) {
        currentWaterOz += log.amountOz;
      }
      
      // Create new conversation entry
      const newConversationEntry = [
        { role: 'user', content: question, timestamp: new Date().toISOString() },
        { role: 'assistant', content: coachResponse.response, timestamp: new Date().toISOString() }
      ];
      
      // Append to existing conversation history
      const updatedConversationData = [...conversationHistory, ...newConversationEntry];
      
      // Create coach session with full conversation data
      await storage.createAiCoachSession({
        userId: user.id,
        sessionDate: today,
        sessionTime: new Date(),
        triggerType: 'conversation',
        triggerTime: new Date().toTimeString().slice(0, 5),
        currentKcal,
        currentProteinG: currentProtein,
        currentFatG: currentFat,
        currentCarbsG: currentCarbs,
        currentWaterOz,
        targetKcal: dailyTarget?.kcal || 2000,
        targetProteinG: dailyTarget?.proteinG || 150,
        targetFatG: dailyTarget?.fatG || 60,
        targetCarbsG: dailyTarget?.carbsG || 200,
        targetWaterOz: dailyTarget?.waterOz || 100,
        coachResponse: { mode: coachResponse.mode, response: coachResponse.response },
        conversationTurns: Math.floor(updatedConversationData.length / 2), // Count conversation pairs
        conversationData: updatedConversationData
      });
      
      // Increment usage
      await storage.incrementUsage(user.id, 'ai_coach', today);
      
      // Calculate remaining quota (undefined for unlimited plans)
      const remaining = limitCheck.limit === -1 
        ? undefined 
        : limitCheck.limit - (limitCheck.current + 1);
      
      res.json({ 
        mode: coachResponse.mode,
        response: coachResponse.response,
        quotaConsumed: limitCheck.limit !== -1,  // Only consume quota if not unlimited
        remaining 
      });
    } catch (error: any) {
      console.error('Tri-module coach error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Stripe webhook for subscription events - Unified handler with duplicate card detection
  app.post("/api/stripe-webhook", async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
      res.status(503).json({ error: 'Subscription features are not available' });
      return;
    }
    
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_ENDPOINT_SECRET;
    
    let event: Stripe.Event;
    
    // Verify webhook signature if secret is configured
    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody as Buffer,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).json({ error: 'Webhook signature verification failed' });
        return;
      }
    } else {
      // For development: trust the payload without verification
      event = req.body;
      if (!webhookSecret) {
        console.warn('⚠️  STRIPE_ENDPOINT_SECRET not set. Webhook signature verification disabled (development only).');
      }
    }
    
    try {
      const { db } = await import('./db');
      const { userProfiles } = await import('@shared/schema');
      const { eq, and, or, sql } = await import('drizzle-orm');

      switch (event.type) {
        case 'checkout.session.completed': {
          // User completed checkout - record subscription info
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const subscriptionId = session.subscription as string;
          
          if (userId && subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const subData: any = subscription;
            
            await storage.updateUserProfile(userId, {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status === 'trialing' ? 'trialing' : 'active',
              subscriptionTrialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
              subscriptionCurrentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null
            });
            
            console.log(`[Webhook] Checkout completed for user ${userId}: ${subscription.status}`);
          }
          break;
        }
        
        case 'invoice.payment_succeeded': {
          // Payment succeeded - check for duplicate card and update status
          const invoice: any = event.data.object;
          const subscriptionId = invoice.subscription as string;
          
          if (!subscriptionId) break;
          
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          
          if (!userId) {
            console.warn('[Webhook] No userId in subscription metadata');
            break;
          }
          
          // Get payment method to check card fingerprint
          let cardFingerprint: string | null = null;
          
          try {
            const paymentIntentId = invoice.payment_intent as string;
            if (paymentIntentId) {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
              const paymentMethodId = paymentIntent.payment_method as string;
              
              if (paymentMethodId) {
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
                cardFingerprint = paymentMethod.card?.fingerprint || null;
              }
            }
          } catch (err) {
            console.warn('[Webhook] Could not retrieve card fingerprint:', err);
          }
          
          // Check for duplicate card usage (anti-fraud measure)
          if (cardFingerprint) {
            const [existingUser] = await db
              .select()
              .from(userProfiles)
              .where(
                and(
                  eq(userProfiles.paymentFingerprint, cardFingerprint),
                  sql`${userProfiles.id} != ${userId}`,
                  or(
                    eq(userProfiles.subscriptionStatus, 'active'),
                    eq(userProfiles.subscriptionStatus, 'trialing')
                  )
                )
              )
              .limit(1);
            
            if (existingUser) {
              // Duplicate card detected! Cancel the new subscription
              console.error(`[Webhook] Duplicate card detected! Card ${cardFingerprint} already used by user ${existingUser.id}`);
              
              await stripe.subscriptions.cancel(subscriptionId);
              
              await storage.updateUserProfile(userId, {
                subscriptionStatus: 'canceled',
                stripeSubscriptionId: null,
                subscriptionCurrentPeriodEnd: null,
                subscriptionTrialEnd: null,
                paymentFingerprint: null
              });
              
              // Log the conflict
              console.error(`[Webhook] Canceled subscription ${subscriptionId} for user ${userId} due to duplicate card`);
              break;
            }
          }
          
          // No duplicate - update user to active with card fingerprint
          const subData: any = subscription;
          await storage.updateUserProfile(userId, {
            subscriptionStatus: 'active',
            subscriptionCurrentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null,
            paymentFingerprint: cardFingerprint
          });
          
          console.log(`[Webhook] Payment succeeded for user ${userId}, status: active`);
          break;
        }
        
        case 'customer.subscription.updated': {
          // Subscription updated - sync status and period end
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            const subData: any = subscription;
            const updates: any = {
              subscriptionStatus: subscription.status,
              subscriptionCurrentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null
            };
            
            // Handle cancel_at_period_end flag
            if (subscription.cancel_at_period_end) {
              updates.subscriptionStatus = 'cancel_at_period_end';
            }
            
            await storage.updateUserProfile(userId, updates);
            console.log(`[Webhook] Subscription updated for user ${userId}: ${updates.subscriptionStatus}`);
          }
          break;
        }
        
        case 'customer.subscription.deleted': {
          // Subscription deleted/canceled - clear subscription info
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            await storage.updateUserProfile(userId, {
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null, // Optional: clear or keep for audit
              subscriptionCurrentPeriodEnd: null,
              subscriptionTrialEnd: null,
              paymentFingerprint: null // Clear fingerprint when subscription ends
            });
            
            console.log(`[Webhook] Subscription deleted for user ${userId}`);
          }
          break;
        }
      }
      
      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================
  // ADMIN API ENDPOINTS
  // ============================================

  // Admin Dashboard - Statistics Overview
  app.get("/api/admin/dashboard", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" }); // Disguise as 404
      }

      const { db } = await import('./db');
      const { userProfiles, aiMealPlans, aiCoachSessions } = await import('@shared/schema');
      const { count, sql } = await import('drizzle-orm');

      // Total users count
      const [{ totalUsers }] = await db
        .select({ totalUsers: count() })
        .from(userProfiles);

      // Active subscriptions (plus + pro)
      const [{ activeSubscriptions }] = await db
        .select({ activeSubscriptions: count() })
        .from(userProfiles)
        .where(sql`subscription_tier IN ('plus', 'pro') AND subscription_status = 'active'`);

      // Today's AI usage
      const today = new Date().toISOString().split('T')[0];
      const [{ aiMenuToday }] = await db
        .select({ aiMenuToday: count() })
        .from(aiMealPlans)
        .where(sql`DATE(created_at) = ${today}`);

      const [{ aiCoachToday }] = await db
        .select({ aiCoachToday: count() })
        .from(aiCoachSessions)
        .where(sql`DATE(created_at) = ${today}`);

      // Subscription breakdown
      const subscriptionStats = await db
        .select({
          tier: userProfiles.subscriptionTier,
          count: count()
        })
        .from(userProfiles)
        .groupBy(userProfiles.subscriptionTier);

      res.json({
        totalUsers,
        activeSubscriptions,
        aiUsageToday: {
          menu: aiMenuToday,
          coach: aiCoachToday,
          total: aiMenuToday + aiCoachToday
        },
        subscriptionBreakdown: subscriptionStats
      });
    } catch (error: any) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Users - List and Search
  app.get("/api/admin/users", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { db } = await import('./db');
      const { userProfiles } = await import('@shared/schema');
      const { sql, desc } = await import('drizzle-orm');

      const searchQuery = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      let users;
      
      if (searchQuery) {
        users = await db
          .select()
          .from(userProfiles)
          .where(sql`id ILIKE ${`%${searchQuery}%`}`)
          .orderBy(desc(userProfiles.createdAt))
          .limit(limit)
          .offset(offset);
      } else {
        users = await db
          .select()
          .from(userProfiles)
          .orderBy(desc(userProfiles.createdAt))
          .limit(limit)
          .offset(offset);
      }

      res.json({ users, limit, offset });
    } catch (error: any) {
      console.error('Admin users error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin - Get User Details
  app.get("/api/admin/users/:userId", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { userId } = req.params;
      const { db } = await import('./db');
      const { userProfiles, foodLogs, waterLogs, aiMealPlans, aiCoachSessions } = await import('@shared/schema');
      const { eq, desc, count } = await import('drizzle-orm');

      // Get user profile
      const [targetUser] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get recent logs count
      const [{ foodCount }] = await db.select({ foodCount: count() }).from(foodLogs).where(eq(foodLogs.userId, userId));
      const [{ waterCount }] = await db.select({ waterCount: count() }).from(waterLogs).where(eq(waterLogs.userId, userId));
      const [{ menuCount }] = await db.select({ menuCount: count() }).from(aiMealPlans).where(eq(aiMealPlans.userId, userId));
      const [{ coachCount }] = await db.select({ coachCount: count() }).from(aiCoachSessions).where(eq(aiCoachSessions.userId, userId));

      // Get recent activity
      const recentFoodLogs = await db
        .select()
        .from(foodLogs)
        .where(eq(foodLogs.userId, userId))
        .orderBy(desc(foodLogs.datetime))
        .limit(10);

      res.json({
        user: targetUser,
        stats: {
          totalFoodLogs: foodCount,
          totalWaterLogs: waterCount,
          totalAIMenus: menuCount,
          totalAICoach: coachCount
        },
        recentActivity: recentFoodLogs
      });
    } catch (error: any) {
      console.error('Admin user details error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin - Grant Pro Subscription
  app.post("/api/admin/users/:userId/grant-pro", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { userId } = req.params;
      const { days = 7, reason } = req.body;

      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + days);

      await storage.updateUserProfile(userId, {
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        subscriptionEndsAt: endsAt
      });

      await recordAudit(user.id, 'grant_pro', userId, 'user', { days, reason, endsAt: endsAt.toISOString() }, req);

      res.json({ success: true, endsAt: endsAt.toISOString() });
    } catch (error: any) {
      console.error('Grant pro error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin - Ban User
  app.post("/api/admin/users/:userId/ban", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { userId } = req.params;
      const { reason } = req.body;

      await storage.updateUserProfile(userId, {
        isBanned: true,
        bannedReason: reason || 'No reason provided',
        bannedAt: new Date(),
        bannedBy: user.id
      });

      await recordAudit(user.id, 'ban_user', userId, 'user', { reason }, req);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Ban user error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin - Unban User
  app.post("/api/admin/users/:userId/unban", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { userId } = req.params;

      await storage.updateUserProfile(userId, {
        isBanned: false,
        bannedReason: null,
        bannedAt: null,
        bannedBy: null
      });

      await recordAudit(user.id, 'unban_user', userId, 'user', {}, req);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Unban user error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin - Subscriptions List
  app.get("/api/admin/subscriptions", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { db } = await import('./db');
      const { userProfiles } = await import('@shared/schema');
      const { sql, desc } = await import('drizzle-orm');

      const subscriptions = await db
        .select()
        .from(userProfiles)
        .where(sql`subscription_tier IS NOT NULL`)
        .orderBy(desc(userProfiles.subscriptionEndsAt));

      res.json({ subscriptions });
    } catch (error: any) {
      console.error('Admin subscriptions error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin - AI Usage Statistics
  app.get("/api/admin/ai-usage", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { db } = await import('./db');
      const { aiMealPlans, aiCoachSessions, userProfiles } = await import('@shared/schema');
      const { sql, desc, count } = await import('drizzle-orm');

      // Last 30 days usage
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const menuUsage = await db
        .select({
          userId: aiMealPlans.userId,
          count: count()
        })
        .from(aiMealPlans)
        .where(sql`created_at >= ${thirtyDaysAgo.toISOString()}`)
        .groupBy(aiMealPlans.userId)
        .orderBy(desc(count()))
        .limit(10);

      const coachUsage = await db
        .select({
          userId: aiCoachSessions.userId,
          count: count()
        })
        .from(aiCoachSessions)
        .where(sql`created_at >= ${thirtyDaysAgo.toISOString()}`)
        .groupBy(aiCoachSessions.userId)
        .orderBy(desc(count()))
        .limit(10);

      res.json({
        topMenuUsers: menuUsage,
        topCoachUsers: coachUsage
      });
    } catch (error: any) {
      console.error('Admin AI usage error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin - Audit Logs
  app.get("/api/admin/audit-logs", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { db } = await import('./db');
      const { auditLog } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');

      const limit = parseInt(req.query.limit as string) || 100;

      const logs = await db
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit);

      res.json({ logs });
    } catch (error: any) {
      console.error('Admin audit logs error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin - Batch Translate Food Names
  app.post("/api/admin/translate-foods", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { limit = 10 } = req.body; // Translate up to 10 foods per request
      const { db } = await import('./db');
      const { foodItems } = await import('@shared/schema');
      const { isNull, sql } = await import('drizzle-orm');
      const { translateFoodName } = await import('./openai');

      // Get foods without translations
      const foodsToTranslate = await db
        .select()
        .from(foodItems)
        .where(isNull(foodItems.names))
        .limit(Math.min(limit, 50)); // Cap at 50 for safety

      if (foodsToTranslate.length === 0) {
        return res.json({ 
          success: true, 
          translated: 0, 
          message: 'All foods already have translations' 
        });
      }

      const results = [];
      for (const food of foodsToTranslate) {
        try {
          console.log(`[Admin] Translating food: ${food.name}`);
          const translations = await translateFoodName(food.name);
          
          // Update the food item with translations
          await db
            .update(foodItems)
            .set({ names: translations as any })
            .where(sql`id = ${food.id}`);
          
          results.push({ id: food.id, name: food.name, success: true });
        } catch (error: any) {
          console.error(`[Admin] Failed to translate "${food.name}":`, error);
          results.push({ id: food.id, name: food.name, success: false, error: error.message });
        }
      }

      await recordAudit(
        user.id, // actorId
        'food_translation', // action
        undefined, // targetId
        'foods', // targetType
        { count: results.filter(r => r.success).length } // metadata
      );

      res.json({
        success: true,
        translated: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
      });
    } catch (error: any) {
      console.error('Admin translate foods error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============== System Integration Tokens ==============

  // Get all integration token statuses (Admin only)
  app.get("/api/system/integration-tokens", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { db } = await import('./db');
      const { integrationTokens } = await import('@shared/schema');

      const tokens = await db
        .select()
        .from(integrationTokens);

      const now = new Date();
      const tokensWithStatus = tokens.map(token => {
        const daysUntilExpiry = Math.floor((token.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isExpired = daysUntilExpiry < 0;
        const isWarning = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        
        return {
          ...token,
          daysUntilExpiry,
          isExpired,
          isWarning,
          status: isExpired ? 'expired' : isWarning ? 'warning' : 'active'
        };
      });

      res.json({ tokens: tokensWithStatus });
    } catch (error: any) {
      console.error('Get integration tokens error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Record or update integration token (Admin only)
  app.post("/api/system/integration-tokens", async (req, res) => {
    try {
      const user = await getDemoUser();
      if (!requireAdmin(user)) {
        return res.status(404).json({ error: "Not Found" });
      }

      const { db } = await import('./db');
      const { integrationTokens, insertIntegrationTokenSchema } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const validated = insertIntegrationTokenSchema.parse(req.body);

      // Check if token already exists
      const existing = await db
        .select()
        .from(integrationTokens)
        .where(eq(integrationTokens.provider, validated.provider))
        .limit(1);

      let result;
      if (existing.length > 0) {
        // Update existing token
        result = await db
          .update(integrationTokens)
          .set({
            issuedAt: validated.issuedAt,
            expiresAt: validated.expiresAt,
            lastWarnedAt: null, // Reset warning
            notes: validated.notes,
            updatedAt: new Date()
          })
          .where(eq(integrationTokens.provider, validated.provider))
          .returning();
      } else {
        // Insert new token
        result = await db
          .insert(integrationTokens)
          .values(validated)
          .returning();
      }

      await recordAudit(
        user.id,
        'integration_token_update',
        result[0].id,
        'integration_tokens',
        { provider: validated.provider }
      );

      res.json({ success: true, token: result[0] });
    } catch (error: any) {
      console.error('Save integration token error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============== Daily Status (Completion Tracking) ==============

  // Get month's daily status for calendar view
  app.get("/api/daily-status/month/:year/:month", async (req, res) => {
    try {
      const user = await getDemoUser();
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month); // 1-12
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: "Invalid year or month" });
      }

      const { db } = await import('./db');
      const { dailyStatus } = await import('@shared/schema');
      const { and, eq, gte, lte } = await import('drizzle-orm');

      // Calculate first and last day of month
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed in Date
      const endDate = new Date(year, month, 0); // Day 0 of next month = last day of this month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const statusRecords = await db
        .select()
        .from(dailyStatus)
        .where(
          and(
            eq(dailyStatus.userId, user.id),
            gte(dailyStatus.day, startDateStr),
            lte(dailyStatus.day, endDateStr)
          )
        )
        .orderBy(dailyStatus.day);

      res.json({ statuses: statusRecords });
    } catch (error: any) {
      console.error('Get monthly status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get today's daily status
  app.get("/api/daily-status/today", async (req, res) => {
    try {
      const user = await getDemoUser();
      const today = new Date().toISOString().split('T')[0];

      const { db } = await import('./db');
      const { dailyStatus } = await import('@shared/schema');
      const { and, eq } = await import('drizzle-orm');

      const [status] = await db
        .select()
        .from(dailyStatus)
        .where(
          and(
            eq(dailyStatus.userId, user.id),
            eq(dailyStatus.day, today)
          )
        )
        .limit(1);

      res.json({ status: status || null });
    } catch (error: any) {
      console.error('Get today status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle daily completion status
  app.post("/api/daily-status/toggle", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { day } = req.body; // YYYY-MM-DD format

      if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      const { db } = await import('./db');
      const { dailyStatus } = await import('@shared/schema');
      const { and, eq } = await import('drizzle-orm');
      const { sql } = await import('drizzle-orm');

      // Check if record exists
      const [existing] = await db
        .select()
        .from(dailyStatus)
        .where(
          and(
            eq(dailyStatus.userId, user.id),
            eq(dailyStatus.day, day)
          )
        )
        .limit(1);

      let result;
      
      if (existing) {
        // Toggle existing record
        const newCompleted = !existing.completed;
        const [updated] = await db
          .update(dailyStatus)
          .set({
            completed: newCompleted,
            completedAt: newCompleted ? new Date() : null,
            autoCompleted: false, // Manual toggle always sets auto to false
            autodoneReason: newCompleted ? 'manual' : null, // Set reason when completing manually
            updatedAt: new Date()
          })
          .where(eq(dailyStatus.id, existing.id))
          .returning();
        
        result = updated;
      } else {
        // Create new record (default to completed)
        const [created] = await db
          .insert(dailyStatus)
          .values({
            userId: user.id,
            day,
            completed: true,
            completedAt: new Date(),
            autoCompleted: false,
            autodoneReason: 'manual' // Manual completion
          })
          .returning();
        
        result = created;
      }

      res.json({ status: result });
    } catch (error: any) {
      console.error('Toggle daily status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get current streak
  app.get("/api/daily-status/streak", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { db } = await import('./db');
      const { dailyStatus } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');
      const { calcStreakFromRecords } = await import('@shared/utils/streak');

      // Get all completed days for this user, ordered by date descending
      const records = await db
        .select({
          day: dailyStatus.day,
          completed: dailyStatus.completed
        })
        .from(dailyStatus)
        .where(eq(dailyStatus.userId, user.id))
        .orderBy(desc(dailyStatus.day));

      const streak = calcStreakFromRecords(records);

      res.json({ streak });
    } catch (error: any) {
      console.error('Get streak error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific day's detail
  app.get("/api/daily-status/detail/:day", async (req, res) => {
    try {
      const user = await getDemoUser();
      const { day } = req.params; // YYYY-MM-DD format
      const { db } = await import('./db');
      const { dailyTargets, foodLogs, waterLogs, dailyStatus, userProfiles } = await import('@shared/schema');
      const { eq, and, sql: sqlOp } = await import('drizzle-orm');
      const { evaluateDay } = await import('@shared/utils/streak');

      // Get targets for this day
      const targets = await db.select()
        .from(dailyTargets)
        .where(and(
          eq(dailyTargets.userId, user.id),
          eq(dailyTargets.date, day)
        ))
        .limit(1);
      
      const target = targets[0];
      if (!target) {
        return res.status(404).json({ error: 'No target data for this day' });
      }

      // Get food logs for this day - need to filter by date from datetime
      const dayStart = new Date(day + 'T00:00:00');
      const dayEnd = new Date(day + 'T23:59:59');
      
      const foods = await db.select()
        .from(foodLogs)
        .where(and(
          eq(foodLogs.userId, user.id),
          sqlOp`DATE(${foodLogs.datetime}) = ${day}`
        ));

      // Get water logs for this day - same date filtering
      const waters = await db.select()
        .from(waterLogs)
        .where(and(
          eq(waterLogs.userId, user.id),
          sqlOp`DATE(${waterLogs.datetime}) = ${day}`
        ));

      // Calculate current values
      const current = {
        protein: foods.reduce((sum, f) => sum + f.proteinG, 0),
        kcal: foods.reduce((sum, f) => sum + f.kcal, 0),
        water: waters.reduce((sum, w) => sum + w.amountOz, 0)
      };

      // Get user profile for streak config
      const [profile] = await db.select()
        .from(userProfiles)
        .where(eq(userProfiles.id, user.id))
        .limit(1);

      // Calculate status using evaluateDay
      const dayStatus = evaluateDay({
        protein: current.protein,
        proteinTarget: target.proteinG,
        kcal: current.kcal,
        kcalTarget: target.kcal,
        water: current.water,
        waterTarget: target.waterOz
      }, {
        waterMustMeet: profile?.waterMustMeet || false,
        kcalWindow: profile?.kcalWindow || 0.10
      });

      // Get daily status record
      const statusRecords = await db.select()
        .from(dailyStatus)
        .where(and(
          eq(dailyStatus.userId, user.id),
          eq(dailyStatus.day, day)
        ))
        .limit(1);

      const statusRecord = statusRecords[0];

      res.json({
        day,
        completed: statusRecord?.completed || false,
        status: dayStatus,
        protein: current.protein,
        proteinTarget: target.proteinG,
        kcal: current.kcal,
        kcalTarget: target.kcal,
        water: current.water,
        waterTarget: target.waterOz
      });
    } catch (error: any) {
      console.error('Get day detail error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
