import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  real, 
  timestamp, 
  date,
  boolean,
  pgEnum,
  jsonb,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const goalEnum = pgEnum('goal', ['cut', 'maintain', 'bulk']);
export const activityEnum = pgEnum('activity', ['sedentary', 'light', 'moderate', 'active', 'very_active']);
export const sexEnum = pgEnum('sex', ['male', 'female']);
export const perUnitTypeEnum = pgEnum('per_unit_type', ['per100g', 'perserving']);
export const reminderTypeEnum = pgEnum('reminder_type', ['meal', 'water', 'snack', 'pre_workout', 'post_workout', 'ai_evening', 'ai_morning']);
export const reminderStatusEnum = pgEnum('reminder_status', ['pending', 'countdown', 'completed', 'delayed', 'skipped', 'missed', 'postponed']);
export const mealTypeEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'dinner', 'snack']);
export const foodCategoryEnum = pgEnum('food_category', ['general', 'protein_powder', 'supplement']);
export const roleEnum = pgEnum('role', ['user', 'admin', 'staff']);
export const beverageTypeEnum = pgEnum('beverage_type', [
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
]);
export const autodoneReasonEnum = pgEnum('autodone_reason', ['sleep', 'macro_ok', 'day_rollover', 'manual']);
export const workoutTypeEnum = pgEnum('workout_type', ['push', 'pull', 'legs']);

// UserProfile - User configuration and preferences
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weightLb: real("weight_lb").notNull(), // Weight in pounds
  heightCm: real("height_cm").notNull().default(170), // Height in centimeters (default: 170cm ~= 5'7")
  age: integer("age").notNull().default(30), // Age in years (for TDEE calculation)
  sex: sexEnum("sex").notNull().default('male'), // Biological sex (for TDEE calculation)
  goal: goalEnum("goal").notNull().default('maintain'), // cut, maintain, bulk
  activity: activityEnum("activity").notNull().default('moderate'),
  wakeTime: text("wake_time").notNull().default('07:00'), // HH:MM format
  sleepTime: text("sleep_time").notNull().default('23:00'), // HH:MM format
  unitPref: text("unit_pref").notNull().default('g'), // g, oz, kg
  decimalPlaces: integer("decimal_places").notNull().default(1), // 0 or 1
  
  // Meal reminder settings
  snacksCount: integer("snacks_count").notNull().default(0), // 0-2 snacks per day
  waterIntervalHours: real("water_interval_hours").notNull().default(2.5), // 2-3 hours between water reminders
  quietPeriodEnabled: boolean("quiet_period_enabled").notNull().default(true), // Disable notifications 30min before/after sleep
  autoCompletionEnabled: boolean("auto_completion_enabled").notNull().default(false), // Auto-complete daily status when targets met
  
  // Sleep-aware meal scheduling settings
  preSleepCutoffHours: real("pre_sleep_cutoff_hours").notNull().default(2.5), // No-eat window before sleep (2-3 hours)
  nightModeBufferMin: integer("night_mode_buffer_min").notNull().default(90), // Night mode starts X min before sleep
  lastReminderBufferMin: integer("last_reminder_buffer_min").notNull().default(60), // Last meal reminder X min before sleep
  allowLightProteinAfterCutoff: boolean("allow_light_protein_after_cutoff").notNull().default(true), // Allow light protein in cutoff window
  autoRescheduleMeals: boolean("auto_reschedule_meals").notNull().default(true), // Auto-adjust meals to avoid cutoff window
  minGapBetweenMealsMin: integer("min_gap_between_meals_min").notNull().default(120), // Minimum gap between meals (minutes)
  
  // Advanced streak control settings
  strictMode: boolean("strict_mode").notNull().default(false), // If true, 'partial' status breaks streak (treated as 'not')
  waterMustMeet: boolean("water_must_meet").notNull().default(false), // If true, water target must be met for 'completed' status
  kcalWindow: real("kcal_window").notNull().default(0.10), // Calorie tolerance: 0.08 (±8%), 0.10 (±10%), or 0.12 (±12%)
  
  // Water intake settings (Imperial-first)
  waterGoalOverrideOz: real("water_goal_override_oz"), // Custom daily water goal in oz (null = auto-calculate from weight)
  waterRemindersPerDay: integer("water_reminders_per_day").notNull().default(8), // Number of water reminders per day (6-10 recommended)
  todayExerciseMinutes: integer("today_exercise_minutes").notNull().default(0), // Today's exercise duration in minutes (for bonus calculation)
  
  // Advanced macro settings (for PRO users)
  proteinGPerKg: real("protein_g_per_kg"), // Custom protein target (g/kg), null = use defaults
  fatGPerKg: real("fat_g_per_kg"), // Custom fat target (g/kg), null = use defaults
  
  // Subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default('free'), // free, trialing, active, canceled, past_due, cancel_at_period_end
  subscriptionTier: text("subscription_tier"), // null, 'plus', 'pro' (will be simplified to single tier)
  subscriptionEndsAt: timestamp("subscription_ends_at"), // For trials and cancellations (legacy)
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"), // Current billing period end
  subscriptionTrialEnd: timestamp("subscription_trial_end"), // Trial period end
  paymentFingerprint: text("payment_fingerprint"), // Card fingerprint to prevent duplicate subscriptions
  
  // Admin/Role fields
  role: roleEnum("role").notNull().default('user'), // user, admin, staff
  isBanned: boolean("is_banned").notNull().default(false), // For user moderation
  bannedReason: text("banned_reason"), // Reason for ban (if banned)
  bannedAt: timestamp("banned_at"), // When user was banned
  bannedBy: varchar("banned_by"), // Admin who banned the user
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// DailyTargets - Auto-calculated nutrition targets per day
export const dailyTargets = pgTable("daily_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  date: date("date").notNull(), // YYYY-MM-DD
  kcal: real("kcal").notNull(),
  proteinG: real("protein_g").notNull(),
  fatG: real("fat_g").notNull(),
  carbsG: real("carbs_g").notNull(),
  fiberG: real("fiber_g").notNull(),
  waterOz: real("water_oz").notNull(),
  
  // Micronutrient RDI (Recommended Daily Intake) targets
  sodiumMg: real("sodium_mg").default(2300), // FDA recommendation: <2300mg/day
  vitaminAMcg: real("vitamin_a_mcg").default(900), // RDI: 900 mcg (male), 700 mcg (female)
  vitaminCMg: real("vitamin_c_mg").default(90), // RDI: 90 mg (male), 75 mg (female)
  vitaminDMcg: real("vitamin_d_mcg").default(15), // RDI: 15 mcg (600 IU)
  vitaminEMg: real("vitamin_e_mg").default(15), // RDI: 15 mg
  vitaminKMcg: real("vitamin_k_mcg").default(120), // RDI: 120 mcg (male), 90 mcg (female)
  vitaminB12Mcg: real("vitamin_b12_mcg").default(2.4), // RDI: 2.4 mcg
  calciumMg: real("calcium_mg").default(1000), // RDI: 1000 mg
  ironMg: real("iron_mg").default(8), // RDI: 8 mg (male), 18 mg (female)
  magnesiumMg: real("magnesium_mg").default(400), // RDI: 400 mg (male), 310 mg (female)
  zincMg: real("zinc_mg").default(11), // RDI: 11 mg (male), 8 mg (female)
  potassiumMg: real("potassium_mg").default(3400), // RDI: 3400 mg (male), 2600 mg (female)
  
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// FoodItem - Food nutrition database (per 100g base)
export const foodItems = pgTable("food_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Default/fallback name
  names: jsonb("names"), // Multilingual names: { "zh-CN": "鸡蛋", "en": "Egg", "es": "Huevo", ... }
  brand: text("brand"), // Optional brand name
  category: foodCategoryEnum("category").notNull().default('general'), // general, protein_powder, supplement
  flavor: text("flavor"), // For protein powder: chocolate, vanilla, etc.
  scoopSizeG: real("scoop_size_g"), // For protein powder: grams per scoop
  perUnitType: perUnitTypeEnum("per_unit_type").notNull().default('per100g'),
  gramsPerServing: real("grams_per_serving"), // Required if perUnitType is 'perserving'
  
  // Nutrition per 100g (base values)
  kcal100g: real("kcal_100g").notNull(),
  protein100g: real("protein_100g").notNull(),
  fat100g: real("fat_100g").notNull(),
  carbs100g: real("carbs_100g").notNull(),
  fiber100g: real("fiber_100g").notNull(),
  sodium100g: real("sodium_100g").notNull().default(0),
  
  // Micronutrients per 100g (12 core essential nutrients)
  vitaminAMcg100g: real("vitamin_a_mcg_100g").default(0), // Vitamin A (mcg RAE - Retinol Activity Equivalents)
  vitaminCMg100g: real("vitamin_c_mg_100g").default(0), // Vitamin C (mg)
  vitaminDMcg100g: real("vitamin_d_mcg_100g").default(0), // Vitamin D (mcg)
  vitaminEMg100g: real("vitamin_e_mg_100g").default(0), // Vitamin E (mg alpha-tocopherol)
  vitaminKMcg100g: real("vitamin_k_mcg_100g").default(0), // Vitamin K (mcg)
  vitaminB12Mcg100g: real("vitamin_b12_mcg_100g").default(0), // Vitamin B12 (mcg)
  calciumMg100g: real("calcium_mg_100g").default(0), // Calcium (mg)
  ironMg100g: real("iron_mg_100g").default(0), // Iron (mg)
  magnesiumMg100g: real("magnesium_mg_100g").default(0), // Magnesium (mg)
  zincMg100g: real("zinc_mg_100g").default(0), // Zinc (mg)
  potassiumMg100g: real("potassium_mg_100g").default(0), // Potassium (mg)
  
  // Tags for AI recommendation engine
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`), // e.g., ['protein', 'lean', 'poultry']
  
  // Source tracking
  source: text("source").notNull().default('builtin'), // builtin, user, ocr, official, usda
  externalId: text("external_id"), // External ID for imported foods (e.g., 'usda_12345', 'openfoodfacts_123')
  contributedBy: varchar("contributed_by").references(() => userProfiles.id, { onDelete: 'set null' }), // User who contributed this food
  isVerified: boolean("is_verified").notNull().default(false), // True for builtin/verified foods
  isPublic: boolean("is_public").notNull().default(false), // True if available to all users
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// FoodBarcode - Barcode to food item mapping (UPC/EAN/GTIN)
export const foodBarcodes = pgTable("food_barcodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gtin: text("gtin").notNull().unique(), // UPC/EAN barcode number
  foodId: varchar("food_id").notNull().references(() => foodItems.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// FoodLog - User food intake records
export const foodLogs = pgTable("food_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  foodId: varchar("food_id").notNull().references(() => foodItems.id, { onDelete: 'cascade' }),
  datetime: timestamp("datetime").notNull().defaultNow(),
  scheduleId: varchar("schedule_id").references(() => reminders.id, { onDelete: 'set null' }), // Link to reminder if logged from schedule
  
  // Amount consumed in grams (always stored as grams internally)
  amountG: real("amount_g").notNull(),
  
  // Calculated nutrition values for this specific log entry
  kcal: real("kcal").notNull(),
  proteinG: real("protein_g").notNull(),
  fatG: real("fat_g").notNull(),
  carbsG: real("carbs_g").notNull(),
  fiberG: real("fiber_g").notNull(),
  sodiumMg: real("sodium_mg").default(0),
  
  // Micronutrient values for this log entry
  vitaminAMcg: real("vitamin_a_mcg").default(0),
  vitaminCMg: real("vitamin_c_mg").default(0),
  vitaminDMcg: real("vitamin_d_mcg").default(0),
  vitaminEMg: real("vitamin_e_mg").default(0),
  vitaminKMcg: real("vitamin_k_mcg").default(0),
  vitaminB12Mcg: real("vitamin_b12_mcg").default(0),
  calciumMg: real("calcium_mg").default(0),
  ironMg: real("iron_mg").default(0),
  magnesiumMg: real("magnesium_mg").default(0),
  zincMg: real("zinc_mg").default(0),
  potassiumMg: real("potassium_mg").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// WaterLog - User water intake records
export const waterLogs = pgTable("water_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  datetime: timestamp("datetime").notNull().defaultNow(),
  scheduleId: varchar("schedule_id").references(() => reminders.id, { onDelete: 'set null' }), // Link to reminder if logged from schedule
  amountOz: real("amount_oz").notNull(), // Actual amount consumed in oz
  beverageType: beverageTypeEnum("beverage_type").notNull().default('water'), // Type of beverage
  effectiveOz: real("effective_oz").notNull().default(0), // Hydration-equivalent amount (after conversion factor)
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// CheckinWeight - Daily weight tracking for trend analysis
export const checkinWeights = pgTable("checkin_weights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  weightLb: real("weight_lb").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Reminders - Scheduled meal/water reminders
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  type: reminderTypeEnum("type").notNull(),
  scheduledTime: text("scheduled_time").notNull(), // HH:MM format
  status: reminderStatusEnum("status").notNull().default('pending'),
  delayedUntil: timestamp("delayed_until"), // If delayed, when to remind again
  completedAt: timestamp("completed_at"),
  templateId: varchar("template_id").references(() => foodItems.id), // Optional template food item (e.g., protein powder)
  date: date("date").notNull(), // Which day this reminder is for
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  dailyTargets: many(dailyTargets),
  foodLogs: many(foodLogs),
  waterLogs: many(waterLogs),
  checkinWeights: many(checkinWeights),
  reminders: many(reminders)
}));

export const dailyTargetsRelations = relations(dailyTargets, ({ one }) => ({
  user: one(userProfiles, {
    fields: [dailyTargets.userId],
    references: [userProfiles.id]
  })
}));

export const foodItemsRelations = relations(foodItems, ({ many }) => ({
  barcodes: many(foodBarcodes),
  logs: many(foodLogs)
}));

export const foodBarcodesRelations = relations(foodBarcodes, ({ one }) => ({
  food: one(foodItems, {
    fields: [foodBarcodes.foodId],
    references: [foodItems.id]
  })
}));

export const foodLogsRelations = relations(foodLogs, ({ one }) => ({
  user: one(userProfiles, {
    fields: [foodLogs.userId],
    references: [userProfiles.id]
  }),
  food: one(foodItems, {
    fields: [foodLogs.foodId],
    references: [foodItems.id]
  })
}));

export const waterLogsRelations = relations(waterLogs, ({ one }) => ({
  user: one(userProfiles, {
    fields: [waterLogs.userId],
    references: [userProfiles.id]
  })
}));

export const checkinWeightsRelations = relations(checkinWeights, ({ one }) => ({
  user: one(userProfiles, {
    fields: [checkinWeights.userId],
    references: [userProfiles.id]
  })
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(userProfiles, {
    fields: [reminders.userId],
    references: [userProfiles.id]
  })
}));

// Meal Plans - User's meal planning for future days
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Meal Plan Items - Individual meals within a plan
export const mealPlanItems = pgTable("meal_plan_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mealPlanId: varchar("meal_plan_id").notNull().references(() => mealPlans.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  foodId: varchar("food_id").notNull().references(() => foodItems.id, { onDelete: 'cascade' }),
  gramsAmount: real("grams_amount").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  user: one(userProfiles, {
    fields: [mealPlans.userId],
    references: [userProfiles.id]
  }),
  items: many(mealPlanItems)
}));

export const mealPlanItemsRelations = relations(mealPlanItems, ({ one }) => ({
  mealPlan: one(mealPlans, {
    fields: [mealPlanItems.mealPlanId],
    references: [mealPlans.id]
  }),
  food: one(foodItems, {
    fields: [mealPlanItems.foodId],
    references: [foodItems.id]
  })
}));

// Insert Schemas with Zod validation
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDailyTargetSchema = createInsertSchema(dailyTargets).omit({
  id: true,
  createdAt: true
});

export const insertFoodItemSchema = createInsertSchema(foodItems).omit({
  id: true,
  createdAt: true
}).extend({
  // Ensure gramsPerServing is required when perUnitType is 'perserving'
  gramsPerServing: z.number().optional()
});

export const insertFoodBarcodeSchema = createInsertSchema(foodBarcodes).omit({
  id: true,
  createdAt: true
});

export const insertFoodLogSchema = createInsertSchema(foodLogs).omit({
  id: true,
  createdAt: true
});

export const insertWaterLogSchema = createInsertSchema(waterLogs).omit({
  id: true,
  createdAt: true
});

export const insertCheckinWeightSchema = createInsertSchema(checkinWeights).omit({
  id: true,
  createdAt: true
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMealPlanItemSchema = createInsertSchema(mealPlanItems).omit({
  id: true,
  createdAt: true
});

// TypeScript Types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type DailyTarget = typeof dailyTargets.$inferSelect;
export type InsertDailyTarget = z.infer<typeof insertDailyTargetSchema>;

export type FoodItem = typeof foodItems.$inferSelect;
export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;

export type FoodBarcode = typeof foodBarcodes.$inferSelect;
export type InsertFoodBarcode = z.infer<typeof insertFoodBarcodeSchema>;

export type FoodLog = typeof foodLogs.$inferSelect;
export type InsertFoodLog = z.infer<typeof insertFoodLogSchema>;

export type WaterLog = typeof waterLogs.$inferSelect;
export type InsertWaterLog = z.infer<typeof insertWaterLogSchema>;

export type CheckinWeight = typeof checkinWeights.$inferSelect;
export type InsertCheckinWeight = z.infer<typeof insertCheckinWeightSchema>;

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;

export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;

export type MealPlanItem = typeof mealPlanItems.$inferSelect;
export type InsertMealPlanItem = z.infer<typeof insertMealPlanItemSchema>;

// AI Meal Plans - AI-generated daily meal plans
export const aiMealPlans = pgTable("ai_meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  planUuid: varchar("plan_uuid").notNull().unique(), // Unique plan identifier from AI
  targetDate: date("target_date").notNull(), // Date this plan is for
  
  // Total nutrition summary
  totalKcal: real("total_kcal").notNull(),
  totalProteinG: real("total_protein_g").notNull(),
  totalFatG: real("total_fat_g").notNull(),
  totalCarbsG: real("total_carbs_g").notNull(),
  
  // Complete meal plan data (JSONB) - contains meals array, grocery list, rationale, etc.
  planData: jsonb("plan_data").notNull(), // JSONB for structured querying
  
  // User preferences snapshot (for regeneration reference)
  userPreferences: jsonb("user_preferences"), // JSONB of preferences used
  
  // Usage tracking
  isApplied: boolean("is_applied").notNull().default(false), // Whether user applied this plan
  appliedAt: timestamp("applied_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// AI Coach Sessions - AI coaching conversations and recommendations
export const aiCoachSessions = pgTable("ai_coach_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  sessionDate: date("session_date").notNull(), // Date of the session
  sessionTime: timestamp("session_time").notNull().defaultNow(), // Exact timestamp
  
  // Trigger context
  triggerType: text("trigger_type").notNull(), // 'post_meal', 'evening_summary', 'morning_start'
  triggerTime: text("trigger_time"), // Local time when triggered (HH:MM)
  
  // Nutritional context (snapshot at time of session)
  currentKcal: real("current_kcal").notNull(),
  currentProteinG: real("current_protein_g").notNull(),
  currentFatG: real("current_fat_g").notNull(),
  currentCarbsG: real("current_carbs_g").notNull(),
  currentWaterOz: real("current_water_oz").notNull(),
  
  targetKcal: real("target_kcal").notNull(),
  targetProteinG: real("target_protein_g").notNull(),
  targetFatG: real("target_fat_g").notNull(),
  targetCarbsG: real("target_carbs_g").notNull(),
  targetWaterOz: real("target_water_oz").notNull(),
  
  // AI Response
  coachResponse: jsonb("coach_response").notNull(), // Full AI response JSONB
  recommendedPath: text("recommended_path"), // 'light_supplement', 'tomorrow_catchup', 'hungry_now', null
  
  // Conversation tracking (for Plus/Pro users)
  conversationTurns: integer("conversation_turns").notNull().default(0), // Number of follow-up questions
  conversationData: jsonb("conversation_data"), // JSONB array of conversation history
  
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// AI Usage Tracking - Track daily/3-day limits for AI features
export const aiUsageLimits = pgTable("ai_usage_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  featureType: text("feature_type").notNull(), // 'ai_meal_plan', 'ai_coach'
  usageDate: date("usage_date").notNull(), // Date of usage
  usageCount: integer("usage_count").notNull().default(0), // Count for that day
  lastResetAt: timestamp("last_reset_at").defaultNow(), // When counter was last reset
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  // Unique constraint: one row per user/feature/date to prevent duplicate counters
  uniqueUserFeatureDate: unique().on(table.userId, table.featureType, table.usageDate)
}));

// Relations for AI tables
export const aiMealPlansRelations = relations(aiMealPlans, ({ one }) => ({
  user: one(userProfiles, {
    fields: [aiMealPlans.userId],
    references: [userProfiles.id]
  })
}));

export const aiCoachSessionsRelations = relations(aiCoachSessions, ({ one }) => ({
  user: one(userProfiles, {
    fields: [aiCoachSessions.userId],
    references: [userProfiles.id]
  })
}));

export const aiUsageLimitsRelations = relations(aiUsageLimits, ({ one }) => ({
  user: one(userProfiles, {
    fields: [aiUsageLimits.userId],
    references: [userProfiles.id]
  })
}));

// Insert schemas for AI tables
export const insertAiMealPlanSchema = createInsertSchema(aiMealPlans).omit({
  id: true,
  createdAt: true
});

export const insertAiCoachSessionSchema = createInsertSchema(aiCoachSessions).omit({
  id: true,
  createdAt: true
});

export const insertAiUsageLimitSchema = createInsertSchema(aiUsageLimits).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// TypeScript types for AI tables
export type AiMealPlan = typeof aiMealPlans.$inferSelect;
export type InsertAiMealPlan = z.infer<typeof insertAiMealPlanSchema>;

export type AiCoachSession = typeof aiCoachSessions.$inferSelect;
export type InsertAiCoachSession = z.infer<typeof insertAiCoachSessionSchema>;

export type AiUsageLimit = typeof aiUsageLimits.$inferSelect;
export type InsertAiUsageLimit = z.infer<typeof insertAiUsageLimitSchema>;

// Daily Status - Daily completion tracking for habit formation
export const dailyStatus = pgTable("daily_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  day: date("day").notNull(), // Local date in YYYY-MM-DD format
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  autoCompleted: boolean("auto_completed").notNull().default(false), // Whether auto-completed by system
  autodoneReason: autodoneReasonEnum("autodone_reason"), // Reason for auto-completion: 'sleep', 'macro_ok', 'day_rollover', 'manual', or null
  notes: text("notes"), // Optional user notes for the day
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  uniqueUserDay: unique().on(table.userId, table.day)
}));

// Admin Audit Log - Records all admin actions
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull().references(() => userProfiles.id), // Admin who performed action
  action: text("action").notNull(), // e.g., 'grant_pro', 'ban_user', 'reset_quota', 'update_feature_flag'
  targetId: varchar("target_id"), // Target user (if applicable)
  targetType: text("target_type"), // 'user', 'subscription', 'feature', etc.
  metadata: jsonb("metadata"), // Additional context: { plan: 'pro', duration: 7, reason: '...' }
  ipAddress: text("ip_address"), // IP of admin
  userAgent: text("user_agent"), // Browser info
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// User Food Units - Custom units for food measurement
export const userFoodUnits = pgTable("user_food_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  foodKey: text("food_key").notNull(), // Food identifier: e.g. 'chicken_breast_raw', 'rice_cooked'
  unitName: text("unit_name").notNull(), // e.g., '一碗', 'big bowl', '我的份'
  gramsPerUnit: real("grams_per_unit").notNull(), // Grams per unit (e.g., 220 for '一碗米饭')
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  // Ensure unique user-food-unit combinations
  uniqueUserFoodUnit: unique().on(table.userId, table.foodKey, table.unitName)
}));

// Insert schema for daily status
export const insertDailyStatusSchema = createInsertSchema(dailyStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// TypeScript types for daily status
export type DailyStatus = typeof dailyStatus.$inferSelect;
export type InsertDailyStatus = z.infer<typeof insertDailyStatusSchema>;

// Insert schema for audit log
export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true
});

// TypeScript types
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Insert schema for user food units
export const insertUserFoodUnitSchema = createInsertSchema(userFoodUnits).omit({
  id: true,
  createdAt: true
});

// TypeScript types for user food units
export type UserFoodUnit = typeof userFoodUnits.$inferSelect;
export type InsertUserFoodUnit = z.infer<typeof insertUserFoodUnitSchema>;

// ProteinPowderPreset - User's saved protein powder brands and nutrition
export const proteinPowderPresets = pgTable("protein_powder_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  brandName: text("brand_name").notNull(), // Product/brand name (e.g., "Optimum Nutrition Gold Standard")
  scoopSizeGrams: real("scoop_size_grams").notNull(), // Grams per scoop (e.g., 30)
  kcalPerScoop: real("kcal_per_scoop").notNull(), // Calories per scoop
  proteinPerScoop: real("protein_per_scoop").notNull(), // Protein grams per scoop
  fatPerScoop: real("fat_per_scoop").notNull(), // Fat grams per scoop
  carbsPerScoop: real("carbs_per_scoop").notNull(), // Carbs grams per scoop
  isDefault: boolean("is_default").notNull().default(false), // Is this the user's default preset?
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Insert schema for protein powder presets
export const insertProteinPowderPresetSchema = createInsertSchema(proteinPowderPresets).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// TypeScript types for protein powder presets
export type ProteinPowderPreset = typeof proteinPowderPresets.$inferSelect;
export type InsertProteinPowderPreset = z.infer<typeof insertProteinPowderPresetSchema>;

// TrainingLog - User's workout tracking for PPL cycle
export const trainingLogs = pgTable("training_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  date: date("date").notNull(), // Training date (YYYY-MM-DD)
  workoutType: workoutTypeEnum("workout_type").notNull(), // push, pull, legs
  notes: text("notes"), // Optional user notes
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Insert schema for training logs
export const insertTrainingLogSchema = createInsertSchema(trainingLogs).omit({
  id: true,
  userId: true,
  createdAt: true
});

// TypeScript types for training logs
export type TrainingLog = typeof trainingLogs.$inferSelect;
export type InsertTrainingLog = z.infer<typeof insertTrainingLogSchema>;

// OAuth Integration Tokens - Tracks expiration of OAuth credentials
export const integrationProviderEnum = pgEnum('integration_provider', ['apple', 'google']);

export const integrationTokens = pgTable("integration_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: integrationProviderEnum("provider").notNull().unique(), // apple, google
  issuedAt: timestamp("issued_at").notNull(), // When JWT was generated
  expiresAt: timestamp("expires_at").notNull(), // When JWT will expire
  lastWarnedAt: timestamp("last_warned_at"), // Last warning sent (to prevent duplicates)
  notes: text("notes"), // Optional notes for admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Insert schema for integration tokens
export const insertIntegrationTokenSchema = createInsertSchema(integrationTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// TypeScript types for integration tokens
export type IntegrationToken = typeof integrationTokens.$inferSelect;
export type InsertIntegrationToken = z.infer<typeof insertIntegrationTokenSchema>;
