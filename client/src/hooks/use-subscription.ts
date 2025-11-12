import { useQuery } from "@tanstack/react-query";
import { getPlanFromStatus, isFeatureEnabled, getFeatureLimit, type SubscriptionPlan, type FeatureKey } from "@shared/pricing";

interface SubscriptionStatus {
  isPro: boolean;  // Legacy field - kept for backward compatibility
  isPlus: boolean; // Legacy field - kept for backward compatibility
  status: string;
  plan: SubscriptionPlan;
  trialEnd?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  subscriptionEndsAt?: Date | null;
}

export function useSubscription() {
  const { data, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription-status'],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Single-tier subscription: only 'free' or 'premium'
  const plan: SubscriptionPlan = data?.plan || getPlanFromStatus(data?.status || 'free');
  const isPremium = plan === 'premium';
  const isFree = plan === 'free';
  
  // Legacy support - isPro/isPlus now both map to isPremium
  const isPro = isPremium;
  const isPlus = isPremium;

  return {
    plan,
    isPro,     // Legacy alias for isPremium
    isPlus,    // Legacy alias for isPremium
    isFree,
    status: data?.status ?? 'free',
    isLoading,
    subscription: data,
    hasFeature: (feature: FeatureKey) => isFeatureEnabled(plan, feature),
    getLimit: (feature: FeatureKey) => getFeatureLimit(plan, feature)
  };
}
