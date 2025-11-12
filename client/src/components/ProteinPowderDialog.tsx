import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScanBarcode, Save, Upload, Trash2, Camera, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { OCRScanner } from "@/components/OCRScanner";
import type { FoodItem, ProteinPowderPreset } from "@shared/schema";
import type { WeightUnit } from "@shared/utils";

interface ProteinPowderDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProteinPowderDialog({ open, onClose }: ProteinPowderDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // State
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [servingMode, setServingMode] = useState<"1" | "1.5" | "2" | "custom">("1");
  const [customScoops, setCustomScoops] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string>("");
  
  // Solvent and volume state
  const [solvent, setSolvent] = useState<"water" | "skim-milk" | "whole-milk" | "plant-milk" | "other">("water");
  const [volumeValue, setVolumeValue] = useState<string>("500");
  const [volumeUnit, setVolumeUnit] = useState<"ml" | "oz">("ml");
  
  // New preset form state
  const [showNewPresetForm, setShowNewPresetForm] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newScoopSize, setNewScoopSize] = useState("");
  const [newKcal, setNewKcal] = useState("");
  const [newProtein, setNewProtein] = useState("");
  const [newFat, setNewFat] = useState("");
  const [newCarbs, setNewCarbs] = useState("");

  // Fetch user's protein powder presets
  const { data: presets = [], isLoading: presetsLoading } = useQuery<ProteinPowderPreset[]>({
    queryKey: ['/api/protein-presets'],
    enabled: open,
  });

  // Auto-select default preset or first preset
  useEffect(() => {
    if (presets.length > 0 && !selectedPresetId) {
      const defaultPreset = presets.find(p => p.isDefault);
      setSelectedPresetId(defaultPreset?.id || presets[0].id);
    }
  }, [presets, selectedPresetId]);

  // Get selected preset
  const selectedPreset = presets.find(p => p.id === selectedPresetId);

  // Calculate total scoops based on serving mode
  const getTotalScoops = (): number => {
    switch (servingMode) {
      case "1":
        return 1;
      case "1.5":
        return 1.5;
      case "2":
        return 2;
      case "custom":
        return parseFloat(customScoops) || 0;
      default:
        return 1;
    }
  };

  // Calculate nutrition for total intake (including solvent)
  const calculateNutrition = () => {
    if (!selectedPreset) {
      return {
        grams: 0,
        scoops: 0,
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      };
    }

    const scoops = getTotalScoops();
    let totalKcal = selectedPreset.kcalPerScoop * scoops;
    let totalProtein = selectedPreset.proteinPerScoop * scoops;
    let totalFat = selectedPreset.fatPerScoop * scoops;
    let totalCarbs = selectedPreset.carbsPerScoop * scoops;

    // Get volume in ml
    const volumeInMl = volumeUnit === "ml" 
      ? parseFloat(volumeValue) || 0 
      : (parseFloat(volumeValue) || 0) * 29.5735;

    // Add nutrition from milk/plant-milk (per 250ml)
    if (solvent === "skim-milk") {
      const ratio = volumeInMl / 250;
      totalKcal += 85 * ratio;
      totalProtein += 8 * ratio;
      totalCarbs += 12 * ratio;
      // Fat stays 0 for skim milk
    } else if (solvent === "whole-milk") {
      const ratio = volumeInMl / 250;
      totalKcal += 150 * ratio;
      totalProtein += 8 * ratio;
      totalCarbs += 12 * ratio;
      totalFat += 8 * ratio;
    } else if (solvent === "plant-milk") {
      // Assuming almond milk or similar - approximate values
      const ratio = volumeInMl / 250;
      totalKcal += 40 * ratio;
      totalProtein += 1 * ratio;
      totalCarbs += 2 * ratio;
      totalFat += 2.5 * ratio;
    }

    return {
      grams: selectedPreset.scoopSizeGrams * scoops,
      scoops,
      kcal: totalKcal,
      protein: totalProtein,
      fat: totalFat,
      carbs: totalCarbs,
    };
  };

  const nutrition = calculateNutrition();

  // Create new preset mutation
  const createPresetMutation = useMutation({
    mutationFn: async (data: {
      brandName: string;
      scoopSizeGrams: number;
      kcalPerScoop: number;
      proteinPerScoop: number;
      fatPerScoop: number;
      carbsPerScoop: number;
      isDefault: boolean;
    }) => {
      const res = await apiRequest('POST', '/api/protein-presets', data);
      if (!res.ok) throw new Error('Failed to create preset');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/protein-presets'] });
      setShowNewPresetForm(false);
      // Reset form
      setNewBrandName("");
      setNewScoopSize("");
      setNewKcal("");
      setNewProtein("");
      setNewFat("");
      setNewCarbs("");
      toast({
        title: "预设已保存",
        description: "蛋白粉品牌预设已成功保存",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "保存失败",
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const res = await apiRequest('DELETE', `/api/protein-presets/${presetId}`, undefined);
      if (!res.ok) throw new Error('Failed to delete preset');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/protein-presets'] });
      setShowDeleteConfirm(false);
      setPresetToDelete("");
      setSelectedPresetId("");
      toast({
        title: "预设已删除",
        description: "蛋白粉品牌预设已删除",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add to log mutation
  const addToLogMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPreset) throw new Error('No preset selected');

      const scoops = getTotalScoops();
      const volumeInMl = volumeUnit === "ml" 
        ? parseFloat(volumeValue) || 0 
        : (parseFloat(volumeValue) || 0) * 29.5735;

      // Calculate per-100g nutrition for protein powder only
      const kcal100g = (selectedPreset.kcalPerScoop / selectedPreset.scoopSizeGrams) * 100;
      const protein100g = (selectedPreset.proteinPerScoop / selectedPreset.scoopSizeGrams) * 100;
      const fat100g = (selectedPreset.fatPerScoop / selectedPreset.scoopSizeGrams) * 100;
      const carbs100g = (selectedPreset.carbsPerScoop / selectedPreset.scoopSizeGrams) * 100;

      // First, create or find the protein powder food item
      const foodData = {
        name: selectedPreset.brandName,
        kcal100g,
        protein100g,
        fat100g,
        carbs100g,
        fiber100g: 0,
        gramsPerServing: selectedPreset.scoopSizeGrams,
        source: 'user',
        tags: ['protein powder', 'supplement'],
        contributeToPublic: false,
      };

      // Create the protein powder food item
      const foodRes = await apiRequest('POST', '/api/foods', foodData);
      if (!foodRes.ok) throw new Error('Failed to create food item');
      const food: FoodItem = await foodRes.json();

      // Log the protein powder
      const logRes = await apiRequest('POST', '/api/foodlog', {
        foodId: food.id,
        amountValue: selectedPreset.scoopSizeGrams * scoops,
        amountUnit: 'g' as WeightUnit,
      });
      if (!logRes.ok) throw new Error('Failed to log food');

      // Handle solvent - add water or milk nutrition
      if (solvent === "water" && volumeInMl > 0) {
        // Add to water log (API expects amountOz)
        const amountOz = volumeInMl / 29.5735; // Convert ml to oz
        const waterRes = await apiRequest('POST', '/api/waterlog', {
          amountOz,
          beverageType: 'water',
        });
        if (!waterRes.ok) console.error('Failed to log water');
      } else if (solvent === "skim-milk" && volumeInMl > 0) {
        // Create skim milk food item and log it
        // Milk density ~1.03 g/ml, but we use 1:1 for simplicity
        const milkFood = {
          name: '脱脂牛奶',
          kcal100g: 34,
          protein100g: 3.2,
          fat100g: 0,
          carbs100g: 4.8,
          fiber100g: 0,
          gramsPerServing: 250,
          source: 'user',
          tags: ['dairy', 'milk'],
          contributeToPublic: false,
        };
        const milkRes = await apiRequest('POST', '/api/foods', milkFood);
        if (milkRes.ok) {
          const milkFoodItem: FoodItem = await milkRes.json();
          // Log using grams (milk density ~1g/ml)
          await apiRequest('POST', '/api/foodlog', {
            foodId: milkFoodItem.id,
            amountValue: volumeInMl,
            amountUnit: 'g' as WeightUnit,
          });
        }
      } else if (solvent === "whole-milk" && volumeInMl > 0) {
        // Create whole milk food item and log it
        const milkFood = {
          name: '全脂牛奶',
          kcal100g: 60,
          protein100g: 3.2,
          fat100g: 3.2,
          carbs100g: 4.8,
          fiber100g: 0,
          gramsPerServing: 250,
          source: 'user',
          tags: ['dairy', 'milk'],
          contributeToPublic: false,
        };
        const milkRes = await apiRequest('POST', '/api/foods', milkFood);
        if (milkRes.ok) {
          const milkFoodItem: FoodItem = await milkRes.json();
          // Log using grams (milk density ~1g/ml)
          await apiRequest('POST', '/api/foodlog', {
            foodId: milkFoodItem.id,
            amountValue: volumeInMl,
            amountUnit: 'g' as WeightUnit,
          });
        }
      } else if (solvent === "plant-milk" && volumeInMl > 0) {
        // Create plant milk food item and log it
        const milkFood = {
          name: '植物奶',
          kcal100g: 16,
          protein100g: 0.4,
          fat100g: 1,
          carbs100g: 0.8,
          fiber100g: 0,
          gramsPerServing: 250,
          source: 'user',
          tags: ['plant-based', 'milk'],
          contributeToPublic: false,
        };
        const milkRes = await apiRequest('POST', '/api/foods', milkFood);
        if (milkRes.ok) {
          const milkFoodItem: FoodItem = await milkRes.json();
          // Log using grams (milk density ~1g/ml)
          await apiRequest('POST', '/api/foodlog', {
            foodId: milkFoodItem.id,
            amountValue: volumeInMl,
            amountUnit: 'g' as WeightUnit,
          });
        }
      }
      // If solvent is "other", don't add anything

      return logRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/foodlogs/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waterlogs/today'] });
      
      const volumeInMl = volumeUnit === "ml" 
        ? parseFloat(volumeValue) || 0 
        : (parseFloat(volumeValue) || 0) * 29.5735;
      
      let description = `已记录${nutrition.grams.toFixed(0)}g蛋白粉`;
      if (solvent === "water" && volumeInMl > 0) {
        description += ` + ${volumeInMl.toFixed(0)}ml饮水`;
      } else if ((solvent === "skim-milk" || solvent === "whole-milk" || solvent === "plant-milk") && volumeInMl > 0) {
        const solventName = solvent === "skim-milk" ? "脱脂牛奶" : solvent === "whole-milk" ? "全脂牛奶" : "植物奶";
        description += ` + ${volumeInMl.toFixed(0)}ml${solventName}`;
      }
      
      toast({
        title: t('log:protein.logSuccess'),
        description,
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: t('log:addError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const res = await apiRequest('GET', `/api/barcode/${barcode}`, undefined);
      if (!res.ok) {
        throw new Error('Barcode not found');
      }
      const food: FoodItem = await res.json();
      
      // Auto-fill new preset form with scanned data
      setNewBrandName(food.name);
      setNewScoopSize(food.gramsPerServing?.toString() || "30");
      
      // Calculate per-scoop nutrition from per-100g data
      const scoopSize = food.gramsPerServing || 30;
      setNewKcal(((food.kcal100g * scoopSize) / 100).toFixed(0));
      setNewProtein(((food.protein100g * scoopSize) / 100).toFixed(1));
      setNewFat(((food.fat100g * scoopSize) / 100).toFixed(1));
      setNewCarbs(((food.carbs100g * scoopSize) / 100).toFixed(1));
      
      setShowNewPresetForm(true);
      
      toast({
        title: t('log:scanning.found'),
        description: food.name,
      });
    } catch (error) {
      toast({
        title: t('log:barcodeNotFound'),
        description: t('log:barcodeNotFoundDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleOCRScanned = (result: {
    name: string;
    brand?: string;
    servingSizeG?: number;
    kcal100g: number;
    protein100g: number;
    fat100g: number;
    carbs100g: number;
    fiber100g?: number;
    confidence: 'high' | 'medium' | 'low';
    warnings?: string[];
  }) => {
    // Auto-fill new preset form with OCR data
    setNewBrandName(result.brand || result.name);
    
    // Use scoop size from OCR or default to 30g
    const scoopSize = result.servingSizeG || 30;
    setNewScoopSize(scoopSize.toString());
    setNewKcal(((result.kcal100g * scoopSize) / 100).toFixed(0));
    setNewProtein(((result.protein100g * scoopSize) / 100).toFixed(1));
    setNewFat(((result.fat100g * scoopSize) / 100).toFixed(1));
    setNewCarbs(((result.carbs100g * scoopSize) / 100).toFixed(1));
    
    setShowNewPresetForm(true);
    setShowOCRScanner(false);
    
    if (result.warnings && result.warnings.length > 0) {
      toast({
        title: "OCR识别提示",
        description: result.warnings.join(', '),
      });
    }
  };

  const handleSaveNewPreset = () => {
    if (!newBrandName.trim()) {
      toast({
        title: "请输入品牌名",
        variant: 'destructive',
      });
      return;
    }

    const scoopSize = parseFloat(newScoopSize);
    const kcal = parseFloat(newKcal);
    const protein = parseFloat(newProtein);
    const fat = parseFloat(newFat);
    const carbs = parseFloat(newCarbs);

    if (!scoopSize || scoopSize <= 0) {
      toast({
        title: "请输入有效的每勺克数",
        variant: 'destructive',
      });
      return;
    }

    createPresetMutation.mutate({
      brandName: newBrandName.trim(),
      scoopSizeGrams: scoopSize,
      kcalPerScoop: kcal || 0,
      proteinPerScoop: protein || 0,
      fatPerScoop: fat || 0,
      carbsPerScoop: carbs || 0,
      isDefault: presets.length === 0, // First preset is default
    });
  };

  const handleAddToLog = () => {
    if (!selectedPreset) {
      toast({
        title: "请先选择或创建蛋白粉品牌",
        variant: 'destructive',
      });
      return;
    }
    
    if (nutrition.grams <= 0) {
      toast({
        title: t('log:protein.invalidAmount'),
        description: t('log:protein.mustPositive'),
        variant: 'destructive',
      });
      return;
    }

    addToLogMutation.mutate();
  };

  const confirmDeletePreset = (presetId: string) => {
    setPresetToDelete(presetId);
    setShowDeleteConfirm(true);
  };

  // No presets - show guidance
  if (!presetsLoading && presets.length === 0 && !showNewPresetForm) {
    return (
      <>
        <Dialog open={open} onOpenChange={onClose} modal={false}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>快速添加蛋白粉</DialogTitle>
              <DialogDescription>
                扫描条码或拍照营养标签以导入此蛋白粉的营养值
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center text-muted-foreground">
                    还没有保存的蛋白粉品牌
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowScanner(true)}
                      className="w-full"
                      data-testid="button-scan-barcode-empty"
                    >
                      <ScanBarcode className="w-4 h-4 mr-2" />
                      扫描条码
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowOCRScanner(true)}
                      className="w-full"
                      data-testid="button-scan-label-empty"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      拍照标签
                    </Button>
                  </div>

                  <Button
                    onClick={() => setShowNewPresetForm(true)}
                    className="w-full"
                    data-testid="button-manual-entry"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    手动输入
                  </Button>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        <BarcodeScanner
          open={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleBarcodeScanned}
        />

        <OCRScanner
          open={showOCRScanner}
          onClose={() => setShowOCRScanner(false)}
          onResult={handleOCRScanned}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose} modal={false}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('log:protein.title')}</DialogTitle>
            <DialogDescription>
              {showNewPresetForm ? "添加新的蛋白粉品牌" : "快速记录你的蛋白粉摄入"}
            </DialogDescription>
          </DialogHeader>

          {showNewPresetForm ? (
            // New preset form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">品牌名称 *</Label>
                <Input
                  id="brand-name"
                  placeholder="例如：Optimum Nutrition Gold Standard"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  data-testid="input-brand-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scoop-size-new">每勺克数 (g) *</Label>
                <Input
                  id="scoop-size-new"
                  type="number"
                  placeholder="30"
                  value={newScoopSize}
                  onChange={(e) => setNewScoopSize(e.target.value)}
                  data-testid="input-scoop-size-new"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="kcal-new">每勺热量 (kcal)</Label>
                  <Input
                    id="kcal-new"
                    type="number"
                    placeholder="120"
                    value={newKcal}
                    onChange={(e) => setNewKcal(e.target.value)}
                    data-testid="input-kcal-new"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein-new">每勺蛋白质 (g)</Label>
                  <Input
                    id="protein-new"
                    type="number"
                    placeholder="24"
                    value={newProtein}
                    onChange={(e) => setNewProtein(e.target.value)}
                    data-testid="input-protein-new"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat-new">每勺脂肪 (g)</Label>
                  <Input
                    id="fat-new"
                    type="number"
                    placeholder="1.5"
                    value={newFat}
                    onChange={(e) => setNewFat(e.target.value)}
                    data-testid="input-fat-new"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs-new">每勺碳水 (g)</Label>
                  <Input
                    id="carbs-new"
                    type="number"
                    placeholder="3"
                    value={newCarbs}
                    onChange={(e) => setNewCarbs(e.target.value)}
                    data-testid="input-carbs-new"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScanner(true)}
                  className="w-full"
                  data-testid="button-scan-barcode-form"
                >
                  <ScanBarcode className="w-4 h-4 mr-2" />
                  扫描条码
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowOCRScanner(true)}
                  className="w-full"
                  data-testid="button-scan-label-form"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  拍照标签
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewPresetForm(false)}
                  className="flex-1"
                  data-testid="button-cancel-preset"
                >
                  取消
                </Button>
                <Button
                  onClick={handleSaveNewPreset}
                  disabled={createPresetMutation.isPending}
                  className="flex-1"
                  data-testid="button-save-preset"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createPresetMutation.isPending ? '保存中...' : '保存品牌'}
                </Button>
              </div>
            </div>
          ) : (
            // Main dialog with preset selection
            <div className="space-y-4">
              {/* Preset selection */}
              <div className="space-y-2">
                <Label>{t('log:protein.selectPreset') || '选择品牌'}</Label>
                <div className="flex gap-2">
                  <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                    <SelectTrigger data-testid="select-preset">
                      <SelectValue placeholder="选择蛋白粉品牌" />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.brandName} ({preset.scoopSizeGrams}g/勺)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPresetId && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => confirmDeletePreset(selectedPresetId)}
                      data-testid="button-delete-preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick serving buttons */}
              {selectedPreset && (
                <>
                  <div className="space-y-2">
                    <Label>{t('log:protein.servings')}</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        variant={servingMode === "1" ? "default" : "outline"}
                        onClick={() => setServingMode("1")}
                        className="h-9"
                        data-testid="button-serving-1"
                      >
                        {t('log:protein.oneScoop')}
                      </Button>
                      <Button
                        variant={servingMode === "1.5" ? "default" : "outline"}
                        onClick={() => setServingMode("1.5")}
                        className="h-9"
                        data-testid="button-serving-1.5"
                      >
                        {t('log:protein.oneHalfScoop')}
                      </Button>
                      <Button
                        variant={servingMode === "2" ? "default" : "outline"}
                        onClick={() => setServingMode("2")}
                        className="h-9"
                        data-testid="button-serving-2"
                      >
                        {t('log:protein.twoScoop')}
                      </Button>
                      <Button
                        variant={servingMode === "custom" ? "default" : "outline"}
                        onClick={() => setServingMode("custom")}
                        className="h-9"
                        data-testid="button-serving-custom"
                      >
                        {t('log:protein.custom')}
                      </Button>
                    </div>
                  </div>

                  {/* Custom scoops input */}
                  {servingMode === "custom" && (
                    <div className="space-y-2">
                      <Label htmlFor="custom-scoops">勺数</Label>
                      <Input
                        id="custom-scoops"
                        type="number"
                        step="0.5"
                        placeholder="1"
                        value={customScoops}
                        onChange={(e) => setCustomScoops(e.target.value)}
                        data-testid="input-custom-scoops"
                      />
                    </div>
                  )}

                  {/* Solvent selection */}
                  <div className="space-y-2">
                    <Label htmlFor="solvent-select">{t('log:protein.solvent') || '溶剂'}</Label>
                    <select
                      id="solvent-select"
                      value={solvent}
                      onChange={(e) => setSolvent(e.target.value as "water" | "skim-milk" | "whole-milk" | "plant-milk" | "other")}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      data-testid="select-solvent"
                    >
                      <option value="water">水</option>
                      <option value="skim-milk">脱脂牛奶</option>
                      <option value="whole-milk">全脂牛奶</option>
                      <option value="plant-milk">植物奶</option>
                      <option value="other">其他（不计入饮水）</option>
                    </select>
                  </div>

                  {/* Volume input */}
                  <div className="space-y-2">
                    <Label htmlFor="volume-input">{t('log:protein.volume') || '容量'}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="volume-input"
                        type="number"
                        placeholder="500"
                        value={volumeValue}
                        onChange={(e) => setVolumeValue(e.target.value)}
                        className="flex-1"
                        data-testid="input-volume"
                      />
                      <select
                        value={volumeUnit}
                        onChange={(e) => setVolumeUnit(e.target.value as "ml" | "oz")}
                        className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        data-testid="select-volume-unit"
                      >
                        <option value="ml">ml</option>
                        <option value="oz">oz</option>
                      </select>
                    </div>
                  </div>

                  {/* Nutrition display */}
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{t('log:protein.totalIntake')}</span>
                        <Badge variant="secondary">{nutrition.grams.toFixed(1)}g ({nutrition.scoops} 勺)</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('common:nutrition.calories')}</span>
                          <span className="font-medium">{nutrition.kcal.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('common:nutrition.protein')}</span>
                          <span className="font-medium">{nutrition.protein.toFixed(1)}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('common:nutrition.fat')}</span>
                          <span className="font-medium">{nutrition.fat.toFixed(1)}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('common:nutrition.carbs')}</span>
                          <span className="font-medium">{nutrition.carbs.toFixed(1)}g</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action buttons */}
                  <Button
                    onClick={() => setShowNewPresetForm(true)}
                    variant="outline"
                    className="w-full"
                    data-testid="button-add-new-preset"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加新品牌
                  </Button>

                  {/* Add to log button */}
                  <Button
                    onClick={handleAddToLog}
                    disabled={addToLogMutation.isPending}
                    className="w-full"
                    data-testid="button-add-protein"
                  >
                    {addToLogMutation.isPending ? (
                      t('log:protein.logging')
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('log:protein.logProtein', { grams: nutrition.grams.toFixed(0) })}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />

      {/* OCR Scanner */}
      <OCRScanner
        open={showOCRScanner}
        onClose={() => setShowOCRScanner(false)}
        onResult={handleOCRScanned}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个蛋白粉品牌预设吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePresetMutation.mutate(presetToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
