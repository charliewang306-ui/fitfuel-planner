// FitFuel Pricing & Feature System
// Simplified: Single subscription tier - $14.99/month with 7-day trial

export type SubscriptionPlan = 'free' | 'premium';
export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'canceled' | 'past_due' | 'cancel_at_period_end';

// Stripe Price ID - Access via getPriceId() function
let _priceId = '';

/**
 * Initialize price ID from environment variables
 * Call this once at app startup (client) or import time (server)
 */
export function initializePriceId(env: Record<string, string | undefined>) {
  _priceId = env.VITE_STRIPE_PRICE_ID || env.STRIPE_PRICE_ID || '';

  if (!_priceId) {
    console.warn('⚠️  Missing Stripe Price ID (VITE_STRIPE_PRICE_ID or STRIPE_PRICE_ID)');
    console.warn('   Subscription checkout will not work until this is configured.');
  }
}

/**
 * Get Stripe Price ID for checkout
 */
export function getPriceId(): string {
  if (!_priceId) {
    console.error('Missing Stripe Price ID. Call initializePriceId() first.');
    return '';
  }
  return _priceId;
}

// Pricing configuration (client-safe display values)
export const PRICING = {
  premium: {
    amount: 14.99,
    currency: 'USD',
    interval: 'month' as const,
    trial: 7, // 7-day free trial
    displayText: '$14.99/月' as const,
    displayTextEn: '$14.99/month' as const,
    description: '试用7天 → 之后 $14.99/月，随时取消',
    descriptionEn: '7-day trial → then $14.99/month, cancel anytime'
  }
} as const;

// Feature gates - All features unlocked in premium
export type FeatureKey = 
  // Goals & Calculation
  | 'all_goal_modes'
  | 'custom_macros'
  
  // Timeline & Reminders
  | 'timeline_reminders'
  | 'timeline_advance_notice'
  | 'auto_ai_reminders'
  | 'water_reminders'
  
  // Food Database
  | 'barcode_scan'
  | 'usda_search'
  | 'protein_powder'
  
  // AI Features
  | 'ai_meal_plan'
  | 'ai_coach'
  | 'ocr_nutrition_label'
  | 'recipe_breakdown'
  
  // Data & Analytics
  | 'weekly_summary'
  | 'weight_tracking'
  | 'water_history'
  | 'streak_advanced_settings'
  | 'export_pdf'
  | 'cloud_sync'
  
  // UI & Experience
  | 'multi_language'
  | 'themes'
  | 'no_ads';

// Feature availability matrix
export const FEATURES: Record<FeatureKey, { free: boolean; premium: boolean; limit?: { free?: number; premium?: number } }> = {
  // Goals
  all_goal_modes: { free: false, premium: true }, // Cut/Bulk/Maintain
  custom_macros: { free: false, premium: true },
  
  // Timeline & Reminders
  timeline_reminders: { free: false, premium: true },
  timeline_advance_notice: { free: false, premium: true }, // Flexible reminder scheduling
  auto_ai_reminders: { free: false, premium: true }, // Morning & Evening AI nudges
  water_reminders: { free: false, premium: true, limit: { free: 0, premium: -1 } }, // Premium: unlimited water reminders
  
  // Food Database
  barcode_scan: { free: false, premium: true },
  usda_search: { free: false, premium: true }, // 100,000+ foods
  protein_powder: { free: false, premium: true },
  
  // AI Features
  ai_meal_plan: { free: false, premium: true, limit: { free: 0, premium: -1 } }, // Premium: unlimited
  ai_coach: { free: false, premium: true, limit: { free: 0, premium: 10 } }, // Premium: 10 conversations per day
  ocr_nutrition_label: { free: false, premium: true },
  recipe_breakdown: { free: false, premium: true },
  
  // Data
  weekly_summary: { free: false, premium: true },
  weight_tracking: { free: false, premium: true },
  water_history: { free: false, premium: true }, // View detailed water log history
  streak_advanced_settings: { free: false, premium: true },
  export_pdf: { free: false, premium: true },
  cloud_sync: { free: false, premium: true },
  
  // UX
  multi_language: { free: true, premium: true }, // Available to all
  themes: { free: false, premium: true },
  no_ads: { free: false, premium: true } // Ad-free experience for Premium
};

/**
 * Get user's plan from subscription status
 */
export function getPlanFromStatus(subscriptionStatus: string | null): SubscriptionPlan {
  if (!subscriptionStatus || subscriptionStatus === 'free') return 'free';
  
  // Active or trialing = premium access
  if (subscriptionStatus === 'trialing' || subscriptionStatus === 'active') {
    return 'premium';
  }
  
  // Canceled, past_due, or cancel_at_period_end = free (no access)
  return 'free';
}

/**
 * Check if a feature is enabled for a plan
 */
export function isFeatureEnabled(plan: SubscriptionPlan, feature: FeatureKey): boolean {
  return FEATURES[feature][plan] === true;
}

/**
 * Get feature limit for a plan (-1 means unlimited, 0 means disabled)
 */
export function getFeatureLimit(plan: SubscriptionPlan, feature: FeatureKey): number {
  const featureConfig = FEATURES[feature];
  if (!featureConfig.limit) return featureConfig[plan] ? -1 : 0;
  return featureConfig.limit[plan] ?? 0;
}

/**
 * Get readable plan name
 */
export function getPlanDisplayName(plan: SubscriptionPlan): string {
  return plan === 'premium' ? 'Premium' : 'Free';
}

/**
 * Check if subscription is active (trialing or active)
 */
export function isSubscriptionActive(status: string | null): boolean {
  return status === 'trialing' || status === 'active';
}

/**
 * Format subscription status for display
 */
export function getStatusDisplayText(status: string | null): string {
  const statusMap: Record<string, string> = {
    'free': '免费版',
    'trialing': '试用中',
    'active': '已激活',
    'canceled': '已取消',
    'past_due': '逾期未付',
    'cancel_at_period_end': '计费期末取消'
  };
  return statusMap[status || 'free'] || '未知';
}
