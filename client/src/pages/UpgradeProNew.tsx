import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Sparkles, BarChart3, Camera, Database, Clock, ArrowLeft, Zap, TrendingUp, Shield, Smartphone, RefreshCw } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { PRICING } from "@shared/pricing";
import { useTranslation } from "react-i18next";
import { isIOSApp } from "@/lib/platform";

// Stripe Pricing Table configuration - Production keys
const PRICING_TABLE_ID = 'prctbl_1SPyhlCDDBrSBST59MXfK29E';
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51SNRuuCDDBrSBST5B2sQQEBSpCdyvS0VOQD3fp6BMGhlmTnf5hqcafjuRUHeCYtb0fbDsTl0eN5WTQFKQjDEuFPO00xQOXqx0h';
const STRIPE_ENABLED = !!(PRICING_TABLE_ID && STRIPE_PUBLISHABLE_KEY);

// Premium feature list - keys for translation
const PREMIUM_FEATURE_KEYS = [
  { icon: Zap, key: 'ai_meal_plan' },
  { icon: Sparkles, key: 'ai_coach' },
  { icon: Clock, key: 'ai_reminders' },
  { icon: BarChart3, key: 'nutrition_trends' },
  { icon: Camera, key: 'barcode_ocr' },
  { icon: Database, key: 'usda_database' },
  { icon: TrendingUp, key: 'weight_tracking' },
  { icon: Shield, key: 'advanced_streak' },
];

export default function UpgradePro() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { plan: currentPlan, isLoading: planLoading, status: subscriptionStatus } = useSubscription();
  
  // Cache platform detection result to avoid repeated calls in render
  const [isIOS] = useState(() => isIOSApp());
  
  // Fetch user profile to get user ID for Stripe client-reference-id
  const { data: profile } = useQuery<{ id: string }>({
    queryKey: ['/api/profile'],
  });

  if (planLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Already subscribed - show current plan
  if (currentPlan === 'premium') {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="mb-4"
          data-testid="button-back-home"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('upgrade:back_home')}
        </Button>

        <Card className="border-primary">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('upgrade:already_premium_title')}</CardTitle>
            <CardDescription className="text-base pt-2">
              {subscriptionStatus === 'trialing' && t('upgrade:already_premium_trialing')}
              {subscriptionStatus === 'active' && t('upgrade:already_premium_active')}
              {subscriptionStatus === 'cancel_at_period_end' && t('upgrade:already_premium_cancel')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {PREMIUM_FEATURE_KEYS.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover-elevate">
                    <Icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{t(`upgrade:premium_features.${feature.key}.label`)}</div>
                      <div className="text-sm text-muted-foreground">{t(`upgrade:premium_features.${feature.key}.detail`)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setLocation('/')} data-testid="button-go-home">
                {t('upgrade:start_using')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Free user - show upgrade offer
  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-8">
      <Button
        variant="ghost"
        onClick={() => setLocation('/')}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('upgrade:back_home')}
      </Button>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight" data-testid="text-upgrade-title">
          {t('upgrade:page_title')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('upgrade:page_subtitle')}
        </p>
      </div>

      {/* Main Premium Card */}
      <Card className="max-w-3xl mx-auto shadow-xl border-primary/20">
        <CardHeader className="text-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-t-lg pb-8">
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">Premium</CardTitle>
            <div className="space-y-1">
              <div className="text-5xl font-bold text-primary">{PRICING.premium.displayText}</div>
              <p className="text-muted-foreground">{PRICING.premium.description}</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-8 pb-8">
          {/* Features Grid */}
          <div className="space-y-6 mb-8">
            <h3 className="text-lg font-semibold text-center">{t('upgrade:all_features_title')}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {PREMIUM_FEATURE_KEYS.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{t(`upgrade:premium_features.${feature.key}.label`)}</div>
                      <div className="text-sm text-muted-foreground">{t(`upgrade:premium_features.${feature.key}.detail`)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* iOS App Store - No Stripe, use in-app purchase buttons */}
          {isIOS ? (
            <div className="space-y-4" data-testid="container-ios-purchase">
              <div className="text-center space-y-4 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-center mb-2">
                  <Smartphone className="w-8 h-8 text-primary" />
                </div>
                <p className="text-base font-medium text-foreground">
                  {t('upgrade:ios_purchase_title', 'Unlock Premium Features')}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {t('upgrade:ios_purchase_subtitle', 'Subscribe through the App Store to access all premium features')}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Button 
                  size="lg" 
                  className="w-full"
                  data-testid="button-unlock-premium"
                  onClick={() => {
                    // TODO: Implement iOS in-app purchase flow
                    alert('iOS in-app purchase coming soon! This will open App Store subscription.');
                  }}
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  {t('upgrade:unlock_premium', 'Unlock Premium')}
                </Button>

                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full"
                  data-testid="button-restore-purchases"
                  onClick={() => {
                    // TODO: Implement restore purchases
                    alert('Restore purchases coming soon! This will restore your existing subscription.');
                  }}
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  {t('upgrade:restore_purchases', 'Restore Purchases')}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-4">
                {t('upgrade:ios_terms', 'Subscription will be charged to your iTunes Account. Auto-renewal can be turned off in Account Settings.')}
              </p>
            </div>
          ) : (
            /* Web/Android - Show Stripe Pricing Table */
            <div className="space-y-4" data-testid="container-pricing-table">
              {STRIPE_ENABLED ? (
                <stripe-pricing-table
                  pricing-table-id={PRICING_TABLE_ID}
                  publishable-key={STRIPE_PUBLISHABLE_KEY}
                  client-reference-id={profile?.id || ''}
                />
              ) : (
                <div className="text-center space-y-4 p-8 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                  <p className="text-destructive font-medium">
                    {t('upgrade:stripe_not_configured')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('upgrade:stripe_config_help')}<br />
                    • VITE_STRIPE_PRICING_TABLE_ID<br />
                    • VITE_STRIPE_PUBLIC_KEY
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust Indicators */}
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{t('upgrade:trust_trial_days')}</div>
            <div className="text-sm text-muted-foreground">{t('upgrade:trust_trial_text')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{t('upgrade:trust_cancel_anytime')}</div>
            <div className="text-sm text-muted-foreground">{t('upgrade:trust_cancel_text')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{t('upgrade:trust_secure')}</div>
            <div className="text-sm text-muted-foreground">{t('upgrade:trust_secure_text')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
