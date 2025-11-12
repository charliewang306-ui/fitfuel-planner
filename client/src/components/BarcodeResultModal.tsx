import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Zap } from "lucide-react";
import type { FoodItem } from "@shared/schema";
import type { WeightUnit } from "@shared/utils";
import { toGrams, calcNutritionPerIntake } from "@shared/utils";

interface BarcodeResultModalProps {
  open: boolean;
  onClose: () => void;
  food: FoodItem | null;
  onAddToLog: (foodId: string, amountValue: number, amountUnit: WeightUnit) => void;
  onFillRemaining: (foodId: string) => void;
}

export function BarcodeResultModal({
  open,
  onClose,
  food,
  onAddToLog,
  onFillRemaining,
}: BarcodeResultModalProps) {
  const [amount, setAmount] = useState('100');
  const [unit, setUnit] = useState<WeightUnit>('g');
  const [viewMode, setViewMode] = useState<'per100g' | 'perserving'>('per100g');

  // Reset state when food changes or modal closes
  if (!food) return null;
  
  const handleClose = () => {
    setAmount('100');
    setUnit('g');
    setViewMode('per100g');
    onClose();
  };

  const hasServing = food.perUnitType === 'perserving' && food.gramsPerServing;

  const calculateNutrition = () => {
    const grams = toGrams(parseFloat(amount), unit, food.gramsPerServing || undefined);
    return calcNutritionPerIntake(grams, {
      kcal: food.kcal100g,
      P: food.protein100g,
      F: food.fat100g,
      C: food.carbs100g,
      fiber: food.fiber100g,
    });
  };

  const nutrition = calculateNutrition();

  const handleAddToLog = () => {
    onAddToLog(food.id, parseFloat(amount), unit);
    handleClose();
  };

  const handleFillRemaining = () => {
    onFillRemaining(food.id);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>扫码成功</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Food Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{food.name}</h3>
            {food.brand && (
              <Badge variant="secondary" className="text-xs">
                {food.brand}
              </Badge>
            )}
            {food.source && food.source !== 'builtin' && (
              <Badge variant="outline" className="text-xs ml-2">
                来源: {food.source}
              </Badge>
            )}
          </div>

          {/* Nutrition View Toggle */}
          {hasServing && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="per100g">每100g</TabsTrigger>
                <TabsTrigger value="perserving">每份</TabsTrigger>
              </TabsList>

              <TabsContent value="per100g" className="space-y-2 mt-4">
                <NutritionDisplay
                  kcal={food.kcal100g}
                  protein={food.protein100g}
                  fat={food.fat100g}
                  carbs={food.carbs100g}
                  fiber={food.fiber100g}
                />
              </TabsContent>

              <TabsContent value="perserving" className="space-y-2 mt-4">
                {hasServing && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      每份重量: {food.gramsPerServing}g
                    </p>
                    <NutritionDisplay
                      kcal={(food.kcal100g * food.gramsPerServing!) / 100}
                      protein={(food.protein100g * food.gramsPerServing!) / 100}
                      fat={(food.fat100g * food.gramsPerServing!) / 100}
                      carbs={(food.carbs100g * food.gramsPerServing!) / 100}
                      fiber={(food.fiber100g * food.gramsPerServing!) / 100}
                    />
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Show nutrition for per100g if no serving */}
          {!hasServing && (
            <NutritionDisplay
              kcal={food.kcal100g}
              protein={food.protein100g}
              fat={food.fat100g}
              carbs={food.carbs100g}
              fiber={food.fiber100g}
            />
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>选择份量</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
                min="0"
                step="0.1"
                data-testid="input-barcode-result-amount"
              />
              <Select value={unit} onValueChange={(v) => setUnit(v as WeightUnit)}>
                <SelectTrigger className="w-24" data-testid="select-barcode-result-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hasServing && <SelectItem value="serving">份</SelectItem>}
                  <SelectItem value="g">克</SelectItem>
                  <SelectItem value="oz">盎司</SelectItem>
                  <SelectItem value="kg">千克</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calculated Nutrition for Selected Amount */}
          {nutrition && (
            <div className="bg-muted/50 p-3 rounded-md space-y-1">
              <p className="text-sm font-medium">本次摄入:</p>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">热量</span>{' '}
                  <span className="font-semibold">{nutrition.kcal.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">蛋白</span>{' '}
                  <span className="font-semibold">{nutrition.P.toFixed(1)}g</span>
                </div>
                <div>
                  <span className="text-muted-foreground">脂肪</span>{' '}
                  <span className="font-semibold">{nutrition.F.toFixed(1)}g</span>
                </div>
                <div>
                  <span className="text-muted-foreground">碳水</span>{' '}
                  <span className="font-semibold">{nutrition.C.toFixed(1)}g</span>
                </div>
                <div>
                  <span className="text-muted-foreground">纤维</span>{' '}
                  <span className="font-semibold">{nutrition.fiber.toFixed(1)}g</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleAddToLog}
              disabled={!amount || parseFloat(amount) <= 0}
              data-testid="button-barcode-add-to-log"
            >
              <Plus className="w-4 h-4 mr-2" />
              加入记录
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={handleFillRemaining}
              data-testid="button-barcode-fill-remaining"
            >
              <Zap className="w-4 h-4 mr-2" />
              用于补足剩余
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NutritionDisplay({
  kcal,
  protein,
  fat,
  carbs,
  fiber,
}: {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="bg-muted/30 p-2 rounded">
        <p className="text-xs text-muted-foreground">热量</p>
        <p className="font-mono font-semibold">{kcal.toFixed(0)} kcal</p>
      </div>
      <div className="bg-muted/30 p-2 rounded">
        <p className="text-xs text-muted-foreground">蛋白质</p>
        <p className="font-mono font-semibold">{protein.toFixed(1)}g</p>
      </div>
      <div className="bg-muted/30 p-2 rounded">
        <p className="text-xs text-muted-foreground">脂肪</p>
        <p className="font-mono font-semibold">{fat.toFixed(1)}g</p>
      </div>
      <div className="bg-muted/30 p-2 rounded">
        <p className="text-xs text-muted-foreground">碳水</p>
        <p className="font-mono font-semibold">{carbs.toFixed(1)}g</p>
      </div>
      <div className="bg-muted/30 p-2 rounded">
        <p className="text-xs text-muted-foreground">纤维</p>
        <p className="font-mono font-semibold">{fiber.toFixed(1)}g</p>
      </div>
    </div>
  );
}
