import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { isExperimentalEnabled } from "@/lib/experimental";

interface WeeklyData {
  date: string;
  calories: number;
  protein: number;
  targetCalories: number;
  targetProtein: number;
}

interface WeeklyTrendsCardProps {
  weeklyData?: WeeklyData[];
}

// Custom Tooltip for internationalized labels
function CustomCalorieTooltip({ active, payload, label }: any) {
  const { t } = useTranslation(['dashboard']);
  
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.dataKey === 'targetCalories' ? t('dashboard:weekly_trends.target') : t('dashboard:weekly_trends.actual')}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function CustomProteinTooltip({ active, payload, label }: any) {
  const { t } = useTranslation(['dashboard']);
  
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{label}</p>
        <p className="text-xs" style={{ color: payload[0].color }}>
          {t('dashboard:weekly_trends.protein_g')}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
}

export function WeeklyTrendsCard({ weeklyData = [] }: WeeklyTrendsCardProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { isPlus, isPro } = useSubscription();
  const [, navigate] = useLocation();
  const experimental = isExperimentalEnabled();

  // Feature gating: Plus or Pro required
  const hasAccess = isPlus || isPro;

  // Don't show if experimental UI is disabled
  if (!experimental) {
    return null;
  }

  if (!hasAccess) {
    return (
      <Card className="border-2 border-dashed" data-testid="card-weekly-trends-locked">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t('dashboard:weekly_trends.locked_title')}</CardTitle>
            </div>
            <Badge variant="secondary">{t('common:subscription.plus')}</Badge>
          </div>
          <CardDescription>{t('dashboard:weekly_trends.locked_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/upgrade-pro')}
            data-testid="button-upgrade-weekly-trends"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            {t('dashboard:weekly_trends.upgrade_button')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No mock data - only show real data
  const hasData = weeklyData && weeklyData.length > 0;

  return (
    <Card data-testid="card-weekly-trends">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('dashboard:weekly_trends.title')}</CardTitle>
          <Badge variant="secondary">
            <TrendingUp className="mr-1 h-3 w-3" />
            {t('common:subscription.plus')}
          </Badge>
        </div>
        <CardDescription>{t('dashboard:weekly_trends.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasData ? (
          <>
            {/* Calories Line Chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('dashboard:weekly_trends.calories_trend')}</h4>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip content={<CustomCalorieTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="targetCalories" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    dot={false}
                    name={t('dashboard:weekly_trends.target')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="calories" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name={t('dashboard:weekly_trends.actual')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Protein Bar Chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('dashboard:weekly_trends.protein_accumulation')}</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip content={<CustomProteinTooltip />} />
                  <Bar dataKey="protein" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name={t('dashboard:weekly_trends.protein_g')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-weekly-trends">
            <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground mb-1">暂无数据</p>
            <p className="text-xs text-muted-foreground">开始记录饮食后，这里将显示您的营养趋势</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
