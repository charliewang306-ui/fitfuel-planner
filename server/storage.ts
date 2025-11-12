// Reference: javascript_database blueprint integration
import {
  userProfiles,
  dailyTargets,
  foodItems,
  foodBarcodes,
  foodLogs,
  waterLogs,
  checkinWeights,
  reminders,
  mealPlans,
  mealPlanItems,
  aiMealPlans,
  aiCoachSessions,
  aiUsageLimits,
  proteinPowderPresets,
  trainingLogs,
  type UserProfile,
  type InsertUserProfile,
  type DailyTarget,
  type InsertDailyTarget,
  type FoodItem,
  type InsertFoodItem,
  type FoodBarcode,
  type InsertFoodBarcode,
  type FoodLog,
  type InsertFoodLog,
  type WaterLog,
  type InsertWaterLog,
  type CheckinWeight,
  type InsertCheckinWeight,
  type Reminder,
  type InsertReminder,
  type MealPlan,
  type InsertMealPlan,
  type MealPlanItem,
  type InsertMealPlanItem,
  type AiMealPlan,
  type InsertAiMealPlan,
  type AiCoachSession,
  type InsertAiCoachSession,
  type AiUsageLimit,
  type InsertAiUsageLimit,
  type ProteinPowderPreset,
  type TrainingLog,
  type InsertTrainingLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, ilike, or, sql } from "drizzle-orm";

export interface IStorage {
  // User Profile
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;

  // Daily Targets
  getDailyTarget(userId: string, date: string): Promise<DailyTarget | undefined>;
  createDailyTarget(target: InsertDailyTarget): Promise<DailyTarget>;
  
  // Food Items
  getFoodItem(id: string): Promise<FoodItem | undefined>;
  getFoodItemByExternalId(externalId: string): Promise<FoodItem | undefined>;
  searchFoodItems(query: string, limit?: number): Promise<FoodItem[]>;
  getAllFoodItems(): Promise<FoodItem[]>;
  createFoodItem(item: InsertFoodItem): Promise<FoodItem>;
  getUserContributions(userId: string): Promise<FoodItem[]>;
  
  // Food Barcodes
  getFoodByBarcode(gtin: string): Promise<(FoodBarcode & { food: FoodItem }) | undefined>;
  createFoodBarcode(barcode: InsertFoodBarcode): Promise<FoodBarcode>;
  
  // Food Logs
  getFoodLogsByDate(userId: string, date: string): Promise<FoodLog[]>;
  getFoodLog(id: string): Promise<FoodLog | undefined>;
  createFoodLog(log: InsertFoodLog): Promise<FoodLog>;
  updateFoodLog(id: string, log: Partial<InsertFoodLog>): Promise<FoodLog | undefined>;
  deleteFoodLog(id: string): Promise<void>;
  
  // Water Logs
  getWaterLogsByDate(userId: string, date: string): Promise<WaterLog[]>;
  getWaterLogById(id: string): Promise<WaterLog | undefined>;
  createWaterLog(log: InsertWaterLog): Promise<WaterLog>;
  updateWaterLog(id: string, log: Partial<InsertWaterLog>): Promise<WaterLog | undefined>;
  deleteWaterLog(id: string): Promise<void>;
  
  // Checkin Weights
  getWeightsByDateRange(userId: string, startDate: string, endDate: string): Promise<CheckinWeight[]>;
  getWeightByDate(userId: string, date: string): Promise<CheckinWeight | undefined>;
  getLatestWeight(userId: string): Promise<CheckinWeight | undefined>;
  createCheckinWeight(weight: InsertCheckinWeight): Promise<CheckinWeight>;
  updateCheckinWeight(id: string, weight: Partial<InsertCheckinWeight>): Promise<CheckinWeight | undefined>;
  
  // Reminders
  getRemindersByDate(userId: string, date: string): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, reminder: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteRemindersByDate(userId: string, date: string): Promise<void>;
  deleteReminder(id: string): Promise<void>;
  
  // Meal Plans
  getMealPlans(userId: string): Promise<MealPlan[]>;
  getMealPlan(id: string): Promise<MealPlan | undefined>;
  createMealPlan(plan: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(id: string, plan: Partial<InsertMealPlan>): Promise<MealPlan | undefined>;
  deleteMealPlan(id: string): Promise<void>;
  getMealPlanItems(mealPlanId: string): Promise<MealPlanItem[]>;
  createMealPlanItem(item: InsertMealPlanItem): Promise<MealPlanItem>;
  updateMealPlanItem(id: string, item: Partial<InsertMealPlanItem>): Promise<MealPlanItem | undefined>;
  deleteMealPlanItem(id: string): Promise<void>;
  
  // AI Meal Plans
  getAiMealPlans(userId: string, limit?: number): Promise<AiMealPlan[]>;
  getAiMealPlansByDate(userId: string, date: string): Promise<AiMealPlan[]>;
  getAiMealPlanByUuid(userId: string, uuid: string): Promise<AiMealPlan | undefined>;
  createAiMealPlan(plan: InsertAiMealPlan): Promise<AiMealPlan>;
  updateAiMealPlan(id: string, plan: Partial<InsertAiMealPlan>): Promise<AiMealPlan | undefined>;
  
  // AI Coach Sessions
  getAiCoachSessions(userId: string, limit?: number): Promise<AiCoachSession[]>;
  getAiCoachSessionsByDate(userId: string, date: string): Promise<AiCoachSession[]>;
  createAiCoachSession(session: InsertAiCoachSession): Promise<AiCoachSession>;
  updateAiCoachSession(id: string, session: Partial<InsertAiCoachSession>): Promise<AiCoachSession | undefined>;
  
  // AI Usage Limits
  checkUsageLimit(userId: string, featureType: string, date: string): Promise<{ allowed: boolean; current: number; limit: number }>;
  incrementUsage(userId: string, featureType: string, date: string): Promise<AiUsageLimit>;
  getUsageLimitByDate(userId: string, featureType: string, date: string): Promise<AiUsageLimit | undefined>;
  
  // Protein Powder Presets
  getProteinPowderPresets(userId: string): Promise<ProteinPowderPreset[]>;
  getProteinPowderPreset(id: string): Promise<ProteinPowderPreset | undefined>;
  createProteinPowderPreset(preset: Partial<ProteinPowderPreset>): Promise<ProteinPowderPreset>;
  updateProteinPowderPreset(id: string, preset: Partial<ProteinPowderPreset>): Promise<ProteinPowderPreset | undefined>;
  deleteProteinPowderPreset(id: string): Promise<void>;
  unsetDefaultProteinPreset(userId: string): Promise<void>;
  
  // Training Logs
  getTrainingLogsByDateRange(userId: string, startDate: string, endDate: string): Promise<TrainingLog[]>;
  getLatestTrainingLog(userId: string): Promise<TrainingLog | undefined>;
  getTrainingLogByDate(userId: string, date: string): Promise<TrainingLog | undefined>;
  createTrainingLog(log: Partial<TrainingLog>): Promise<TrainingLog>;
  updateTrainingLog(id: string, log: Partial<TrainingLog>): Promise<TrainingLog | undefined>;
  deleteTrainingLog(id: string): Promise<void>;
  
  // Convenience method for routes
  getFood(id: string): Promise<FoodItem | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User Profile
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
    return profile || undefined;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db
      .insert(userProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async updateUserProfile(id: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.id, id))
      .returning();
    return updated || undefined;
  }

  // Daily Targets
  async getDailyTarget(userId: string, date: string): Promise<DailyTarget | undefined> {
    const [target] = await db
      .select()
      .from(dailyTargets)
      .where(and(
        eq(dailyTargets.userId, userId),
        eq(dailyTargets.date, date)
      ));
    return target || undefined;
  }

  async createDailyTarget(target: InsertDailyTarget): Promise<DailyTarget> {
    // Use UPSERT to handle existing targets for the same date
    // Delete existing target for this user and date first
    await db
      .delete(dailyTargets)
      .where(
        and(
          eq(dailyTargets.userId, target.userId),
          eq(dailyTargets.date, target.date)
        )
      );
    
    // Insert new target
    const [created] = await db
      .insert(dailyTargets)
      .values(target)
      .returning();
    return created;
  }

  // Food Items
  async getFoodItem(id: string): Promise<FoodItem | undefined> {
    const [item] = await db.select().from(foodItems).where(eq(foodItems.id, id));
    return item || undefined;
  }

  async getFoodItemByExternalId(externalId: string): Promise<FoodItem | undefined> {
    const [item] = await db.select().from(foodItems).where(eq(foodItems.externalId, externalId));
    return item || undefined;
  }

  async searchFoodItems(query: string, limit: number = 20): Promise<FoodItem[]> {
    // Enhanced search: name, brand, tags, and multilingual names
    // This supports both Chinese and English keywords across all languages
    return db
      .select()
      .from(foodItems)
      .where(
        or(
          ilike(foodItems.name, `%${query}%`),
          ilike(foodItems.brand, `%${query}%`),
          // Search within multilingual names JSONB field
          sql`${foodItems.names}::text ILIKE ${`%${query}%`}`,
          // Note: array_to_string allows searching within array tags
          sql`array_to_string(${foodItems.tags}, ',') ILIKE ${`%${query}%`}`
        )
      )
      .limit(limit);
  }

  async getAllFoodItems(): Promise<FoodItem[]> {
    return db.select().from(foodItems).where(eq(foodItems.isActive, true));
  }

  async getUserContributions(userId: string): Promise<FoodItem[]> {
    return db.select()
      .from(foodItems)
      .where(eq(foodItems.contributedBy, userId))
      .orderBy(desc(foodItems.createdAt));
  }

  async createFoodItem(item: InsertFoodItem): Promise<FoodItem> {
    const [created] = await db
      .insert(foodItems)
      .values(item)
      .returning();
    return created;
  }

  // Food Barcodes
  async getFoodByBarcode(gtin: string): Promise<(FoodBarcode & { food: FoodItem }) | undefined> {
    const result = await db
      .select()
      .from(foodBarcodes)
      .leftJoin(foodItems, eq(foodBarcodes.foodId, foodItems.id))
      .where(eq(foodBarcodes.gtin, gtin));
    
    if (result.length === 0 || !result[0].food_items) return undefined;
    
    return {
      ...result[0].food_barcodes,
      food: result[0].food_items
    };
  }

  async createFoodBarcode(barcode: InsertFoodBarcode): Promise<FoodBarcode> {
    const [created] = await db
      .insert(foodBarcodes)
      .values(barcode)
      .returning();
    return created;
  }

  // Food Logs
  async getFoodLogsByDate(userId: string, date: string): Promise<FoodLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const results = await db
      .select({
        foodLog: foodLogs,
        foodName: foodItems.name,
        foodNames: foodItems.names
      })
      .from(foodLogs)
      .leftJoin(foodItems, eq(foodLogs.foodId, foodItems.id))
      .where(
        and(
          eq(foodLogs.userId, userId),
          gte(foodLogs.datetime, startOfDay),
          lte(foodLogs.datetime, endOfDay)
        )
      )
      .orderBy(desc(foodLogs.datetime));
    
    return results.map(r => ({ 
      ...r.foodLog, 
      foodName: r.foodName || 'Unknown Food',
      foodNames: r.foodNames || null
    })) as any;
  }

  async getFoodLog(id: string): Promise<FoodLog | undefined> {
    const [log] = await db
      .select()
      .from(foodLogs)
      .where(eq(foodLogs.id, id));
    return log || undefined;
  }

  async createFoodLog(log: InsertFoodLog): Promise<FoodLog> {
    const [created] = await db
      .insert(foodLogs)
      .values(log)
      .returning();
    return created;
  }

  async updateFoodLog(id: string, log: Partial<InsertFoodLog>): Promise<FoodLog | undefined> {
    const [updated] = await db
      .update(foodLogs)
      .set(log)
      .where(eq(foodLogs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFoodLog(id: string): Promise<void> {
    await db
      .delete(foodLogs)
      .where(eq(foodLogs.id, id));
  }

  // Water Logs
  async getWaterLogsByDate(userId: string, date: string): Promise<WaterLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return db
      .select()
      .from(waterLogs)
      .where(
        and(
          eq(waterLogs.userId, userId),
          gte(waterLogs.datetime, startOfDay),
          lte(waterLogs.datetime, endOfDay)
        )
      )
      .orderBy(desc(waterLogs.datetime));
  }

  async getWaterLogById(id: string): Promise<WaterLog | undefined> {
    const [log] = await db
      .select()
      .from(waterLogs)
      .where(eq(waterLogs.id, id));
    return log || undefined;
  }

  async createWaterLog(log: InsertWaterLog): Promise<WaterLog> {
    const [created] = await db
      .insert(waterLogs)
      .values(log)
      .returning();
    return created;
  }

  async updateWaterLog(id: string, log: Partial<InsertWaterLog>): Promise<WaterLog | undefined> {
    const [updated] = await db
      .update(waterLogs)
      .set(log)
      .where(eq(waterLogs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWaterLog(id: string): Promise<void> {
    await db
      .delete(waterLogs)
      .where(eq(waterLogs.id, id));
  }

  // Checkin Weights
  async getWeightsByDateRange(userId: string, startDate: string, endDate: string): Promise<CheckinWeight[]> {
    return db
      .select()
      .from(checkinWeights)
      .where(
        and(
          eq(checkinWeights.userId, userId),
          gte(checkinWeights.date, startDate),
          lte(checkinWeights.date, endDate)
        )
      )
      .orderBy(checkinWeights.date);
  }

  async getWeightByDate(userId: string, date: string): Promise<CheckinWeight | undefined> {
    const [weight] = await db
      .select()
      .from(checkinWeights)
      .where(and(
        eq(checkinWeights.userId, userId),
        eq(checkinWeights.date, date)
      ));
    return weight || undefined;
  }

  async getLatestWeight(userId: string): Promise<CheckinWeight | undefined> {
    const [weight] = await db
      .select()
      .from(checkinWeights)
      .where(eq(checkinWeights.userId, userId))
      .orderBy(desc(checkinWeights.date))
      .limit(1);
    return weight || undefined;
  }

  async createCheckinWeight(weight: InsertCheckinWeight): Promise<CheckinWeight> {
    const [created] = await db
      .insert(checkinWeights)
      .values(weight)
      .returning();
    return created;
  }

  async updateCheckinWeight(id: string, weight: Partial<InsertCheckinWeight>): Promise<CheckinWeight | undefined> {
    const [updated] = await db
      .update(checkinWeights)
      .set(weight)
      .where(eq(checkinWeights.id, id))
      .returning();
    return updated || undefined;
  }

  // Reminders
  async getRemindersByDate(userId: string, date: string): Promise<Reminder[]> {
    return db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.date, date)
        )
      )
      .orderBy(reminders.scheduledTime);
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, id));
    return reminder || undefined;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [created] = await db
      .insert(reminders)
      .values(reminder)
      .returning();
    return created;
  }

  async updateReminder(id: string, reminder: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const [updated] = await db
      .update(reminders)
      .set(reminder)
      .where(eq(reminders.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRemindersByDate(userId: string, date: string): Promise<void> {
    await db
      .delete(reminders)
      .where(and(
        eq(reminders.userId, userId),
        eq(reminders.date, date)
      ));
  }

  async deleteReminder(id: string): Promise<void> {
    await db
      .delete(reminders)
      .where(eq(reminders.id, id));
  }

  // Meal Plans
  async getMealPlans(userId: string): Promise<MealPlan[]> {
    return db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.userId, userId))
      .orderBy(desc(mealPlans.createdAt));
  }

  async getMealPlan(id: string): Promise<MealPlan | undefined> {
    const [plan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.id, id));
    return plan || undefined;
  }

  async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
    const [created] = await db
      .insert(mealPlans)
      .values(plan)
      .returning();
    return created;
  }

  async getMealPlanItems(mealPlanId: string): Promise<MealPlanItem[]> {
    return db
      .select()
      .from(mealPlanItems)
      .where(eq(mealPlanItems.mealPlanId, mealPlanId))
      .orderBy(mealPlanItems.date, mealPlanItems.mealType);
  }

  async createMealPlanItem(item: InsertMealPlanItem): Promise<MealPlanItem> {
    const [created] = await db
      .insert(mealPlanItems)
      .values(item)
      .returning();
    return created;
  }

  async updateMealPlan(id: string, plan: Partial<InsertMealPlan>): Promise<MealPlan | undefined> {
    const [updated] = await db
      .update(mealPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(mealPlans.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMealPlan(id: string): Promise<void> {
    await db
      .delete(mealPlans)
      .where(eq(mealPlans.id, id));
  }

  async updateMealPlanItem(id: string, item: Partial<InsertMealPlanItem>): Promise<MealPlanItem | undefined> {
    const [updated] = await db
      .update(mealPlanItems)
      .set(item)
      .where(eq(mealPlanItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMealPlanItem(id: string): Promise<void> {
    await db
      .delete(mealPlanItems)
      .where(eq(mealPlanItems.id, id));
  }

  // AI Meal Plans
  async getAiMealPlans(userId: string, limit: number = 10): Promise<AiMealPlan[]> {
    return db
      .select()
      .from(aiMealPlans)
      .where(eq(aiMealPlans.userId, userId))
      .orderBy(desc(aiMealPlans.createdAt))
      .limit(limit);
  }

  async getAiMealPlansByDate(userId: string, date: string): Promise<AiMealPlan[]> {
    return db
      .select()
      .from(aiMealPlans)
      .where(and(
        eq(aiMealPlans.userId, userId),
        eq(aiMealPlans.targetDate, date)
      ))
      .orderBy(desc(aiMealPlans.createdAt));
  }

  async getAiMealPlanByUuid(userId: string, uuid: string): Promise<AiMealPlan | undefined> {
    const [plan] = await db
      .select()
      .from(aiMealPlans)
      .where(and(
        eq(aiMealPlans.userId, userId),
        eq(aiMealPlans.planUuid, uuid)
      ));
    return plan || undefined;
  }

  async createAiMealPlan(plan: InsertAiMealPlan): Promise<AiMealPlan> {
    const [created] = await db
      .insert(aiMealPlans)
      .values(plan)
      .returning();
    return created;
  }

  async updateAiMealPlan(id: string, plan: Partial<InsertAiMealPlan>): Promise<AiMealPlan | undefined> {
    const [updated] = await db
      .update(aiMealPlans)
      .set(plan)
      .where(eq(aiMealPlans.id, id))
      .returning();
    return updated || undefined;
  }

  // AI Coach Sessions
  async getAiCoachSessions(userId: string, limit: number = 10): Promise<AiCoachSession[]> {
    return db
      .select()
      .from(aiCoachSessions)
      .where(eq(aiCoachSessions.userId, userId))
      .orderBy(desc(aiCoachSessions.createdAt))
      .limit(limit);
  }

  async getAiCoachSessionsByDate(userId: string, date: string): Promise<AiCoachSession[]> {
    return db
      .select()
      .from(aiCoachSessions)
      .where(and(
        eq(aiCoachSessions.userId, userId),
        eq(aiCoachSessions.sessionDate, date)
      ))
      .orderBy(aiCoachSessions.createdAt);
  }

  async createAiCoachSession(session: InsertAiCoachSession): Promise<AiCoachSession> {
    const [created] = await db
      .insert(aiCoachSessions)
      .values(session)
      .returning();
    return created;
  }

  async updateAiCoachSession(id: string, session: Partial<InsertAiCoachSession>): Promise<AiCoachSession | undefined> {
    const [updated] = await db
      .update(aiCoachSessions)
      .set(session)
      .where(eq(aiCoachSessions.id, id))
      .returning();
    return updated || undefined;
  }

  // AI Usage Limits
  async checkUsageLimit(userId: string, featureType: string, date: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const usage = await this.getUsageLimitByDate(userId, featureType, date);
    const currentCount = usage?.usageCount || 0;
    
    // Get user's subscription tier limit from pricing.ts
    const userProfile = await this.getUserProfile(userId);
    const dbTier = userProfile?.subscriptionTier || 'free';
    
    // Map database tier ('pro') to pricing tier ('premium')
    const tier = dbTier === 'pro' ? 'premium' : dbTier;
    
    // Import pricing at runtime to avoid circular dependencies
    const { FEATURES } = await import('@shared/pricing');
    const featureConfig = FEATURES[featureType as keyof typeof FEATURES];
    
    let maxLimit = 0;
    if (featureConfig && 'limit' in featureConfig && featureConfig.limit) {
      maxLimit = featureConfig.limit[tier as keyof typeof featureConfig.limit] || 0;
    }
    
    return {
      allowed: maxLimit === -1 || currentCount < maxLimit,
      current: currentCount,
      limit: maxLimit
    };
  }

  async incrementUsage(userId: string, featureType: string, date: string): Promise<AiUsageLimit> {
    const existing = await this.getUsageLimitByDate(userId, featureType, date);
    
    if (existing) {
      const [updated] = await db
        .update(aiUsageLimits)
        .set({ 
          usageCount: existing.usageCount + 1,
          updatedAt: new Date()
        })
        .where(eq(aiUsageLimits.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(aiUsageLimits)
        .values({
          userId,
          featureType,
          usageDate: date,
          usageCount: 1,
          lastResetAt: new Date()
        })
        .returning();
      return created;
    }
  }

  async getUsageLimitByDate(userId: string, featureType: string, date: string): Promise<AiUsageLimit | undefined> {
    const [usage] = await db
      .select()
      .from(aiUsageLimits)
      .where(and(
        eq(aiUsageLimits.userId, userId),
        eq(aiUsageLimits.featureType, featureType),
        eq(aiUsageLimits.usageDate, date)
      ));
    return usage || undefined;
  }

  // Protein Powder Presets
  async getProteinPowderPresets(userId: string): Promise<ProteinPowderPreset[]> {
    return db
      .select()
      .from(proteinPowderPresets)
      .where(eq(proteinPowderPresets.userId, userId))
      .orderBy(desc(proteinPowderPresets.isDefault), desc(proteinPowderPresets.createdAt));
  }

  async getProteinPowderPreset(id: string): Promise<ProteinPowderPreset | undefined> {
    const [preset] = await db
      .select()
      .from(proteinPowderPresets)
      .where(eq(proteinPowderPresets.id, id));
    return preset || undefined;
  }

  async createProteinPowderPreset(preset: Partial<ProteinPowderPreset>): Promise<ProteinPowderPreset> {
    const [created] = await db
      .insert(proteinPowderPresets)
      .values(preset as any)
      .returning();
    return created;
  }

  async updateProteinPowderPreset(id: string, preset: Partial<ProteinPowderPreset>): Promise<ProteinPowderPreset | undefined> {
    const [updated] = await db
      .update(proteinPowderPresets)
      .set({ ...preset, updatedAt: new Date() })
      .where(eq(proteinPowderPresets.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProteinPowderPreset(id: string): Promise<void> {
    await db
      .delete(proteinPowderPresets)
      .where(eq(proteinPowderPresets.id, id));
  }

  async unsetDefaultProteinPreset(userId: string): Promise<void> {
    await db
      .update(proteinPowderPresets)
      .set({ isDefault: false })
      .where(and(
        eq(proteinPowderPresets.userId, userId),
        eq(proteinPowderPresets.isDefault, true)
      ));
  }

  // Training Logs
  async getTrainingLogsByDateRange(userId: string, startDate: string, endDate: string): Promise<TrainingLog[]> {
    return db
      .select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.date, startDate),
        lte(trainingLogs.date, endDate)
      ))
      .orderBy(desc(trainingLogs.date));
  }

  async getLatestTrainingLog(userId: string): Promise<TrainingLog | undefined> {
    const [log] = await db
      .select()
      .from(trainingLogs)
      .where(eq(trainingLogs.userId, userId))
      .orderBy(desc(trainingLogs.date))
      .limit(1);
    return log || undefined;
  }

  async getTrainingLogByDate(userId: string, date: string): Promise<TrainingLog | undefined> {
    const [log] = await db
      .select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        eq(trainingLogs.date, date)
      ));
    return log || undefined;
  }

  async createTrainingLog(log: Partial<TrainingLog>): Promise<TrainingLog> {
    const [created] = await db
      .insert(trainingLogs)
      .values(log)
      .returning();
    return created;
  }

  async updateTrainingLog(id: string, log: Partial<TrainingLog>): Promise<TrainingLog | undefined> {
    const [updated] = await db
      .update(trainingLogs)
      .set(log)
      .where(eq(trainingLogs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTrainingLog(id: string): Promise<void> {
    await db
      .delete(trainingLogs)
      .where(eq(trainingLogs.id, id));
  }

  async getFood(id: string): Promise<FoodItem | undefined> {
    return this.getFoodItem(id);
  }
}

export const storage = new DatabaseStorage();
