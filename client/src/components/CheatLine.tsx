import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CheatLineProps {
  weightLb: number;
  goal: 'cut' | 'maintain' | 'bulk';
}

export function CheatLine({ weightLb, goal }: CheatLineProps) {
  const { t } = useTranslation();
  const [showKg, setShowKg] = useState(false);
  
  // Convert lb to kg
  const weightKg = weightLb * 0.453592;
  const displayWeight = showKg ? weightKg.toFixed(1) : weightLb.toFixed(0);
  const unitLabel = showKg ? 'kg' : 'lb';
  
  // Calculate per-pound/kg reference values
  const waterPerUnit = showKg ? (weightKg * 0.035).toFixed(1) : (weightLb * 0.5).toFixed(0); // L or oz
  const waterUnit = showKg ? 'L' : 'oz';
  
  // Protein reference (g per unit)
  let proteinPerUnit: number;
  if (goal === 'bulk') {
    proteinPerUnit = showKg ? 1.9 : 0.86; // 1.9 g/kg or 0.86 g/lb
  } else if (goal === 'cut') {
    proteinPerUnit = showKg ? 2.2 : 1.0; // 2.2 g/kg or 1.0 g/lb
  } else {
    proteinPerUnit = showKg ? 1.8 : 0.82; // 1.8 g/kg or 0.82 g/lb
  }
  
  // Calculate total protein and water
  const totalProtein = (weightKg * (goal === 'bulk' ? 1.9 : goal === 'cut' ? 2.2 : 1.8)).toFixed(0);
  const totalWater = showKg ? (weightKg * 0.035).toFixed(1) : (weightLb * 0.5).toFixed(0);
  
  return (
    <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900" data-testid="card-cheatline">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1" data-testid="text-cheatline-title">
                <Lightbulb className="w-4 h-4" />
                {t('dashboard:cheatLineTitle', '白话版营养参考')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKg(!showKg)}
                className="h-6 px-2 text-xs"
                data-testid="button-toggle-unit"
              >
                {showKg ? 'kg' : 'lb'}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p data-testid="text-water-formula">
                <span className="font-medium text-foreground">
                  {t('dashboard:cheatLineWater', '每磅体重喝 0.5 盎司水')}：
                </span>{' '}
                {displayWeight} {unitLabel} × {showKg ? '0.035' : '0.5'} = <strong className="text-foreground" data-testid="value-total-water">{totalWater} {waterUnit}</strong>
              </p>
              
              <p data-testid="text-protein-formula">
                <span className="font-medium text-foreground">
                  {goal === 'bulk' && (showKg ? t('dashboard:cheatLineProteinBulk', '增肌每公斤 1.9g 蛋白') : t('dashboard:cheatLineProteinBulkLb', '增肌每磅 0.86g 蛋白'))}
                  {goal === 'cut' && (showKg ? t('dashboard:cheatLineProteinCut', '减脂每公斤 2.2g 蛋白') : t('dashboard:cheatLineProteinCutLb', '减脂每磅 1.0g 蛋白'))}
                  {goal === 'maintain' && (showKg ? t('dashboard:cheatLineProteinMaintain', '维持每公斤 1.8g 蛋白') : t('dashboard:cheatLineProteinMaintainLb', '维持每磅 0.82g 蛋白'))}：
                </span>{' '}
                {displayWeight} {unitLabel} × {proteinPerUnit.toFixed(2)} = <strong className="text-foreground" data-testid="value-total-protein">{totalProtein}g</strong>
              </p>
              
              <p className="text-xs italic flex items-center gap-1" data-testid="text-cheatline-note">
                <Lightbulb className="w-3 h-3" />
                {t('dashboard:cheatLineNote', '提示：这是经过科学验证的简化公式，易记易算')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
