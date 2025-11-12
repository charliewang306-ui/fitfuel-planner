import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChefHat, Loader2, Plus, Check, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { convertToGrams, UNIT_DISPLAY_NAMES, HAND_PORTION_DESCRIPTIONS, FoodUnitType } from "@shared/foodUnits";

interface RecipeIngredient {
  name: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

interface RecipeBreakdown {
  recipeName: string;
  servings: number;
  ingredients: RecipeIngredient[];
  totalKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbsG: number;
  totalFiberG: number;
}

// Extended ingredient with original values for recalculation and unit support
interface EditableIngredient extends RecipeIngredient {
  originalAmountG: number;
  originalKcal: number;
  originalProteinG: number;
  originalFatG: number;
  originalCarbsG: number;
  originalFiberG: number;
  // Unit support fields
  unit: string;           // Current unit (e.g., 'g', 'cup', 'palm')
  amount: number;         // Amount in current unit
  foodKey: string;        // Food identifier for unit conversion
}

// Preset quick buttons configuration based on ingredient type
interface QuickButtonConfig {
  label: string;
  grams: number;
}

// Determine ingredient type and return appropriate quick buttons
function getQuickButtons(ingredientName: string, t: any): QuickButtonConfig[] {
  const name = ingredientName.toLowerCase();
  
  // Eggs
  if (name.includes('egg') || name.includes('蛋')) {
    return [
      { label: t('log:recipe.quickButtons.egg1'), grams: 50 },
      { label: t('log:recipe.quickButtons.egg2'), grams: 100 },
      { label: t('log:recipe.quickButtons.egg3'), grams: 150 }
    ];
  }
  
  // Oil and fats - descriptive cooking-based buttons
  if (name.includes('oil') || name.includes('油') || name.includes('butter') || name.includes('黄油')) {
    return [
      { label: t('log:recipe.quickButtons.oilThin'), grams: 5 },
      { label: t('log:recipe.quickButtons.oilCircle'), grams: 10 },
      { label: t('log:recipe.quickButtons.oilTwoCircles'), grams: 15 },
      { label: t('log:recipe.quickButtons.spoon'), grams: 10 }
    ];
  }
  
  // Vegetables
  if (
    name.includes('vegetable') || name.includes('lettuce') || name.includes('cabbage') || 
    name.includes('spinach') || name.includes('broccoli') || name.includes('carrot') || 
    name.includes('tomato') || name.includes('菜') || name.includes('菠菜') || 
    name.includes('胡萝卜') || name.includes('番茄') || name.includes('西红柿') || 
    name.includes('青菜') || name.includes('白菜') || name.includes('生菜')
  ) {
    return [
      { label: t('log:recipe.quickButtons.add50g'), grams: 50 },
      { label: t('log:recipe.quickButtons.add100g'), grams: 100 },
      { label: t('log:recipe.quickButtons.add150g'), grams: 150 }
    ];
  }
  
  // Default for other ingredients
  return [
    { label: t('log:recipe.quickButtons.add50g'), grams: 50 },
    { label: t('log:recipe.quickButtons.add100g'), grams: 100 },
    { label: t('log:recipe.quickButtons.add200g'), grams: 200 }
  ];
}

export function RecipeBreakdown() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [breakdown, setBreakdown] = useState<RecipeBreakdown | null>(null);
  const [editedIngredients, setEditedIngredients] = useState<EditableIngredient[]>([]);

  const breakdownMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/recipe/breakdown', { recipeName: name });
      return res.json() as Promise<RecipeBreakdown>;
    },
    onSuccess: (data) => {
      setBreakdown(data);
      // Initialize editable ingredients with original values and default unit (g)
      const initialEditable: EditableIngredient[] = data.ingredients.map(ing => ({
        ...ing,
        originalAmountG: ing.amountG,
        originalKcal: ing.kcal,
        originalProteinG: ing.proteinG,
        originalFatG: ing.fatG,
        originalCarbsG: ing.carbsG,
        originalFiberG: ing.fiberG,
        // Default to grams
        unit: 'g',
        amount: ing.amountG,
        // Generate foodKey from ingredient name (simplified version)
        foodKey: ing.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '')
      }));
      setEditedIngredients(initialEditable);
      toast({
        title: t('log:recipe.breakdownSuccess'),
        description: t('log:recipe.breakdownSuccessDesc', { name: data.recipeName, count: data.ingredients.length })
      });
    },
    onError: (error: any) => {
      toast({
        title: t('log:recipe.breakdownError'),
        description: error.message || t('log:recipe.breakdownErrorDesc'),
        variant: 'destructive'
      });
    }
  });

  const logAllMutation = useMutation({
    mutationFn: async (ingredients: RecipeIngredient[]) => {
      const res = await apiRequest('POST', '/api/recipe/log-all', { ingredients });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/foodlogs/today'] });
      toast({
        title: t('log:recipe.logSuccess'),
        description: t('log:recipe.logSuccessDesc', { count: data.logsCreated })
      });
      setOpen(false);
      setRecipeName('');
      setBreakdown(null);
    },
    onError: () => {
      toast({
        title: t('log:recipe.logError'),
        description: t('log:recipe.logErrorDesc'),
        variant: 'destructive'
      });
    }
  });

  const handleBreakdown = () => {
    if (!recipeName.trim()) return;
    breakdownMutation.mutate(recipeName);
  };

  const handleLogAll = () => {
    if (!breakdown) return;
    // Use edited ingredients instead of original
    const ingredientsToLog = editedIngredients.map(({ 
      name, amountG, kcal, proteinG, fatG, carbsG, fiberG 
    }) => ({
      name, amountG, kcal, proteinG, fatG, carbsG, fiberG
    }));
    logAllMutation.mutate(ingredientsToLog);
  };

  // Handle amount change for a specific ingredient
  const handleAmountChange = (index: number, newAmount: string) => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;

    setEditedIngredients(prev => {
      const updated = [...prev];
      const ingredient = updated[index];
      
      // Convert amount in current unit to grams
      const gramsFromUnit = convertToGrams(amount, ingredient.unit, ingredient.foodKey);
      const ratio = gramsFromUnit / ingredient.originalAmountG;

      // Recalculate nutrition based on new weight
      updated[index] = {
        ...ingredient,
        amount: amount,
        amountG: gramsFromUnit,
        kcal: ingredient.originalKcal * ratio,
        proteinG: ingredient.originalProteinG * ratio,
        fatG: ingredient.originalFatG * ratio,
        carbsG: ingredient.originalCarbsG * ratio,
        fiberG: ingredient.originalFiberG * ratio
      };

      return updated;
    });
  };

  // Handle quick add buttons (add grams to current amount)
  const handleQuickAdd = (index: number, gramsToAdd: number) => {
    setEditedIngredients(prev => {
      const updated = [...prev];
      const ingredient = updated[index];
      
      // Add grams to current amount
      const newGrams = ingredient.amountG + gramsToAdd;
      const ratio = newGrams / ingredient.originalAmountG;
      
      // Convert new grams back to current unit
      const gramsPerUnit = convertToGrams(1, ingredient.unit, ingredient.foodKey);
      const newAmount = newGrams / gramsPerUnit;

      // Recalculate nutrition based on new weight
      updated[index] = {
        ...ingredient,
        amount: newAmount,
        amountG: newGrams,
        kcal: ingredient.originalKcal * ratio,
        proteinG: ingredient.originalProteinG * ratio,
        fatG: ingredient.originalFatG * ratio,
        carbsG: ingredient.originalCarbsG * ratio,
        fiberG: ingredient.originalFiberG * ratio
      };

      return updated;
    });
  };

  // Handle slider change (directly set grams)
  const handleSliderChange = (index: number, grams: number) => {
    setEditedIngredients(prev => {
      const updated = [...prev];
      const ingredient = updated[index];
      
      const ratio = grams / ingredient.originalAmountG;
      
      // Convert grams to current unit
      const gramsPerUnit = convertToGrams(1, ingredient.unit, ingredient.foodKey);
      const newAmount = grams / gramsPerUnit;

      // Recalculate nutrition based on new weight
      updated[index] = {
        ...ingredient,
        amount: newAmount,
        amountG: grams,
        kcal: ingredient.originalKcal * ratio,
        proteinG: ingredient.originalProteinG * ratio,
        fatG: ingredient.originalFatG * ratio,
        carbsG: ingredient.originalCarbsG * ratio,
        fiberG: ingredient.originalFiberG * ratio
      };

      return updated;
    });
  };

  // Handle unit change for a specific ingredient
  const handleUnitChange = (index: number, newUnit: string) => {
    setEditedIngredients(prev => {
      const updated = [...prev];
      const ingredient = updated[index];
      
      // CRITICAL: Keep the same grams (mass), recalculate amount in new unit
      // Example: 120g → change to "palm" → 120g / 100g per palm = 1.2 palm
      const gramsPerNewUnit = convertToGrams(1, newUnit, ingredient.foodKey);
      const newAmount = ingredient.amountG / gramsPerNewUnit;

      updated[index] = {
        ...ingredient,
        unit: newUnit,
        amount: newAmount
        // No need to recalculate nutrition - grams stay the same!
      };

      return updated;
    });
  };

  // Get available units grouped by category
  const getUnitOptions = () => {
    return [
      {
        label: t('log:unitCategories.weight'),
        units: [
          { value: 'g', label: UNIT_DISPLAY_NAMES['g'] },
          { value: 'oz', label: UNIT_DISPLAY_NAMES['oz'] },
          { value: 'lb', label: UNIT_DISPLAY_NAMES['lb'] }
        ]
      },
      {
        label: t('log:unitCategories.measuring'),
        units: [
          { value: 'cup', label: UNIT_DISPLAY_NAMES['cup'] },
          { value: 'tbsp', label: UNIT_DISPLAY_NAMES['tbsp'] },
          { value: 'tsp', label: UNIT_DISPLAY_NAMES['tsp'] },
          { value: 'bowl', label: UNIT_DISPLAY_NAMES['bowl'] },
          { value: 'piece', label: UNIT_DISPLAY_NAMES['piece'] },
          { value: 'slice', label: UNIT_DISPLAY_NAMES['slice'] }
        ]
      },
      {
        label: t('log:unitCategories.handPortion'),
        units: [
          { value: 'fist', label: UNIT_DISPLAY_NAMES['fist'] },
          { value: 'palm', label: UNIT_DISPLAY_NAMES['palm'] },
          { value: 'thumb', label: UNIT_DISPLAY_NAMES['thumb'] },
          { value: 'cupped_hand', label: UNIT_DISPLAY_NAMES['cupped_hand'] }
        ]
      }
    ];
  };

  // Calculate total nutrition from edited ingredients
  // Fallback to original breakdown totals if editedIngredients is still initializing
  const totals = editedIngredients.length > 0
    ? editedIngredients.reduce(
        (acc, ing) => ({
          kcal: acc.kcal + ing.kcal,
          proteinG: acc.proteinG + ing.proteinG,
          fatG: acc.fatG + ing.fatG,
          carbsG: acc.carbsG + ing.carbsG,
          fiberG: acc.fiberG + ing.fiberG
        }),
        { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 }
      )
    : breakdown
    ? {
        kcal: breakdown.totalKcal,
        proteinG: breakdown.totalProteinG,
        fatG: breakdown.totalFatG,
        carbsG: breakdown.totalCarbsG,
        fiberG: breakdown.totalFiberG
      }
    : { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setRecipeName('');
        setBreakdown(null);
        setEditedIngredients([]);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-recipe-breakdown">
          <ChefHat className="w-4 h-4 mr-2" />
          {t('log:recipe.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('log:recipe.title')}</DialogTitle>
          <DialogDescription>
            {t('log:recipe.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!breakdown ? (
            <div className="space-y-3">
              <Input
                placeholder={t('log:recipe.placeholder')}
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBreakdown()}
                data-testid="input-recipe-name"
              />
              <Button
                onClick={handleBreakdown}
                disabled={!recipeName.trim() || breakdownMutation.isPending}
                className="w-full"
                data-testid="button-analyze-recipe"
              >
                {breakdownMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('log:recipe.analyzing')}
                  </>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4 mr-2" />
                    {t('log:recipe.startAnalysis')}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg" data-testid="text-recipe-name">{breakdown.recipeName}</CardTitle>
                  <CardDescription>{breakdown.servings} {t('log:recipe.servings')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-muted-foreground">{t('log:recipe.kcal')}</div>
                      <div className="font-semibold" data-testid="text-total-kcal">{totals.kcal.toFixed(0)} kcal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">{t('log:recipe.protein')}</div>
                      <div className="font-semibold">{totals.proteinG.toFixed(1)}g</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">{t('log:recipe.fat')}</div>
                      <div className="font-semibold">{totals.fatG.toFixed(1)}g</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">{t('log:recipe.carbs')}</div>
                      <div className="font-semibold">{totals.carbsG.toFixed(1)}g</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t('log:recipe.ingredientsList')}</h4>
                <div className="space-y-2">
                  <TooltipProvider>
                    {editedIngredients.map((ingredient, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium" data-testid={`text-ingredient-name-${idx}`}>
                                  {ingredient.name}
                                </div>
                              </div>
                              <div className="text-right text-sm">
                                <div className="font-semibold">{ingredient.kcal.toFixed(0)} kcal</div>
                                <div className="text-muted-foreground">
                                  P:{ingredient.proteinG.toFixed(1)}g F:{ingredient.fatG.toFixed(1)}g C:{ingredient.carbsG.toFixed(1)}g
                                </div>
                              </div>
                            </div>

                            {/* Level 1: Quick Buttons */}
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">{t('log:recipe.quickAdd')}</div>
                              <div className="flex gap-2 flex-wrap">
                                {getQuickButtons(ingredient.name, t).map((btn, btnIdx) => (
                                  <Button
                                    key={btnIdx}
                                    size="default"
                                    variant="outline"
                                    onClick={() => handleQuickAdd(idx, btn.grams)}
                                    className="h-10 min-w-[44px] text-xs px-3"
                                    data-testid={`button-quick-add-${idx}-${btnIdx}`}
                                  >
                                    {btn.label}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Level 2: Slider */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">{t('log:recipe.slideAdjust')}</span>
                                <span className="text-xs font-medium">{ingredient.amountG.toFixed(0)}g</span>
                              </div>
                              <Slider
                                value={[Math.min(Math.max(ingredient.originalAmountG * 2, ingredient.amountG + 200, 500), Math.max(0, ingredient.amountG))]}
                                onValueChange={([value]) => handleSliderChange(idx, value)}
                                max={Math.max(ingredient.originalAmountG * 2, ingredient.amountG + 200, 500)}
                                step={5}
                                className="w-full"
                                data-testid={`slider-ingredient-${idx}`}
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0g</span>
                                <span>{Math.max(ingredient.originalAmountG * 2, ingredient.amountG + 200, 500).toFixed(0)}g</span>
                              </div>
                            </div>

                            {/* Level 3: Manual Input (Optional) */}
                            <details className="group">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                                <span>{t('log:recipe.manualInput')}</span>
                                <span className="text-[10px]">{t('log:recipe.optional')}</span>
                              </summary>
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-muted-foreground">{t('log:recipe.quantity')}</span>
                                <Input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  value={ingredient.amount.toFixed(1)}
                                  onChange={(e) => handleAmountChange(idx, e.target.value)}
                                  className="w-20 h-8 text-sm"
                                  data-testid={`input-ingredient-amount-${idx}`}
                                />
                                <Select
                                  value={ingredient.unit}
                                  onValueChange={(value) => handleUnitChange(idx, value)}
                                >
                                  <SelectTrigger className="w-24 h-8 text-sm" data-testid={`select-ingredient-unit-${idx}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getUnitOptions().map((group) => (
                                      <div key={group.label}>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                          {group.label}
                                        </div>
                                        {group.units.map((unit) => (
                                          <SelectItem 
                                            key={unit.value} 
                                            value={unit.value}
                                            data-testid={`select-option-unit-${idx}-${unit.value}`}
                                          >
                                            {unit.label}
                                          </SelectItem>
                                        ))}
                                      </div>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                                      <Info className="w-3 h-3" />
                                      <span>{t('log:recipe.approx')} {ingredient.amountG.toFixed(0)}g</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-1 text-xs">
                                      <div>{t('log:recipe.currentConversion')} {ingredient.amount.toFixed(1)} {UNIT_DISPLAY_NAMES[ingredient.unit]} = {ingredient.amountG.toFixed(0)}g</div>
                                      {['fist', 'palm', 'thumb', 'cupped_hand'].includes(ingredient.unit) && (
                                        <div className="pt-1 border-t">
                                          {HAND_PORTION_DESCRIPTIONS[ingredient.unit as keyof typeof HAND_PORTION_DESCRIPTIONS]?.zh}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </details>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBreakdown(null);
                    setRecipeName('');
                    setEditedIngredients([]);
                  }}
                  className="flex-1"
                  data-testid="button-try-another"
                >
                  {t('log:recipe.reset')}
                </Button>
                <Button
                  onClick={handleLogAll}
                  disabled={logAllMutation.isPending}
                  className="flex-1"
                  data-testid="button-log-all-ingredients"
                >
                  {logAllMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('log:adding')}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t('log:recipe.logAll')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
