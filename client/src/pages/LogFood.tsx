import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ScanBarcode, Clock, Plus, Loader2, Camera, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { WeightUnit } from "@shared/utils";
import { toGrams, calcNutritionPerIntake } from "@shared/utils";
import { convertToGrams, UNIT_DISPLAY_NAMES, HAND_PORTION_DESCRIPTIONS, FoodUnitType } from "@shared/foodUnits";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FoodItem } from "@shared/schema";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { BarcodeResultModal } from "@/components/BarcodeResultModal";
import { OCRScanner, type OCRNutritionResult } from "@/components/OCRScanner";
import { RecipeBreakdown } from "@/components/RecipeBreakdown";
import { FoodQRCode } from "@/components/FoodQRCode";
import { QRScanner } from "@/components/QRScanner";
import { ProteinPowderDialog } from "@/components/ProteinPowderDialog";
import { USDASearch } from "@/components/USDASearch";
import { AdBanner } from "@/components/AdBanner";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { Lock } from "lucide-react";

export default function LogFood() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  
  // Read scheduleId from URL query parameters
  const scheduleId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('scheduleId');
    console.log('[LogFood] Reading scheduleId from URL:', id);
    return id || undefined;
  }, []);
  
  // Ref for auto-scrolling to input form
  const portionInputRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('g'); // Changed to string to support all unit types
  const [amount, setAmount] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showBarcodeResult, setShowBarcodeResult] = useState(false);
  const [scannedFood, setScannedFood] = useState<FoodItem | null>(null);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showProteinDialog, setShowProteinDialog] = useState(false);
  const [showUSDASearch, setShowUSDASearch] = useState(false);

  // Fetch foods with language parameter
  const { data: foods = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ['/api/foods/search', searchQuery, i18n.language],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      params.append('lang', i18n.language);
      const res = await fetch(`/api/foods/search?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch foods');
      return res.json();
    }
  });

  // Fetch today's summary for displaying current progress
  const { data: todaySummary } = useQuery<{
    target: { kcal: number; proteinG: number; fatG: number; carbsG: number; fiberG: number; waterOz: number };
    consumed: { kcal: number; proteinG: number; fatG: number; carbsG: number; fiberG: number };
    water: { drankOz: number };
  }>({
    queryKey: ['/api/summary/today']
  });

  // Add food log mutation
  const addFoodMutation = useMutation({
    mutationFn: async (data: { foodId: string; amountValue: number; amountUnit: WeightUnit; scheduleId?: string }) => {
      const res = await apiRequest('POST', '/api/foodlog', data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to log food');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/foodlogs/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/today'] });
      setSelectedFood(null);
      setAmount('');
      toast({
        title: scheduleId ? t('log:backfillSuccess') : t('log:addSuccess'),
        description: scheduleId ? t('log:backfillSuccessDesc') : t('log:addSuccessDesc')
      });
      
      // Navigate back to timeline if this was a scheduled reminder
      if (scheduleId) {
        setTimeout(() => window.history.back(), 500);
      }
    },
    onError: () => {
      toast({
        title: t('log:addError'),
        description: t('log:addErrorDesc'),
        variant: 'destructive'
      });
    }
  });

  const handleAddToLog = () => {
    if (!selectedFood || !amount) return;
    console.log('[LogFood] Adding with scheduleId:', scheduleId);
    
    // Convert amount in current unit to grams
    const foodKey = selectedFood.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '');
    const gramsValue = selectedUnit === 'serving' && selectedFood.gramsPerServing
      ? parseFloat(amount) * selectedFood.gramsPerServing
      : convertToGrams(parseFloat(amount), selectedUnit, foodKey);
    
    // Send to backend in grams
    addFoodMutation.mutate({
      foodId: selectedFood.id,
      amountValue: gramsValue,
      amountUnit: 'g' as WeightUnit,
      scheduleId
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

  // Calculate equivalent grams for display
  const getEquivalentGrams = (): number => {
    if (!selectedFood || !amount) return 0;
    const foodKey = selectedFood.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '');
    if (selectedUnit === 'serving' && selectedFood.gramsPerServing) {
      return parseFloat(amount) * selectedFood.gramsPerServing;
    }
    return convertToGrams(parseFloat(amount), selectedUnit, foodKey);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const res = await apiRequest('GET', `/api/barcode/${barcode}`, undefined);
      if (!res.ok) {
        throw new Error('Barcode not found');
      }
      const food = await res.json();
      setScannedFood(food);
      setShowBarcodeResult(true);
    } catch (error) {
      setShowScanner(false); // Close scanner on error
      toast({
        title: t('log:barcodeNotFound'),
        description: t('log:barcodeNotFoundDesc'),
        variant: 'destructive'
      });
    }
  };

  const handleBarcodeAddToLog = (foodId: string, amountValue: number, amountUnit: WeightUnit) => {
    addFoodMutation.mutate({ foodId, amountValue, amountUnit, scheduleId });
  };

  const handleBarcodeFillRemaining = (foodId: string) => {
    toast({
      title: t('log:fillRemaining'),
      description: t('log:fillRemainingDesc')
    });
  };

  // Handle food selection with auto-scroll
  const handleFoodSelect = (food: FoodItem) => {
    setSelectedFood(food);
    
    // Auto-scroll to input form after a short delay
    setTimeout(() => {
      portionInputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  // Auto-fill default amount/unit when food is selected
  useEffect(() => {
    if (selectedFood) {
      // Set default amount to 100g or 1 serving if available
      if (selectedFood.gramsPerServing) {
        setAmount('1');
        setSelectedUnit('serving');
      } else {
        setAmount('100');
        setSelectedUnit('g');
      }
    }
  }, [selectedFood]);

  // Create food item mutation
  const createFoodMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      brand?: string;
      kcal100g: number;
      protein100g: number;
      fat100g: number;
      carbs100g: number;
      fiber100g?: number;
      sodium100g?: number;
      gramsPerServing?: number;
      source: string;
      tags?: string[];
      contributeToPublic?: boolean;
    }) => {
      // Auto-contribute OCR and QR foods to public database
      const endpoint = data.contributeToPublic ? '/api/foods/contribute' : '/api/foods';
      const res = await apiRequest('POST', endpoint, data);
      return res.json() as Promise<FoodItem>;
    },
    onSuccess: (newFood) => {
      queryClient.invalidateQueries({ queryKey: ['/api/foods/search'] });
      toast({
        title: t('log:createSuccess'),
        description: t('log:createSuccessDesc', { name: newFood.name })
      });
      // Auto-select the newly created food (useEffect will set default amount/unit)
      setSelectedFood(newFood);
    },
    onError: (error: Error) => {
      toast({
        title: t('log:createError'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleOCRResult = (result: OCRNutritionResult) => {
    // Show confidence warning if needed
    if (result.confidence === 'low') {
      toast({
        title: t('log:ocr.lowConfidence'),
        description: t('log:ocr.lowConfidenceDesc'),
        variant: 'destructive'
      });
    }

    // Show any warnings from OCR
    if (result.warnings && result.warnings.length > 0) {
      result.warnings.forEach((warning) => {
        toast({
          title: t('log:ocr.warning'),
          description: warning,
        });
      });
    }

    // Create food item from OCR result and contribute to public database
    createFoodMutation.mutate({
      name: result.name,
      brand: result.brand,
      kcal100g: result.kcal100g,
      protein100g: result.protein100g,
      fat100g: result.fat100g,
      carbs100g: result.carbs100g,
      fiber100g: result.fiber100g ?? 0, // Default to 0 if not extracted
      sodium100g: result.sodium100g ?? 0, // Default to 0 if not extracted
      gramsPerServing: result.servingSizeG,
      source: 'ocr',
      tags: [], // Empty tags array for OCR foods
      contributeToPublic: true // Auto-contribute OCR foods to help community
    });
  };

  const handleQRScanSuccess = (qrResult: any) => {
    // Create food item from QR code data and contribute to public database
    createFoodMutation.mutate({
      name: qrResult.food.name,
      brand: qrResult.food.brand,
      kcal100g: qrResult.food.kcal100g,
      protein100g: qrResult.food.protein100g,
      fat100g: qrResult.food.fat100g,
      carbs100g: qrResult.food.carbs100g,
      fiber100g: qrResult.food.fiber100g ?? 0,
      sodium100g: qrResult.food.sodium100g ?? 0,
      gramsPerServing: qrResult.food.gramsPerServing,
      source: 'qr-code',
      tags: [],
      contributeToPublic: true // Auto-contribute QR foods to help community
    });
  };

  const calculateNutrition = () => {
    if (!selectedFood || !amount) return null;
    
    // Use new unit conversion system
    const grams = getEquivalentGrams();
    
    return calcNutritionPerIntake(grams, {
      kcal: selectedFood.kcal100g,
      P: selectedFood.protein100g,
      F: selectedFood.fat100g,
      C: selectedFood.carbs100g,
      fiber: selectedFood.fiber100g
    });
  };

  const nutrition = calculateNutrition();

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Sticky Search Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="px-4 py-3 space-y-3">
          <h1 className="text-xl font-semibold text-foreground">{t('log:title')}</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('log:searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-24 h-14"
              data-testid="input-search-food"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                data-testid="button-recent"
              >
                <Clock className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setShowOCRScanner(true)}
                data-testid="button-scan-ocr"
              >
                <Camera className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setShowScanner(true)}
                data-testid="button-scan-barcode"
              >
                <ScanBarcode className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="default"
            onClick={() => setShowProteinDialog(true)} 
            data-testid="button-quick-protein"
            className="flex-1 min-w-fit"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('log:protein.quickAdd')}
          </Button>
          <RecipeBreakdown />
          <Button 
            variant="outline" 
            onClick={() => {
              if (!isPro) {
                toast({
                  title: t('log:proFeature'),
                  description: t('log:proFeatureDesc'),
                  variant: "destructive"
                });
                return;
              }
              setShowUSDASearch(true);
            }} 
            data-testid="button-usda-search"
          >
            {!isPro && <Lock className="w-3 h-3 mr-1" />}
            <Search className="w-4 h-4 mr-2" />
            {t('log:usda.search')}
          </Button>
          <Button variant="outline" onClick={() => setShowQRScanner(true)} data-testid="button-scan-qr">
            <Search className="w-4 h-4 mr-2" />
            {t('log:scanQRCode')}
          </Button>
        </div>

        {/* Search Results */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {foods.map((food) => (
            <Card
              key={food.id}
              className={`cursor-pointer transition-colors hover-elevate ${
                selectedFood?.id === food.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleFoodSelect(food)}
              data-testid={`food-item-${food.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-foreground truncate">
                      {food.name}
                    </h3>
                    {food.brand && (
                      <p className="text-sm text-muted-foreground">{food.brand}</p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap items-center">
                      {food.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      <FoodQRCode 
                        food={food}
                        trigger={
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 px-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Search className="w-3 h-3" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">{t('log:per100g')}</div>
                    <div className="font-mono text-sm font-semibold text-foreground">
                      {food.kcal100g} kcal
                    </div>
                    <div className="font-mono text-xs text-muted-foreground mt-1">
                      P {food.protein100g}g
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}

        {/* Portion Input (shown when food selected) */}
        {selectedFood && (
          <Card ref={portionInputRef} className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('log:addingPrefix')} {selectedFood.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount Input with Units */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('log:quantityLabel')}</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-lg font-mono"
                      data-testid="input-amount"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('log:unitLabel')}</label>
                    <Select
                      value={selectedUnit}
                      onValueChange={(v) => setSelectedUnit(v)}
                    >
                      <SelectTrigger data-testid="select-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getUnitOptions().map((group) => (
                          <div key={group.label}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {group.label}
                            </div>
                            {group.units.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                        {selectedFood.gramsPerServing && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {t('log:unitCategories.other')}
                            </div>
                            <SelectItem value="serving">{t('log:unitCategories.serving')}</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Unit conversion tooltip */}
                {selectedUnit !== 'g' && amount && parseFloat(amount) > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help p-2 rounded bg-muted/30">
                          <Info className="w-4 h-4" />
                          <span>
                            {amount} {UNIT_DISPLAY_NAMES[selectedUnit] || selectedUnit} ≈ {getEquivalentGrams().toFixed(0)}g
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1 text-xs">
                          <div>{t('log:currentConversion')} {amount} {UNIT_DISPLAY_NAMES[selectedUnit] || selectedUnit} = {getEquivalentGrams().toFixed(0)}g</div>
                          {['fist', 'palm', 'thumb', 'cupped_hand'].includes(selectedUnit) && (
                            <div className="pt-1 border-t">
                              {HAND_PORTION_DESCRIPTIONS[selectedUnit as keyof typeof HAND_PORTION_DESCRIPTIONS]?.zh}
                            </div>
                          )}
                          <div className="pt-1 border-t text-muted-foreground">
                            {t('log:handPortionTip')}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Real-time Nutrition Display */}
              {nutrition && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="text-sm font-semibold text-foreground">{t('log:thisIntakeNutrition')}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">{t('log:calories')}</div>
                      <div className="font-mono text-lg font-semibold text-foreground">
                        {nutrition.kcal} kcal
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('log:protein')}</div>
                      <div className="font-mono text-lg font-semibold text-foreground">
                        {nutrition.P} g
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('log:fat')}</div>
                      <div className="font-mono text-lg font-semibold text-foreground">
                        {nutrition.F} g
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('log:carbs')}</div>
                      <div className="font-mono text-lg font-semibold text-foreground">
                        {nutrition.C} g
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t('log:fiber')}</div>
                      <div className="font-mono text-lg font-semibold text-foreground">
                        {nutrition.fiber} g
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  className="w-full h-12"
                  onClick={handleAddToLog}
                  disabled={!amount || parseFloat(amount) <= 0 || addFoodMutation.isPending}
                  data-testid="button-add-to-log"
                >
                  {addFoodMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {t('log:addToLog')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12"
                  disabled={!amount || parseFloat(amount) <= 0}
                  data-testid="button-use-for-remaining"
                >
                  {t('log:useForRemaining')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('log:todaySummary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('log:consumedVsTarget')}</span>
            </div>
            {todaySummary?.consumed && todaySummary?.target ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground">{t('log:calories')}</span>
                  <div className="font-mono text-sm">
                    <span className="font-semibold text-foreground">
                      {Math.round(todaySummary.consumed.kcal || 0)}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}/ {Math.round(todaySummary.target.kcal || 0)} kcal
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground">{t('log:protein')}</span>
                  <div className="font-mono text-sm">
                    <span className="font-semibold text-foreground">
                      {Math.round(todaySummary.consumed.proteinG || 0)}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}/ {Math.round(todaySummary.target.proteinG || 0)} g
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advertisement Banner - Free users only */}
        <AdBanner position="bottom" className="mt-6" />
      </main>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Barcode Result Modal */}
      <BarcodeResultModal
        open={showBarcodeResult}
        onClose={() => {
          setShowBarcodeResult(false);
          setScannedFood(null);
        }}
        food={scannedFood}
        onAddToLog={handleBarcodeAddToLog}
        onFillRemaining={handleBarcodeFillRemaining}
      />

      {/* OCR Scanner Modal */}
      <OCRScanner
        open={showOCRScanner}
        onClose={() => setShowOCRScanner(false)}
        onResult={handleOCRResult}
      />

      {/* QR Code Scanner Modal */}
      <QRScanner
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleQRScanSuccess}
      />

      {/* Protein Powder Dialog */}
      <ProteinPowderDialog
        open={showProteinDialog}
        onClose={() => setShowProteinDialog(false)}
      />

      {/* USDA Search Dialog */}
      <USDASearch
        open={showUSDASearch}
        onClose={() => setShowUSDASearch(false)}
        onImport={(foodItem) => {
          // Optionally auto-select the imported food
          setSelectedFood(foodItem);
        }}
      />
    </div>
  );
}
