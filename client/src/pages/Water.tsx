import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { WaterBottle } from "@/components/WaterBottle";
import { WaterGuidance } from "@/components/WaterGuidance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AdBanner } from "@/components/AdBanner";
import { Plus, Droplet, Loader2, Sparkles, Trash2, Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ozToMl, mlToOz } from "@shared/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { playDrinkingSound, playCelebrationSound, resumeAudioContext } from "@/lib/soundEffects";
import { 
  BEVERAGE_CONFIGS, 
  type BeverageType, 
  getBeverageName, 
  getBeverageIcon,
  getZeroCalorieBeverageTypes,
  isZeroCalorieBeverage,
  isRestrictedBeverage,
  getBeverageCategory
} from "@shared/beverageTypes";

interface Summary {
  target: { waterOz: number };
  current: { waterOz: number };
}

interface WaterLog {
  id: string;
  amountOz: number;
  beverageType: BeverageType;
  effectiveOz: number;
  datetime: string;
}

interface WaterGuidanceData {
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

export default function Water() {
  const { t } = useTranslation(['water', 'common']);
  const { toast } = useToast();
  const { hasFeature } = useSubscription();
  
  // Read scheduleId from URL query parameters
  const scheduleId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('scheduleId');
    console.log('[Water] Reading scheduleId from URL:', id);
    return id || undefined;
  }, []);
  
  const [unit, setUnit] = useState<'oz' | 'ml'>('oz');
  const [customAmount, setCustomAmount] = useState('');
  const [beverageType, setBeverageType] = useState<BeverageType>('water');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isNearFull, setIsNearFull] = useState(false);
  const [hasPlayedCelebration, setHasPlayedCelebration] = useState(false);
  const [editingLog, setEditingLog] = useState<WaterLog | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editBeverageType, setEditBeverageType] = useState<BeverageType>('water');

  // Fetch today's summary
  const { data: summary, isLoading } = useQuery<Summary>({
    queryKey: ['/api/summary/today']
  });
  
  // Fetch today's water logs
  const { data: waterLogs = [], isLoading: isLoadingLogs } = useQuery<WaterLog[]>({
    queryKey: ['/api/waterlogs/today']
  });

  // Fetch water guidance (dynamic recommendations)
  const { data: guidance, isLoading: isLoadingGuidance } = useQuery<WaterGuidanceData>({
    queryKey: ['/api/water/guidance'],
    queryFn: async () => {
      const res = await apiRequest('POST', '/api/water/guidance', {});
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute for dynamic updates
  });
  
  const current = summary?.current.waterOz || 0;
  const target = summary?.target.waterOz || 100;
  const progress = (current / target) * 100;
  
  // Check if near full (>85%) or exceeded
  useEffect(() => {
    if (progress > 85 && progress < 100) {
      setIsNearFull(true);
    } else {
      setIsNearFull(false);
    }
    
    // Show celebration when reaching or exceeding 100% (only once)
    if (progress >= 100 && current > 0 && !hasPlayedCelebration) {
      setShowCelebration(true);
      playCelebrationSound(); // Play celebration sound
      setHasPlayedCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
    
    // Reset celebration flag when dropping below 100%
    if (progress < 100 && hasPlayedCelebration) {
      setHasPlayedCelebration(false);
    }
  }, [progress, current, hasPlayedCelebration]);

  // Add water mutation
  const addWaterMutation = useMutation({
    mutationFn: async ({ amountOz, beverageType }: { amountOz: number; beverageType: BeverageType }) => {
      const res = await apiRequest('POST', '/api/waterlog', { amountOz, beverageType, scheduleId });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to log water');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Play drinking sound effect
      playDrinkingSound();
      
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waterlogs/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/water/guidance'] }); // Refresh guidance
      
      // Check if black coffee was capped at 30%
      if (data.wasReduced) {
        toast({
          title: t('water:coffeeLimitTitle'),
          description: t('water:coffeeLimitDesc', { amount: data.cappedOz.toFixed(1) }),
          variant: 'default'
        });
      } else {
        toast({
          title: scheduleId ? t('water:backfillSuccess') : t('water:addSuccess'),
          description: scheduleId ? t('water:backfillSuccessDesc') : t('water:addSuccessDesc')
        });
      }
      
      // Navigate back to timeline if this was a scheduled reminder
      if (scheduleId) {
        setTimeout(() => window.history.back(), 500);
      }
    },
    onError: () => {
      toast({
        title: t('water:addError'),
        description: t('water:addErrorDesc'),
        variant: 'destructive'
      });
    }
  });
  
  // Delete water log mutation
  const deleteWaterMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await apiRequest('DELETE', `/api/waterlog/${logId}`, {});
      if (!res.ok) throw new Error('Failed to delete water log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waterlogs/today'] });
      toast({
        title: t('water:deleteSuccess'),
        description: t('water:deleteSuccessDesc')
      });
    },
    onError: () => {
      toast({
        title: t('water:deleteError'),
        description: t('water:deleteErrorDesc'),
        variant: 'destructive'
      });
    }
  });

  // Update water mutation
  const updateWaterMutation = useMutation({
    mutationFn: async ({ id, amountOz, beverageType }: { id: string; amountOz?: number; beverageType?: BeverageType }) => {
      const res = await apiRequest('PATCH', `/api/waterlog/${id}`, { amountOz, beverageType });
      if (!res.ok) throw new Error('Failed to update water log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waterlogs/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/water/guidance'] });
      toast({
        title: t('water:updateSuccess'),
        description: t('water:updateSuccessDesc')
      });
      setEditingLog(null);
    },
    onError: () => {
      toast({
        title: t('water:updateError'),
        description: t('water:updateErrorDesc'),
        variant: 'destructive'
      });
    }
  });

  const addWater = (amount: number) => {
    // Resume audio context on user interaction (required for browsers)
    resumeAudioContext();
    addWaterMutation.mutate({ amountOz: amount, beverageType });
  };

  const handleEdit = (log: WaterLog) => {
    setEditingLog(log);
    setEditAmount(log.amountOz.toString());
    setEditBeverageType(log.beverageType);
  };

  const handleSaveEdit = () => {
    if (!editingLog || !editAmount) return;
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount <= 0) return;
    
    updateWaterMutation.mutate({
      id: editingLog.id,
      amountOz: newAmount,
      beverageType: editBeverageType
    });
  };

  const displayCurrent = unit === 'oz' ? current : ozToMl(current);
  const displayTarget = unit === 'oz' ? target : ozToMl(target);
  const displayExcess = progress >= 100 ? (displayCurrent - displayTarget) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-semibold text-foreground">{t('water:title')}</h1>
          
          {/* Unit Toggle */}
          <Tabs value={unit} onValueChange={(v) => setUnit(v as 'oz' | 'ml')} className="w-auto">
            <TabsList className="h-9">
              <TabsTrigger value="oz" className="text-xs px-3" data-testid="unit-oz">
                oz
              </TabsTrigger>
              <TabsTrigger value="ml" className="text-xs px-3" data-testid="unit-ml">
                ml
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 space-y-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Water Bottle Visualization */}
            <motion.div 
              className="flex justify-center"
              animate={isNearFull ? {
                rotate: [0, -2, 2, -2, 2, 0],
                transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
              } : {}}
            >
              <WaterBottle current={current} target={target} size="md" />
            </motion.div>

            {/* Progress Text */}
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">{t('water:todayConsumed')}</div>
              <div className="font-mono text-3xl font-bold text-foreground">
                {displayCurrent.toFixed(unit === 'ml' ? 0 : 1)}
                <span className="text-lg text-muted-foreground ml-2">{unit}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {t('water:target')} {displayTarget.toFixed(unit === 'ml' ? 0 : 1)} {unit}
              </div>
              {progress < 100 ? (
                <div className="text-xs text-muted-foreground">
                  {t('water:remainingAmount')} {(displayTarget - displayCurrent).toFixed(unit === 'ml' ? 0 : 1)} {unit}
                </div>
              ) : (
                <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                  +{displayExcess.toFixed(unit === 'ml' ? 0 : 1)} {unit} {t('water:exceededAmount')}
                </div>
              )}
            </div>
            
            {/* Celebration Animation */}
            <AnimatePresence>
              {showCelebration && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
                >
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 1, repeat: 2 }}
                    className="bg-green-500 rounded-full p-8"
                  >
                    <Sparkles className="w-16 h-16 text-white" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Beverage Type Selector - Zero-Calorie Only */}
            <Card className="p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('water:beverageTypeTitle')}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('water:beverageTypeDesc')}
                </p>
              </div>
              <Select value={beverageType} onValueChange={(v) => setBeverageType(v as BeverageType)}>
                <SelectTrigger className="w-full" data-testid="select-beverage-type">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{getBeverageIcon(beverageType)}</span>
                      <span>{t(`water:beverageTypes.${beverageType}`)}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        ({t('water:effectiveHydrationPercent', { percent: (BEVERAGE_CONFIGS[beverageType].hydrationFactor * 100).toFixed(0) })})
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {getZeroCalorieBeverageTypes().map((bevType) => {
                    const config = BEVERAGE_CONFIGS[bevType];
                    return (
                      <SelectItem key={bevType} value={bevType}>
                        <div className="flex items-center gap-2">
                          <span>{getBeverageIcon(bevType)}</span>
                          <span>{t(`water:beverageTypes.${bevType}`)}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            ({(config.hydrationFactor * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {/* Info banner for caloric beverages */}
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">
                  💡 <span className="font-semibold">{t('water:caloricBeverageTitle')}</span>{t('water:caloricBeverageDesc')}
                </p>
              </div>
            </Card>

            {/* Quick Add Buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground px-1">{t('water:quickAdd')}</h3>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  className="h-16 flex-col gap-1"
                  onClick={() => addWater(4)}
                  data-testid="button-add-4oz"
                >
                  <Droplet className="w-3 h-3" />
                  <span className="text-xs font-semibold">+4 oz</span>
                  <span className="text-[10px] text-muted-foreground">
                    {unit === 'ml' ? `${ozToMl(4).toFixed(0)}ml` : ''}
                  </span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-16 flex-col gap-1"
                  onClick={() => addWater(8)}
                  data-testid="button-add-8oz"
                >
                  <Droplet className="w-4 h-4" />
                  <span className="text-xs font-semibold">+8 oz</span>
                  <span className="text-[10px] text-muted-foreground">
                    {unit === 'ml' ? `${ozToMl(8).toFixed(0)}ml` : ''}
                  </span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-16 flex-col gap-1"
                  onClick={() => addWater(12)}
                  data-testid="button-add-12oz"
                >
                  <Droplet className="w-5 h-5" />
                  <span className="text-xs font-semibold">+12 oz</span>
                  <span className="text-[10px] text-muted-foreground">
                    {unit === 'ml' ? `${ozToMl(12).toFixed(0)}ml` : ''}
                  </span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-16 flex-col gap-1"
                  onClick={() => addWater(16)}
                  data-testid="button-add-16oz"
                >
                  <Droplet className="w-6 h-6" />
                  <span className="text-xs font-semibold">+16 oz</span>
                  <span className="text-[10px] text-muted-foreground">
                    {unit === 'ml' ? `${ozToMl(16).toFixed(0)}ml` : ''}
                  </span>
                </Button>
              </div>
            </div>

            {/* Custom Amount - Moved to bottom with new label */}
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{t('water:manualInput')}</h3>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={t('water:inputPlaceholder', { unit: unit === 'oz' ? 'oz' : 'ml' })}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1"
                  data-testid="input-custom-water"
                />
                <Button
                  onClick={() => {
                    const amount = parseFloat(customAmount);
                    if (amount > 0) {
                      const ozAmount = unit === 'oz' ? amount : mlToOz(amount);
                      addWater(ozAmount);
                      setCustomAmount('');
                    }
                  }}
                  disabled={!customAmount || parseFloat(customAmount) <= 0}
                  data-testid="button-add-custom"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('water:addButton')}
                </Button>
              </div>
            </Card>

            {/* Water Guidance - Dynamic Recommendations */}
            {!isLoadingGuidance && guidance && (
              <WaterGuidance {...guidance} />
            )}

            {/* Today's Logs (Plus+ feature) */}
            {hasFeature('water_history') ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground px-1">{t('water:todayLogs')}</h3>
                {isLoadingLogs ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                  </div>
                ) : waterLogs.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {t('water:noHistory')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waterLogs.map((log, index) => {
                      const displayAmount = unit === 'oz' ? log.amountOz : ozToMl(log.amountOz);
                      const displayEffective = unit === 'oz' ? log.effectiveOz : ozToMl(log.effectiveOz);
                      const logTime = new Date(log.datetime).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                      const beverageConfig = BEVERAGE_CONFIGS[log.beverageType];
                      
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                                  <span className="text-lg">{getBeverageIcon(log.beverageType)}</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-foreground">
                                      +{displayAmount.toFixed(unit === 'ml' ? 0 : 1)} {unit}
                                    </p>
                                    {log.beverageType !== 'water' && (
                                      <span className="text-xs text-muted-foreground">
                                        → {displayEffective.toFixed(unit === 'ml' ? 0 : 1)} {unit} {t('water:effective')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {t(`water:beverageTypes.${log.beverageType}`)} · {logTime}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(log)}
                                  data-testid={`button-edit-log-${log.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => deleteWaterMutation.mutate(log.id)}
                                  disabled={deleteWaterMutation.isPending}
                                  data-testid={`button-delete-log-${log.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <Droplet className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{t('water:historyLocked')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t('water:historyLockedDesc')}</p>
                  <Button variant="default" size="sm" onClick={() => window.location.href = '/pricing'}>
                    {t('common:upgradePlus')}
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Advertisement Banner - Free users only */}
        <AdBanner position="bottom" className="mt-6" />
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('water:editWaterLog')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Beverage Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('water:beverageType')}</label>
              <Select value={editBeverageType} onValueChange={(v) => setEditBeverageType(v as BeverageType)}>
                <SelectTrigger data-testid="edit-beverage-type">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{getBeverageIcon(editBeverageType)}</span>
                      <span>{t(`water:beverageTypes.${editBeverageType}`)}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(BEVERAGE_CONFIGS).map((type) => {
                    const bevType = type as BeverageType;
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <span>{getBeverageIcon(bevType)}</span>
                          <span>{t(`water:beverageTypes.${bevType}`)}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('water:amountOz')}</label>
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder={t('water:enterOzAmount')}
                data-testid="edit-amount"
              />
            </div>

            {/* Effective Amount Display */}
            {editBeverageType !== 'water' && editAmount && (
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                {t('water:effectiveHydration')} {(parseFloat(editAmount) * BEVERAGE_CONFIGS[editBeverageType].hydrationFactor).toFixed(1)} oz
                ({(BEVERAGE_CONFIGS[editBeverageType].hydrationFactor * 100).toFixed(0)}% {t('water:conversionRate')})
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingLog(null)}
                data-testid="button-cancel-edit"
              >
                {t('water:cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveEdit}
                disabled={!editAmount || parseFloat(editAmount) <= 0 || updateWaterMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateWaterMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('water:save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
