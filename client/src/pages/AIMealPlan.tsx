import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, Sparkles, Clock, Zap, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { Plus } from "lucide-react";

interface MealFood {
  name: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

interface Meal {
  name: string;
  time: string;
  foods: MealFood[];
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  totalFiberG: number;
}

interface AIMealPlan {
  id: string;
  planUuid: string;
  targetDate: string;
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  planData: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
    totalKcal: number;
    totalProteinG: number;
    totalFatG: number;
    totalCarbsG: number;
    totalFiberG: number;
  };
  applied: boolean;
  createdAt: string;
}

interface SuggestionFood {
  foodName: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

interface FoodSuggestion {
  name: string;
  foods: SuggestionFood[];
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  totalFiberG: number;
}

interface NutritionSuggestions {
  rationale?: string;
  combos: FoodSuggestion[];
  tip?: string;
}

interface SnackRecommendation {
  tendency: 'Craving Sweet' | 'Craving Crunchy';
  title: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  why: string;
  swaps: string[];
  notes: string[];
}

interface SnackSuggestions {
  date: string;
  items: SnackRecommendation[];
}

export default function AIMealPlan() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation(['mealPlan', 'common']);
  const { plan, isLoading: subscriptionLoading, getLimit } = useSubscription();
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<NutritionSuggestions | null>(null);
  const [snackSuggestions, setSnackSuggestions] = useState<SnackSuggestions | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Fetch user profile for goal
  const { data: profile } = useQuery<{ goal: 'cut' | 'maintain' | 'bulk' }>({
    queryKey: ['/api/profile']
  });

  // Fetch AI meal plans for today with language parameter
  const { data: mealPlans = [], isLoading } = useQuery<AIMealPlan[]>({
    queryKey: ['/api/ai/meal-plan/list', today, i18n.language],
    queryFn: async () => {
      const res = await fetch(`/api/ai/meal-plan/list/${today}?lang=${i18n.language}`);
      if (!res.ok) throw new Error('Failed to fetch meal plans');
      return res.json();
    }
  });

  // Fetch today's summary for remaining macros
  const { data: todaySummary } = useQuery<any>({
    queryKey: ['/api/summary/today'],
    retry: false
  });

  // Get the latest plan
  const latestPlan = mealPlans.length > 0 ? mealPlans[0] : null;

  // Generate meal plan mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai/meal-plan/generate', { language: i18n.language });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/meal-plan/list'] });
      toast({
        title: t('mealPlan:toasts.plan_generated'),
        description: t('mealPlan:toasts.plan_generated_desc'),
      });
    },
    onError: (error: any) => {
      const errorMsg = error.message || t('mealPlan:toasts.generate_failed');
      toast({
        title: t('mealPlan:toasts.generate_failed'),
        description: errorMsg,
        variant: 'destructive',
      });
    }
  });

  // Apply meal plan mutation
  const applyMutation = useMutation({
    mutationFn: async (planUuid: string) => {
      const res = await apiRequest('POST', '/api/ai/meal-plan/apply', { planUuid });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/meal-plan/list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/foodlogs/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      toast({
        title: t('mealPlan:toasts.plan_applied'),
        description: t('mealPlan:toasts.plan_applied_desc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('mealPlan:toasts.apply_failed'),
        description: error.message || t('mealPlan:toasts.apply_failed_desc'),
        variant: 'destructive',
      });
    }
  });

  // Fetch suggestions based on remaining macros
  const fetchSuggestionsMutation = useMutation({
    mutationFn: async () => {
      if (!todaySummary?.remaining) {
        throw new Error(t('mealPlan:toasts.suggestions_no_data'));
      }
      
      const res = await apiRequest('POST', '/api/suggest', {
        kcal: todaySummary.remaining.kcal || 0,
        proteinG: todaySummary.remaining.proteinG || 0,
        fatG: todaySummary.remaining.fatG || 0,
        carbsG: todaySummary.remaining.carbsG || 0,
        fiberG: todaySummary.remaining.fiberG || 0,
        language: i18n.language
      });
      return res.json();
    },
    onSuccess: (data: NutritionSuggestions) => {
      setSuggestions(data);
      toast({
        title: t('mealPlan:toasts.suggestions_updated'),
        description: t('mealPlan:toasts.suggestions_updated_desc', { count: data.combos?.length || 0 }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('mealPlan:toasts.suggestions_failed'),
        description: error.message || t('mealPlan:toasts.suggestions_failed_desc'),
        variant: 'destructive',
      });
    }
  });

  // Fetch snack suggestions
  const fetchSnacksMutation = useMutation({
    mutationFn: async () => {
      if (!todaySummary?.remaining) {
        throw new Error(t('mealPlan:toasts.suggestions_no_data'));
      }
      
      const res = await apiRequest('POST', '/api/snacks/suggest', {
        protein_left_g: todaySummary.remaining.proteinG || 0,
        carbs_left_g: todaySummary.remaining.carbsG || 0,
        fat_left_g: todaySummary.remaining.fatG || 0,
        fiber_left_g: todaySummary.remaining.fiberG || 0,
        kcal_left: todaySummary.remaining.kcal || 0,
        minutes_to_next_meal: 120,
        diet_flags: {},
        inventory: [],
        dislikes: '', // Server converts this to array
        language: i18n.language
      });
      return res.json();
    },
    onSuccess: (data: SnackSuggestions) => {
      setSnackSuggestions(data);
      toast({
        title: t('mealPlan:toasts.snacks_generated'),
        description: t('mealPlan:toasts.snacks_generated_desc', { count: data.items?.length || 0 }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('mealPlan:toasts.snacks_failed'),
        description: error.message || t('mealPlan:toasts.snacks_failed_desc'),
        variant: 'destructive',
      });
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleApply = () => {
    if (!latestPlan) return;
    applyMutation.mutate(latestPlan.planUuid);
  };

  const handleFetchSuggestions = () => {
    fetchSuggestionsMutation.mutate();
  };

  const handleSnackRecommend = () => {
    fetchSnacksMutation.mutate();
  };

  // Get feature limits
  const dailyLimit = getLimit('ai_meal_plan');
  const canGenerate = true; // All tiers have access

  // Log food mutation
  const logFoodMutation = useMutation({
    mutationFn: async (food: { name: string; amountG: number; kcal: number; proteinG: number; fatG: number; carbsG: number; fiberG: number }) => {
      // Validate amountG
      if (!food.amountG || food.amountG <= 0) {
        throw new Error('Invalid amount');
      }

      // Calculate per-100g values, ensuring no NaN or Infinity
      const kcal100g = ((food.kcal || 0) / food.amountG) * 100;
      const protein100g = ((food.proteinG || 0) / food.amountG) * 100;
      const fat100g = ((food.fatG || 0) / food.amountG) * 100;
      const carbs100g = ((food.carbsG || 0) / food.amountG) * 100;
      const fiber100g = ((food.fiberG || 0) / food.amountG) * 100;

      const res = await apiRequest('POST', '/api/foodlog', {
        foodName: food.name,
        kcal100g,
        protein100g,
        fat100g,
        carbs100g,
        fiber100g,
        amountG: food.amountG
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/foodlogs/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/meal-plan/list'] });
      toast({
        title: t('mealPlan:toasts.food_logged'),
        description: t('mealPlan:toasts.food_logged_desc')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('mealPlan:toasts.food_log_failed'),
        description: error.message || t('mealPlan:toasts.food_log_failed_desc'),
        variant: 'destructive'
      });
    }
  });

  const renderMeal = (meal: Meal, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const isExpanded = selectedMealId === mealType;

    return (
      <Card 
        key={mealType}
        className="cursor-pointer hover-elevate"
        onClick={() => setSelectedMealId(isExpanded ? null : mealType)}
        data-testid={`meal-card-${mealType}`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{meal.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{meal.time}</span>
            </div>
          </div>
          <CardDescription>
            {Math.round(meal.totalKcal)} kcal | {t('mealPlan:plan.protein')} {Math.round(meal.totalProteinG)}g | {t('mealPlan:plan.carbs')} {Math.round(meal.totalCarbsG)}g | {t('mealPlan:plan.fat')} {Math.round(meal.totalFatG)}g
          </CardDescription>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-3" onClick={(e) => e.stopPropagation()}>
            {meal.foods.map((food, idx) => (
              <div 
                key={idx}
                className="p-3 bg-muted/50 rounded-md space-y-2"
                data-testid={`food-item-${mealType}-${idx}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="font-medium">{food.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {food.amountG}g | {Math.round(food.kcal)} kcal | {t('mealPlan:plan.protein')} {Math.round(food.proteinG)}g | {t('mealPlan:plan.carbs')} {Math.round(food.carbsG)}g | {t('mealPlan:plan.fat')} {Math.round(food.fatG)}g
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => logFoodMutation.mutate(food)}
                  disabled={logFoodMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  data-testid={`button-log-food-${mealType}-${idx}`}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {t('mealPlan:food.add_to_log')}
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">
            {profile?.goal === 'bulk' && t('mealPlan:page_title_bulk')}
            {profile?.goal === 'cut' && t('mealPlan:page_title_cut')}
            {profile?.goal === 'maintain' && t('mealPlan:page_title_maintain')}
            {!profile?.goal && t('mealPlan:page_title')}
          </h1>
        </div>
        {plan && plan !== 'free' && (
          <Badge variant="outline" data-testid="badge-tier">
            {t('mealPlan:badge_tier')}
          </Badge>
        )}
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-auto pb-20">
        {/* Generate Button - Moved up */}
        {!latestPlan && (
          <Button 
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !canGenerate}
            className="w-full"
            size="lg"
            data-testid="button-generate-plan"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generateMutation.isPending ? t('mealPlan:generating') : t('mealPlan:generate_plan')}
          </Button>
        )}

        {/* Latest Plan - Moved up, right after generate button */}
        {latestPlan && (
          <div className="space-y-4">
            {/* Plan Header with Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t('mealPlan:plan.today_recommendation')}</CardTitle>
                    <CardDescription className="text-xs">
                      {t('mealPlan:plan.total')}{Math.round(latestPlan.planData.totalKcal)} kcal | 
                      {t('mealPlan:plan.protein')} {Math.round(latestPlan.planData.totalProteinG)}g | 
                      {t('mealPlan:plan.carbs')} {Math.round(latestPlan.planData.totalCarbsG)}g | 
                      {t('mealPlan:plan.fat')} {Math.round(latestPlan.planData.totalFatG)}g
                    </CardDescription>
                  </div>
                  {latestPlan.applied && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {t('mealPlan:plan.applied')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Regenerate button */}
                <Button 
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  size="lg"
                  data-testid="button-regenerate-plan"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {generateMutation.isPending ? t('mealPlan:generating') : t('mealPlan:plan.regenerate')}
                </Button>
              </CardContent>
            </Card>

            {/* Meals */}
            <div className="space-y-3">
              {renderMeal(latestPlan.planData.breakfast, 'breakfast')}
              {renderMeal(latestPlan.planData.lunch, 'lunch')}
              {renderMeal(latestPlan.planData.dinner, 'dinner')}
            </div>

            {/* Divider between meals and supplement section */}
            {todaySummary?.remaining && (
              <div className="relative py-6" aria-label="meals-to-supplement-divider">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t('mealPlan:nutrition.divider')}</span>
                </div>
              </div>
            )}

            {/* Supplement Nutrition Section */}
            {todaySummary?.remaining && (
              <section id="supplement-section" aria-label={t('mealPlan:nutrition.fill_remaining')} className="space-y-4">
                <Button 
                  onClick={handleFetchSuggestions}
                  disabled={fetchSuggestionsMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                  data-testid="button-fill-nutrition"
                  aria-label={t('mealPlan:nutrition.fill_remaining')}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {fetchSuggestionsMutation.isPending ? t('mealPlan:generating') : t('mealPlan:nutrition.fill_remaining')}
                </Button>

                {/* Nutrition Gaps Panel */}
                {suggestions && suggestions.combos.length > 0 ? (
                  <Card className="bg-green-500/5 border-green-500/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{t('mealPlan:nutrition.fill_remaining')}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {t('mealPlan:nutrition.remaining')}{Math.round(todaySummary.remaining.kcal)} kcal | 
                            {t('mealPlan:plan.protein')} {Math.round(todaySummary.remaining.proteinG)}g | 
                            {t('mealPlan:plan.carbs')} {Math.round(todaySummary.remaining.carbsG)}g | 
                            {t('mealPlan:plan.fat')} {Math.round(todaySummary.remaining.fatG)}g
                          </CardDescription>
                        </div>
                        <Button
                          onClick={handleFetchSuggestions}
                          disabled={fetchSuggestionsMutation.isPending}
                          variant="outline"
                          size="sm"
                          data-testid="button-refresh-suggestions"
                        >
                          <RefreshCw className={`w-4 h-4 mr-1 ${fetchSuggestionsMutation.isPending ? 'animate-spin' : ''}`} />
                          {fetchSuggestionsMutation.isPending ? t('mealPlan:nutrition.refresh_loading') : t('mealPlan:nutrition.refresh')}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Rationale */}
                      {suggestions.rationale && (
                        <div className="p-3 bg-primary/5 rounded-md border border-primary/10">
                          <p className="text-xs text-muted-foreground italic">
                            {t('mealPlan:nutrition.rationale_prefix')} {suggestions.rationale}
                          </p>
                        </div>
                      )}

                      {/* Combos */}
                      {suggestions.combos.map((suggestion, idx) => (
                        <Card key={idx} className="bg-background">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{suggestion.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {Math.round(suggestion.totalKcal)} kcal | 
                              {t('mealPlan:plan.protein')} {Math.round(suggestion.totalProteinG)}g | 
                              {t('mealPlan:plan.carbs')} {Math.round(suggestion.totalCarbsG)}g | 
                              {t('mealPlan:plan.fat')} {Math.round(suggestion.totalFatG)}g
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {suggestion.foods.map((food, foodIdx) => (
                              <div 
                                key={foodIdx}
                                className="p-2 bg-muted/30 rounded space-y-2"
                              >
                                <div>
                                  <div className="text-xs font-medium">{food.foodName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {food.amountG}g | {Math.round(food.kcal)} kcal | 
                                    {t('mealPlan:plan.protein')} {Math.round(food.proteinG)}g | {t('mealPlan:plan.carbs')} {Math.round(food.carbsG)}g | {t('mealPlan:plan.fat')} {Math.round(food.fatG)}g
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    logFoodMutation.mutate({
                                      name: food.foodName,
                                      amountG: food.amountG,
                                      kcal: food.kcal,
                                      proteinG: food.proteinG,
                                      fatG: food.fatG,
                                      carbsG: food.carbsG,
                                      fiberG: food.fiberG
                                    });
                                  }}
                                  disabled={logFoodMutation.isPending}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                                  data-testid={`button-log-supplement-${idx}-${foodIdx}`}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  {t('mealPlan:food.add_to_log')}
                                </Button>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))}

                      {/* Tip */}
                      {suggestions.tip && (
                        <div className="p-3 bg-green-500/5 rounded-md border border-green-500/10">
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {t('mealPlan:nutrition.tip_prefix')} {suggestions.tip}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : !fetchSuggestionsMutation.isPending && (
                  <Card className="bg-muted/30 border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {t('mealPlan:nutrition.click_to_generate')}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </section>
            )}
          </div>
        )}

        {/* AI Snack Recommendation Button */}
        {latestPlan && (
          <Button 
            onClick={handleSnackRecommend}
            disabled={fetchSnacksMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
            data-testid="button-snack-recommend"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {fetchSnacksMutation.isPending ? t('mealPlan:plan.recommending') : t('mealPlan:plan.snack_recommend')}
          </Button>
        )}

        {/* AI Snack Suggestions Section */}
        {snackSuggestions && snackSuggestions.items.length > 0 && (
          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                {t('mealPlan:snacks.title')}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {snackSuggestions.date}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {snackSuggestions.items.map((item, idx) => (
                <Card key={idx} className="bg-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {item.tendency}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm">{item.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {Math.max(50, Math.round(item.calories_kcal))} kcal | 
                      {t('mealPlan:plan.protein')} {Math.max(0, Math.round(item.protein_g))}g | 
                      {t('mealPlan:plan.carbs')} {Math.max(0, Math.round(item.carbs_g))}g | 
                      {t('mealPlan:plan.fat')} {Math.max(0, Math.round(item.fat_g))}g
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Why this option */}
                    {item.why && (
                      <div className="p-2 bg-purple-500/5 rounded-md border border-purple-500/10">
                        <p className="text-xs text-muted-foreground">{item.why}</p>
                      </div>
                    )}
                    
                    {/* Swap suggestions */}
                    {item.swaps && item.swaps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{t('mealPlan:snacks.swaps')}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.swaps.map((swap, swapIdx) => (
                            <Badge key={swapIdx} variant="outline" className="text-xs">
                              {swap}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes for this item */}
                    {item.notes && item.notes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{t('mealPlan:snacks.notes')}</p>
                        {item.notes.map((note, noteIdx) => (
                          <p key={noteIdx} className="text-xs text-muted-foreground">• {note}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!latestPlan && !generateMutation.isPending && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">还没有今日计划</p>
              <p className="text-sm mt-1">点击上方按钮生成AI三餐推荐</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-sm">加载中...</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
