import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { type FeatureKey } from "@shared/pricing";
import { useTranslation } from "react-i18next";

interface PaywallProps {
  feature: FeatureKey;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

const FEATURE_NAMES: Record<FeatureKey, string> = {
  goal_cut: 'features.goal_cut',
  goal_bulk: 'features.goal_bulk',
  custom_macros: 'features.custom_macros',
  timeline_unlimited: 'features.timeline_unlimited',
  timeline_edit: 'features.timeline_edit',
  timeline_advance_notice: 'features.timeline_advance_notice',
  barcode_scan: 'features.barcode_scan',
  usda_search: 'features.usda_search',
  usda_unlimited: 'features.usda_unlimited',
  protein_powder: 'features.protein_powder',
  ai_coach: 'features.ai_coach',
  ai_unlimited: 'features.ai_unlimited',
  smart_suggestions: 'features.smart_suggestions',
  history_unlimited: 'features.history_unlimited',
  weekly_stats: 'features.weekly_stats',
  export_pdf: 'features.export_pdf',
  cloud_sync: 'features.cloud_sync',
  water_history: 'features.water_history',
  themes: 'features.themes',
  multi_language: 'features.multi_language',
  no_ads: 'features.no_ads'
};

const FEATURE_PLANS: Record<FeatureKey, 'Plus' | 'Pro'> = {
  goal_cut: 'Plus',
  goal_bulk: 'Plus',
  custom_macros: 'Pro',
  timeline_unlimited: 'Pro',
  timeline_edit: 'Plus',
  timeline_advance_notice: 'Plus',
  barcode_scan: 'Pro',
  usda_search: 'Pro',
  usda_unlimited: 'Pro',
  protein_powder: 'Plus',
  ai_coach: 'Pro',
  ai_unlimited: 'Pro',
  smart_suggestions: 'Plus',
  history_unlimited: 'Pro',
  weekly_stats: 'Plus',
  export_pdf: 'Pro',
  cloud_sync: 'Pro',
  water_history: 'Plus',
  themes: 'Pro',
  multi_language: 'Plus',
  no_ads: 'Plus'
};

export function Paywall({ feature, title, description, children }: PaywallProps) {
  const { t } = useTranslation(['common']);
  const [, navigate] = useLocation();
  const requiredPlan = FEATURE_PLANS[feature];
  const featureNameKey = FEATURE_NAMES[feature];
  const featureName = title || t(`common:${featureNameKey}`);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          {featureName}
          <Badge variant="default">{requiredPlan}</Badge>
        </CardTitle>
        <CardDescription>
          {description || t('common:paywall.requiresPlan', { plan: requiredPlan })}
        </CardDescription>
      </CardHeader>
      
      {children && (
        <CardContent className="text-center text-sm text-muted-foreground">
          {children}
        </CardContent>
      )}
      
      <CardFooter className="flex flex-col gap-2">
        <Button 
          className="w-full" 
          onClick={() => navigate('/upgrade-pro')}
          data-testid="button-upgrade-pro"
        >
          {t('common:paywall.unlockFeatures', { plan: requiredPlan })}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          {requiredPlan === 'Pro' ? t('common:paywall.proPricing') : t('common:paywall.plusPricing')}
        </p>
      </CardFooter>
    </Card>
  );
}

interface PaywallGateProps {
  feature: FeatureKey;
  hasAccess: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PaywallGate({ feature, hasAccess, children, fallback }: PaywallGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <Paywall feature={feature} />;
}
