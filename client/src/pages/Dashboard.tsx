import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { CircularProgress } from "@/components/CircularProgress";
import { MacroBar } from "@/components/MacroBar";
import { WeeklyTrendsCard } from "@/components/WeeklyTrendsCard";
import { CollapseCard } from "@/components/CollapseCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/use-subscription";
import type { UserProfile } from "@shared/schema";
import { Sparkles, Loader2, Droplets, Utensils, ExternalLink, Beef, Apple, Wheat, Activity, CheckCircle2, MessageCircle, Calendar, ChevronRight, Moon, Cookie, ScanBarcode } from "lucide-react";

interface Summary {
  target: {
    kcal: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
    fiberG: number;
    waterOz: number;
  };
  current: {
    kcal: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
    fiberG: number;
    waterOz: number;
  };
  remaining: {
    kcal: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
    fiberG: number;
    waterOz: number;
  };
}

interface SuggestionCombo {
  name: string;
  foods: Array<{
    foodName: string;
    amountG: number;
    kcal: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
    fiberG: number;
    reason: string;
  }>;
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  totalFiberG: number;
}

// New simplified snack suggestion types (Nov 2025)
interface SnackItem {
  food: string;
  amount_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface SnackOption {
  title: string;
  items: SnackItem[];
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  why: string;
  swaps: string[];
}

interface SnackSuggestionResult {
  goal: string;
  snack_plan: SnackOption[];
  notes: string[];
}

export default function Dashboard() {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const [, setLocation] = useLocation();
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showBeforeSleepReminder, setShowBeforeSleepReminder] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionCombo[] | null>(null);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [snackResult, setSnackResult] = useState<SnackSuggestionResult | null>(null);
  const [showSnackDialog, setShowSnackDialog] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  // Fetch user profile
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['/api/profile']
  });

  // Fetch today's summary
  const { data: summary, isLoading } = useQuery<Summary>({
    queryKey: ['/api/summary/today']
  });

  // Fetch today's daily status
  const { data: dailyStatusData } = useQuery<{ status: any | null }>({
    queryKey: ['/api/daily-status/today']
  });

  const todayStatus = dailyStatusData?.status;

  // Fetch streak
  const { data: streakData } = useQuery<{ streak: number }>({
    queryKey: ['/api/daily-status/streak'],
  });

  const streak = streakData?.streak || 0;

  // Toggle daily completion mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/daily-status/toggle', { day: today });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-status/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-status/streak'] });
      // Invalidate month queries for all months (to update calendar view)
      queryClient.invalidateQueries({ queryKey: ['/api/daily-status/month'] });
      toast({
        title: todayStatus?.completed ? t('dashboard:checkInCancelled') : t('dashboard:completedToday'),
        description: todayStatus?.completed ? t('dashboard:checkInCancelledDesc') : t('dashboard:completedTodayDesc')
      });
    },
    onError: () => {
      toast({
        title: t('dashboard:operationFailed'),
        description: t('dashboard:operationFailedDesc'),
        variant: 'destructive'
      });
    }
  });

  // AI suggestions mutation
  const suggestMutation = useMutation({
    mutationFn: async (remaining: any) => {
      const res = await apiRequest('POST', '/api/suggest', { ...remaining, language: i18n.language });
      return res.json();
    },
    onSuccess: (data: { combos: SuggestionCombo[]; rationale?: string; tip?: string }) => {
      setSuggestions(data.combos || []);
      setShowSuggestionsDialog(true);
      toast({
        title: t('dashboard:suggestionGenerated'),
        description: t('dashboard:suggestionGeneratedDesc')
      });
    },
    onError: () => {
      toast({
        title: t('dashboard:generateFailed'),
        description: t('dashboard:generateFailedDesc'),
        variant: 'destructive'
      });
    }
  });

  // AI Snack suggestions mutation (Nov 2025 - Simplified)
  const snackSuggestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/snacks/suggest', data);
      return res.json();
    },
    onSuccess: (data: SnackSuggestionResult) => {
      setSnackResult(data);
      setShowSnackDialog(true);
      const notesDesc = data.notes && data.notes.length > 0 ? data.notes[0] : t('dashboard:snackSuggestionGeneratedDesc');
      toast({
        title: t('dashboard:snackSuggestionGenerated'),
        description: notesDesc
      });
    },
    onError: (error: any) => {
      // Check if it's a daily limit error
      if (error.message && error.message.includes('DAILY_LIMIT_REACHED')) {
        toast({
          title: t('dashboard:dailyLimitReached'),
          description: t('dashboard:dailyLimitReachedDesc'),
          variant: 'destructive'
        });
      } else {
        toast({
          title: t('dashboard:generateFailed'),
          description: t('dashboard:snackGenerateFailedDesc'),
          variant: 'destructive'
        });
      }
    }
  });

  // Helper to determine current meal context based on time of day
  const getCurrentMealContext = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any' => {
    // Get current time in America/Denver timezone
    const now = new Date();
    const denverTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const currentHour = denverTime.getHours();
    
    // Determine meal context based on time of day
    // Breakfast: 5am - 10:30am
    if (currentHour >= 5 && currentHour < 10) {
      return 'breakfast';
    } 
    // Late breakfast / early lunch: 10am - 11:30am
    else if (currentHour >= 10 && currentHour < 11) {
      return 'breakfast';
    }
    // Lunch: 11:30am - 3:30pm
    else if (currentHour >= 11 && currentHour < 15) {
      return 'lunch';
    }
    // Late lunch / early dinner: 3:30pm - 5pm
    else if (currentHour >= 15 && currentHour < 17) {
      return 'lunch';
    }
    // Dinner: 5pm - 9:30pm
    else if (currentHour >= 17 && currentHour < 21) {
      return 'dinner';
    }
    // Late dinner / evening snack: 9:30pm - 11pm
    else if (currentHour >= 21 && currentHour < 23) {
      return 'dinner';
    }
    // Late night snack: 11pm - 5am
    else {
      return 'snack';
    }
  };

  const handleFillRemaining = () => {
    if (!summary) return;
    const mealContext = getCurrentMealContext();
    suggestMutation.mutate({
      ...summary.remaining,
      mealContext
    });
  };

  const handleSnackSuggestion = () => {
    if (!summary) return;
    
    // Default inventory (common healthy snacks)
    const defaultInventory = [
      '0% Greek yogurt',
      'blueberries',
      'rice cakes',
      'whey protein',
      'banana',
      'oats',
      'egg whites',
      'apple',
      'whole wheat crackers'
    ];
    
    snackSuggestMutation.mutate({
      protein_left_g: summary.remaining.proteinG,
      carbs_left_g: summary.remaining.carbsG,
      fat_left_g: summary.remaining.fatG,
      fiber_left_g: summary.remaining.fiberG,
      kcal_left: summary.remaining.kcal,
      minutes_to_next_meal: 120,
      diet_flags: {},
      inventory: defaultInventory,
      dislikes: '',
      language: i18n.language
    });
  };

  // Reset dismissed state only when nutrition improves past thresholds or new day
  useEffect(() => {
    if (!summary) return;
    
    const proteinRatio = summary.current.proteinG / summary.target.proteinG;
    const calRatio = summary.current.kcal / summary.target.kcal;
    
    // Only reset if both protein AND calories are now above 60% (improvement)
    if (proteinRatio >= 0.6 && calRatio >= 0.6) {
      setReminderDismissed(false);
    }
  }, [summary?.current.proteinG, summary?.current.kcal, summary?.target.proteinG, summary?.target.kcal]);

  // Reset dismissed state on new day
  useEffect(() => {
    setReminderDismissed(false);
  }, [today]);

  // Auto-uncheck completion when all macros are zero
  useEffect(() => {
    if (!summary || !todayStatus || toggleCompletionMutation.isPending) return;
    
    // Check if all current macros are zero
    const allZero = summary.current.kcal === 0 && 
                    summary.current.proteinG === 0 && 
                    summary.current.fatG === 0 && 
                    summary.current.carbsG === 0;
    
    // If completed but all macros are zero, auto-uncheck (only if not already pending)
    if (todayStatus.completed && allZero && !toggleCompletionMutation.isPending) {
      toggleCompletionMutation.mutate();
    }
  }, [summary?.current, todayStatus?.completed, toggleCompletionMutation.isPending]);

  // Check for before-sleep reminder
  useEffect(() => {
    if (!profile || !summary || !todayStatus || todayStatus.completed || reminderDismissed) return;
    
    // Guard against missing or invalid sleepTime
    if (!profile.sleepTime || typeof profile.sleepTime !== 'string') return;

    const checkBeforeSleepReminder = () => {
      // Parse sleep time to minutes (HH:MM)
      const sleepTimeParts = profile.sleepTime.split(':');
      if (sleepTimeParts.length !== 2) return; // Invalid format
      
      const sleepHour = parseInt(sleepTimeParts[0], 10);
      const sleepMinute = parseInt(sleepTimeParts[1], 10);
      
      // Validate parsed values
      if (isNaN(sleepHour) || isNaN(sleepMinute) || sleepHour < 0 || sleepHour > 23 || sleepMinute < 0 || sleepMinute > 59) return;
      
      const sleepMinutes = sleepHour * 60 + sleepMinute;
      
      // Get current time in user's local timezone (browser time)
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Check if within 30 minutes before sleep
      const sleepThreshold = sleepMinutes - 30;
      let isBeforeSleep = false;
      
      if (sleepMinutes < 180) {
        // Sleep time crosses midnight
        if (sleepThreshold < 0) {
          const adjustedThreshold = 1440 + sleepThreshold;
          isBeforeSleep = currentMinutes >= adjustedThreshold || currentMinutes < sleepMinutes;
        } else {
          isBeforeSleep = currentMinutes >= sleepThreshold && currentMinutes < sleepMinutes;
        }
      } else {
        isBeforeSleep = currentMinutes >= sleepThreshold && currentMinutes < sleepMinutes;
      }
      
      if (!isBeforeSleep) return;
      
      // Check nutrition ratios
      const proteinRatio = summary.current.proteinG / summary.target.proteinG;
      const calRatio = summary.current.kcal / summary.target.kcal;
      
      // Show reminder if significantly behind (< 60% on protein or calories)
      if (proteinRatio < 0.6 || calRatio < 0.6) {
        setShowBeforeSleepReminder(true);
      }
    };

    // Check immediately
    checkBeforeSleepReminder();
    
    // Check every 5 minutes
    const interval = setInterval(checkBeforeSleepReminder, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [profile, summary, todayStatus, reminderDismissed, today]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!summary || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t('dashboard:loadingFailed')}</p>
      </div>
    );
  }

  const { target, current, remaining } = summary;
  const caloriesProgress = (current.kcal / target.kcal) * 100;

  // Goal text mapping
  const goalText = profile.goal === 'cut' ? t('common:goals.cut') : profile.goal === 'bulk' ? t('common:goals.bulk') : t('common:goals.maintain');

  // Mock weekly data for App Store screenshots
  const mockWeeklyData = [
    {
      date: t('dashboard:weekly_trends.days.mon'),
      calories: 1850,
      protein: 145,
      targetCalories: target.kcal,
      targetProtein: target.proteinG
    },
    {
      date: t('dashboard:weekly_trends.days.tue'),
      calories: 2100,
      protein: 165,
      targetCalories: target.kcal,
      targetProtein: target.proteinG
    },
    {
      date: t('dashboard:weekly_trends.days.wed'),
      calories: 1950,
      protein: 152,
      targetCalories: target.kcal,
      targetProtein: target.proteinG
    },
    {
      date: t('dashboard:weekly_trends.days.thu'),
      calories: 2250,
      protein: 172,
      targetCalories: target.kcal,
      targetProtein: target.proteinG
    },
    {
      date: t('dashboard:weekly_trends.days.fri'),
      calories: 2050,
      protein: 158,
      targetCalories: target.kcal,
      targetProtein: target.proteinG
    },
    {
      date: t('dashboard:weekly_trends.days.sat'),
      calories: 2180,
      protein: 168,
      targetCalories: target.kcal,
      targetProtein: target.proteinG
    },
    {
      date: t('dashboard:weekly_trends.days.sun'),
      calories: current.kcal,
      protein: current.proteinG,
      targetCalories: target.kcal,
      targetProtein: target.proteinG
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-semibold text-foreground">{t('dashboard:title')}</h1>
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(i18n.language, { month: 'long', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 space-y-6">
        
        {/* 1. Today Summary (今日总结卡) */}
        <Card className="rounded-2xl shadow-sm border bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">{t('dashboard:today')}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {t('dashboard:goal')}: {goalText}
              </CardDescription>
            </div>
            {/* Manual completion button - only show when NOT completed */}
            {!todayStatus?.completed && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => toggleCompletionMutation.mutate()}
                disabled={toggleCompletionMutation.isPending}
                data-testid="button-complete-today"
              >
                {t('dashboard:manualComplete')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Completion status display */}
            {todayStatus?.completed ? (
              <div className="text-center space-y-1 pb-4 border-b">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="text-base font-medium text-foreground">
                    {t('dashboard:completed')} · {todayStatus.autodoneReason === 'sleep' && t('dashboard:autodoneReasons.sleep')}
                    {todayStatus.autodoneReason === 'macro_ok' && t('dashboard:autodoneReasons.macroOk')}
                    {todayStatus.autodoneReason === 'day_rollover' && t('dashboard:autodoneReasons.dayRollover')}
                    {todayStatus.autodoneReason === 'manual' && t('dashboard:autodoneReasons.manual')}
                  </p>
                </div>
                {todayStatus.completedAt && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(todayStatus.completedAt).toLocaleString('zh-CN', {
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center pb-2 border-b">
                {t('dashboard:autoCompleteNote')}
              </p>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
            {/* Left: TDEE Target */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('dashboard:tdee_target')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold font-mono text-foreground">
                  {target.kcal}
                </span>
                <span className="text-xl text-muted-foreground">kcal</span>
              </div>
            </div>

            {/* Right: Calories Ring */}
            <div className="flex items-center justify-center md:justify-end">
              <CircularProgress
                current={current.kcal}
                target={target.kcal}
                label={t('common:nutrients.calories')}
                unit="kcal"
              />
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak Preview (连续天数预览) */}
        <Card className="flex items-center justify-between p-4 rounded-2xl shadow-sm border hover-elevate" data-testid="card-streak-preview">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard:streakDays')}</h3>
            <p className="text-2xl font-semibold text-foreground">{t('dashboard:daysCount', { count: streak })}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard:streakLegend')}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={() => setLocation('/streak')}
            data-testid="button-view-calendar"
          >
            <span className="text-sm">{t('dashboard:viewCalendar')}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Card>

        {/* 2. Today's Nutrition (今日进度条) */}
        <Card className="rounded-2xl shadow-sm border bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t('dashboard:todaysNutrition')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MacroBar
              icon={Beef}
              label={t('common:nutrients.protein')}
              current={current.proteinG}
              target={target.proteinG}
              unit="g"
              color="#3b82f6"
              iconColor="text-blue-600"
            />
            <MacroBar
              icon={Apple}
              label={t('common:nutrients.fat')}
              current={current.fatG}
              target={target.fatG}
              unit="g"
              color="#eab308"
              iconColor="text-yellow-600"
            />
            <MacroBar
              icon={Wheat}
              label={t('common:nutrients.carbs')}
              current={current.carbsG}
              target={target.carbsG}
              unit="g"
              color="#22c55e"
              iconColor="text-green-600"
            />
            <MacroBar
              icon={Activity}
              label={t('common:nutrients.fiber')}
              current={current.fiberG}
              target={target.fiberG}
              unit="g"
              color="#f97316"
              iconColor="text-orange-600"
            />
            <MacroBar
              icon={Droplets}
              label={t('common:nutrients.water')}
              current={current.waterOz}
              target={target.waterOz}
              unit="oz"
              color="#06b6d4"
              iconColor="text-cyan-600"
            />
          </CardContent>
        </Card>

        {/* AI Features (AI功能入口) */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="default"
            size="sm"
            className="h-auto py-3 flex flex-col items-center gap-1"
            onClick={() => setLocation('/ai-meal-planner')}
            data-testid="button-ai-meal-plan"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-sm">{t('dashboard:aiMealMenu')}</span>
          </Button>
          
          <Button
            variant="default"
            size="sm"
            className="h-auto py-3 flex flex-col items-center gap-1"
            onClick={() => setLocation('/ai-coach')}
            data-testid="button-ai-coach"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{t('dashboard:aiCoachTitle')}</span>
          </Button>
        </div>

        {/* 3. Quick Actions (快速操作) */}
        <Card className="rounded-2xl shadow-sm border bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t('dashboard:quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="flex-1 min-w-[140px]"
              onClick={() => setLocation('/log')}
              data-testid="button-log-food"
            >
              <Utensils className="w-5 h-5 mr-2" />
              {t('dashboard:logFood')}
            </Button>
            
            <Button
              size="lg"
              className="flex-1 min-w-[140px]"
              onClick={() => setLocation('/water')}
              data-testid="button-log-water"
            >
              <Droplets className="w-5 h-5 mr-2" />
              {t('dashboard:logWater')}
            </Button>
          </CardContent>
        </Card>

        {/* 4. Weekly Trends (周趋势 - 默认折叠) */}
        <CollapseCard
          title={t('dashboard:weeklyTrends')}
          subtitle={t('dashboard:weeklyTrendsSubtitle')}
          defaultOpen={false}
        >
          <WeeklyTrendsCard weeklyData={mockWeeklyData} />
        </CollapseCard>

        {/* 5. Reference & Formula (参考与公式 - 默认折叠) */}
        <CollapseCard
          title={t('dashboard:referenceFormula')}
          subtitle={t('dashboard:calculationMethods')}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{t('dashboard:hydrationFormula')}:</span> {t('dashboard:hydrationFormulaDesc')}
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{t('dashboard:proteinFormula')}:</span> {t('dashboard:proteinFormulaDesc')}
              </p>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start p-0 h-auto text-primary"
              onClick={() => setShowFormulaModal(true)}
              data-testid="button-view-full-formula"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('dashboard:viewFullFormula')}
            </Button>
          </div>
        </CollapseCard>

      </main>

      {/* Full Formula Modal (Placeholder) */}
      {showFormulaModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFormulaModal(false)}
        >
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>{t('dashboard:completeFormulaTitle')}</CardTitle>
              <CardDescription>{t('dashboard:detailedMethods')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{t('dashboard:tdeeCalculation')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard:tdeeFormula')}<br/>
                  {t('dashboard:bmrFormula')}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">{t('dashboard:macroTargets')}</h3>
                <p className="text-sm text-muted-foreground">
                  • {t('common:nutrients.protein')}: {profile.goal === 'cut' ? '2.2' : profile.goal === 'bulk' ? '1.9' : '1.8'} g/kg {t('dashboard:bodyweight')}<br/>
                  • {t('common:nutrients.fat')}: 0.35 g/lb {t('dashboard:bodyweight')}<br/>
                  • {t('common:nutrients.carbs')}: {t('dashboard:remainingCalories')} ÷ 4<br/>
                  • {t('common:nutrients.fiber')}: 14g / 1000 kcal
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">{t('dashboard:hydrationTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard:dailyWater')} = {t('dashboard:bodyweight')}(lb) × 0.6 oz<br/>
                  {t('dashboard:exerciseBonus')}: +12–24 oz (30–60 min)
                </p>
              </div>

              <Button onClick={() => setShowFormulaModal(false)} className="w-full">
                {t('common:close')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Nutrition Suggestions Dialog */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-ai-suggestions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-dialog-title">
              <Sparkles className="w-5 h-5 text-primary" />
              {t('dashboard:aiNutritionSuggestions')}
            </DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              {t('dashboard:suggestionDescription')}
            </DialogDescription>
          </DialogHeader>
          
          {suggestions && suggestions.length > 0 ? (
            <div className="space-y-4 py-4" data-testid="container-suggestions">
              {suggestions.map((combo, idx) => (
                <Card key={idx} className="border-2" data-testid={`card-suggestion-${idx}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <span className="text-primary" data-testid={`text-combo-name-${idx}`}>{t('dashboard:optionNumber', { number: idx + 1 })}</span>
                      <Badge variant="secondary" data-testid={`badge-combo-kcal-${idx}`}>{combo.totalKcal} kcal</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Food items */}
                    <div className="space-y-2">
                      {combo.foods.map((food, foodIdx) => (
                        <div key={foodIdx} className="p-3 rounded-lg bg-muted/50 space-y-1" data-testid={`item-food-${idx}-${foodIdx}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm" data-testid={`text-food-name-${idx}-${foodIdx}`}>{food.foodName}</span>
                            <span className="text-xs text-muted-foreground" data-testid={`text-food-amount-${idx}-${foodIdx}`}>{food.amountG}g</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground" data-testid={`text-food-macros-${idx}-${foodIdx}`}>
                            <span>P: {food.proteinG}g</span>
                            <span>C: {food.carbsG}g</span>
                            <span>F: {food.fatG}g</span>
                            <span>{t('dashboard:fiberLabel')}: {food.fiberG}g</span>
                          </div>
                          {food.reason && (
                            <p className="text-xs text-muted-foreground italic" data-testid={`text-food-reason-${idx}-${foodIdx}`}>{food.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Totals */}
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('dashboard:totalLabel')}</span>
                        <span className="font-medium" data-testid={`text-combo-totals-${idx}`}>
                          P {combo.totalProteinG}g · C {combo.totalCarbsG}g · F {combo.totalFatG}g
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground" data-testid="text-no-suggestions">
              {t('dashboard:noData')}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowSuggestionsDialog(false)} variant="outline" data-testid="button-close-suggestions">
              {t('dashboard:close')}
            </Button>
            <Button onClick={() => {
              setShowSuggestionsDialog(false);
              setLocation('/log');
            }} data-testid="button-log-food-from-suggestions">
              {t('dashboard:goLogFood')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snack Suggestions Dialog - Simplified Nov 2025 */}
      <Dialog open={showSnackDialog} onOpenChange={setShowSnackDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-snack-suggestions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-snack-dialog-title">
              <Cookie className="w-5 h-5 text-primary" />
              {t('dashboard:aiSnackRecommendation')}
            </DialogTitle>
            <DialogDescription data-testid="text-snack-description">
              {t('dashboard:snackDescription')}
            </DialogDescription>
          </DialogHeader>
          
          {snackResult && snackResult.snack_plan && snackResult.snack_plan.length > 0 ? (
            <div className="space-y-4 py-4" data-testid="container-snack-suggestions">
              {snackResult.snack_plan.map((option, idx) => (
                <Card key={idx} className="border-2 hover-elevate" data-testid={`card-snack-option-${idx}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Option Title */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base" data-testid={`text-option-title-${idx}`}>
                        {option.title}
                      </h3>
                      <Badge variant="default" data-testid={`badge-option-kcal-${idx}`}>
                        {option.totals.kcal} kcal
                      </Badge>
                    </div>
                    
                    {/* Food Items - Only show if items exist */}
                    {option.items && option.items.length > 0 && (
                      <div className="space-y-2" data-testid={`container-option-items-${idx}`}>
                        {option.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between items-start text-sm">
                            <div className="flex-1">
                              <p className="font-medium">{item.food}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.amount_g}g | {t('dashboard:proteinLabel')} {item.protein_g}g | {t('dashboard:carbsLabel')} {item.carbs_g}g | {t('dashboard:fatLabel')} {item.fat_g}g
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {item.kcal} kcal
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Totals - Only show if non-zero */}
                    {option.totals && (option.totals.kcal > 0 || option.totals.protein_g > 0) && (
                      <div className="flex items-center gap-3 text-sm pt-2 border-t" data-testid={`text-option-totals-${idx}`}>
                        <span className="font-medium text-blue-600">{t('dashboard:proteinLabel')} {option.totals.protein_g}g</span>
                        <span className="text-amber-600">{t('dashboard:carbsLabel')} {option.totals.carbs_g}g</span>
                        <span className="text-red-600">{t('dashboard:fatLabel')} {option.totals.fat_g}g</span>
                        {option.totals.fiber_g > 0 && (
                          <span className="text-green-600">{t('dashboard:fiberLabel')} {option.totals.fiber_g}g</span>
                        )}
                      </div>
                    )}
                    
                    {/* Why */}
                    {option.why && (
                      <div className="pt-2 border-t" data-testid={`text-option-why-${idx}`}>
                        <p className="text-sm text-muted-foreground">
                          💡 {option.why}
                        </p>
                      </div>
                    )}
                    
                    {/* Swaps */}
                    {option.swaps && option.swaps.length > 0 && (
                      <div className="pt-2 border-t" data-testid={`container-option-swaps-${idx}`}>
                        <p className="text-xs font-medium mb-1.5">{t('dashboard:swapsLabel')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {option.swaps.map((swap, swapIdx) => (
                            <Badge key={swapIdx} variant="secondary" className="text-xs">
                              {swap}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {/* Notes */}
              {snackResult.notes && snackResult.notes.length > 0 && (
                <div className="space-y-1.5" data-testid="container-snack-notes">
                  {snackResult.notes.map((note, noteIdx) => (
                    <div key={noteIdx} className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                      💬 {note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground" data-testid="text-no-snack-suggestions">
              {t('dashboard:noSnackData')}
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setShowSnackDialog(false)} 
              variant="outline" 
              className="w-full sm:w-auto"
              data-testid="button-close-snack-dialog"
            >
              {t('dashboard:close')}
            </Button>
            <Button 
              onClick={() => {
                setShowSnackDialog(false);
                setLocation('/scan');
              }}
              variant="secondary"
              className="w-full sm:w-auto"
              data-testid="button-scan-barcode"
            >
              <ScanBarcode className="w-4 h-4 mr-2" />
              {t('dashboard:scanNoLike')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Before-Sleep Gentle Reminder */}
      <Dialog 
        open={showBeforeSleepReminder} 
        onOpenChange={(open) => {
          setShowBeforeSleepReminder(open);
          if (!open) {
            // If dialog is being closed (by any method), mark as dismissed
            setReminderDismissed(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-500" />
              {t('dashboard:gentleReminder')}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {summary && (
                <>
                  {t('dashboard:nutritionGap')}
                  {summary.current.proteinG / summary.target.proteinG < 0.6 && (
                    <p className="mt-2 font-medium">
                      {t('dashboard:proteinRemaining', { amount: Math.round(summary.remaining.proteinG) })}
                    </p>
                  )}
                  {summary.current.kcal / summary.target.kcal < 0.6 && (
                    <p className="mt-1 font-medium">
                      {t('dashboard:caloriesRemaining', { amount: Math.round(summary.remaining.kcal) })}
                    </p>
                  )}
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t('dashboard:reminderSuggestion')}
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowBeforeSleepReminder(false);
                setReminderDismissed(true);
              }}
              data-testid="button-dismiss-reminder"
            >
              {t('dashboard:gotIt')}
            </Button>
            <Button
              onClick={() => {
                setShowBeforeSleepReminder(false);
                setReminderDismissed(true);
                setLocation('/log');
              }}
              data-testid="button-log-food-from-reminder"
            >
              {t('dashboard:goLogFood')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
