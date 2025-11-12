import { Card, CardContent } from "@/components/ui/card";
import { Droplet, Clock, Zap, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WaterGuidanceProps {
  unit: 'imperial' | 'metric';
  target: number;
  drank: number;
  remaining: number;
  bonusFromExercise: number;
  suggestPerReminder: number;
  maxHourly: number;
  remindersLeft: number;
  flags: { isLate: boolean };
}

export function WaterGuidance(props: WaterGuidanceProps) {
  const { t } = useTranslation(['water']);
  const u = props.unit === 'metric' ? 'ml' : 'oz';

  return (
    <Card className="border-chart-2/30 bg-chart-2/5" data-testid="water-guidance">
      <CardContent className="p-4 space-y-4">
        {/* Dynamic Suggestions */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="h-4 w-4 text-chart-2" />
            <h3 className="text-sm font-semibold">{t('water:guidance.title')}</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-2 shrink-0" />
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t('water:guidance.perReminder')}:
                </span>{' '}
                <span className="font-semibold text-chart-2">
                  {props.suggestPerReminder}{u}
                </span>
                {' '}
                <span className="text-xs">
                  (≈ {t('water:guidance.formula')}
                  {props.flags.isLate && ` • ${t('water:guidance.reducedEvening')}`})
                </span>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-2 shrink-0" />
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t('water:guidance.remindersLeft')}:
                </span>{' '}
                <span className="font-semibold text-chart-2">{props.remindersLeft}</span>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-2 shrink-0" />
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t('water:guidance.maxSafety')}:
                </span>{' '}
                <span className="font-semibold text-destructive">
                  ≤ {props.maxHourly}{u}/{t('water:guidance.perHour')}
                </span>
                <span className="text-xs ml-1">
                  ({t('water:guidance.safetyNote')})
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Exercise Bonus */}
        {props.bonusFromExercise > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold">{t('water:guidance.exerciseBonus')}</h3>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-2 shrink-0" />
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t('water:guidance.todayBonus')}:
                  </span>{' '}
                  <span className="font-semibold text-amber-500">
                    +{props.bonusFromExercise}{u}
                  </span>
                  <span className="text-xs ml-1">
                    ({t('water:guidance.exerciseRule')})
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Evening Strategy */}
        {props.flags.isLate && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold">{t('water:guidance.eveningStrategy')}</h3>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-2 shrink-0" />
                <p className="text-muted-foreground">
                  {t('water:guidance.eveningAdvice')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            💡 {t('water:guidance.note')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
