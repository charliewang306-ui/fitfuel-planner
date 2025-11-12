import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Sparkles, TrendingUp, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NutritionGuideCardProps {
  goal: 'bulk' | 'cut' | 'maintain';
  weightLb?: number;
}

export function NutritionGuideCard({ goal, weightLb }: NutritionGuideCardProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [isOpen, setIsOpen] = useState(false);

  const goalIcons = {
    bulk: <TrendingUp className="h-5 w-5" />,
    cut: <Activity className="h-5 w-5" />,
    maintain: <Sparkles className="h-5 w-5" />
  };

  const goalColors = {
    bulk: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
    cut: 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700',
    maintain: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700'
  };

  return (
    <Card className={`${goalColors[goal]} border-2`} data-testid="card-nutrition-guide">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {goalIcons[goal]}
            <CardTitle className="text-lg">{t('dashboard:nutrition_guide.title')}</CardTitle>
          </div>
          <Badge variant="outline">
            {t(`common:goals.${goal}`)}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {t(`dashboard:nutrition_guide.${goal}.summary`)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Reference Points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-start gap-1.5">
            <span className="text-primary font-semibold">•</span>
            <span>{t(`dashboard:nutrition_guide.${goal}.protein`)}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-primary font-semibold">•</span>
            <span>{t(`dashboard:nutrition_guide.${goal}.calories`)}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-primary font-semibold">•</span>
            <span>{t(`dashboard:nutrition_guide.${goal}.fat`)}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-primary font-semibold">•</span>
            <span>{t(`dashboard:nutrition_guide.${goal}.carbs`)}</span>
          </div>
        </div>

        {/* Water Guidance */}
        <div className="pt-2 border-t text-sm">
          <div className="flex items-start gap-1.5">
            <span className="text-blue-500 font-semibold">💧</span>
            <div>
              <div>{t('dashboard:nutrition_guide.water.guide')}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t('dashboard:nutrition_guide.water.note')}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Formula (Collapsible) */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-xs"
              data-testid="button-view-formula"
            >
              {t('dashboard:nutrition_guide.view_formula')}
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 text-xs text-muted-foreground pt-2">
            {weightLb && (
              <>
                <div>
                  <strong>{t('common:nutrition.protein')}:</strong>{' '}
                  {goal === 'bulk' && t('dashboard:nutrition_guide.formula.protein_bulk')}
                  {goal === 'cut' && t('dashboard:nutrition_guide.formula.protein_cut')}
                  {goal === 'maintain' && t('dashboard:nutrition_guide.formula.protein_maintain')}
                  {' '}{weightLb} {t('dashboard:nutrition_guide.formula.lb')}
                </div>
                <div>
                  <strong>{t('common:nutrition.fat')}:</strong> {t('dashboard:nutrition_guide.formula.fat')} {weightLb} {t('dashboard:nutrition_guide.formula.lb')} {t('dashboard:nutrition_guide.formula.equals')} {Math.round(weightLb * 0.35)}{t('common:common.g')}
                </div>
                <div>
                  <strong>{t('common:nutrition.water')}:</strong> {t('dashboard:nutrition_guide.formula.water')} {weightLb} {t('dashboard:nutrition_guide.formula.lb')} {t('dashboard:nutrition_guide.formula.equals')} {Math.round(weightLb * 0.6)} {t('common:common.oz')}
                </div>
              </>
            )}
            <div className="pt-2 border-t">
              <em>{t('dashboard:cheatLineNote')}</em>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
