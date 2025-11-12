import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useState } from "react";

interface AdBannerProps {
  position?: 'top' | 'bottom' | 'middle';
  className?: string;
}

export function AdBanner({ position = 'bottom', className = '' }: AdBannerProps) {
  const { t } = useTranslation(['common']);
  const { hasFeature, plan } = useSubscription();
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Plus and Pro users don't see ads
  if (hasFeature('no_ads')) {
    return null;
  }

  // Allow users to dismiss ads temporarily
  if (dismissed) {
    return null;
  }

  return (
    <Card 
      className={`border-primary/30 bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 ${className}`}
      data-testid="ad-banner"
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Ad Label */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-0.5 border-muted-foreground/30 text-muted-foreground shrink-0"
            >
              {t('common:ad')}
            </Badge>
            <p className="text-sm text-foreground/90 truncate">
              {t('common:adBanner.message')}
            </p>
          </div>

          {/* Right: CTA Button */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => navigate('/upgrade-pro')}
              className="gap-1.5"
              data-testid="button-upgrade-from-ad"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('common:adBanner.upgrade')}</span>
              <span className="sm:hidden">{t('common:adBanner.upgradeShort')}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="h-8 w-8 p-0"
              data-testid="button-dismiss-ad"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Optional: Show pricing hint */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {t('common:adBanner.pricing')}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact ad banner for tight spaces
 */
export function CompactAdBanner({ className = '' }: { className?: string }) {
  const { t } = useTranslation(['common']);
  const { hasFeature } = useSubscription();
  const [, navigate] = useLocation();

  if (hasFeature('no_ads')) {
    return null;
  }

  return (
    <div 
      className={`flex items-center justify-between gap-2 p-2 rounded-md bg-primary/5 border border-primary/20 ${className}`}
      data-testid="ad-banner-compact"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Badge 
          variant="outline" 
          className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground shrink-0"
        >
          AD
        </Badge>
        <span className="text-xs text-muted-foreground truncate">
          {t('common:adBanner.compactMessage')}
        </span>
      </div>
      <Button
        size="sm"
        onClick={() => navigate('/upgrade-pro')}
        className="h-7 text-xs px-2 gap-1"
        data-testid="button-upgrade-from-compact-ad"
      >
        <Sparkles className="h-3 w-3" />
        Plus
      </Button>
    </div>
  );
}
