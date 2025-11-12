import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Calculator, Activity, Flame, Target } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "@shared/schema";

interface TDEECalculationCardProps {
  profile: UserProfile;
  targetKcal: number;
}

export function TDEECalculationCard({ profile, targetKcal }: TDEECalculationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation(['dashboard', 'common']);

  // Convert lb to kg for calculations
  const weightKg = profile.weightLb * 0.453592;
  const heightCm = profile.heightCm || 170;
  const age = profile.age || 30;
  const sex = profile.sex || 'male';
  const goal = profile.goal;
  const activity = profile.activity;

  // Calculate BMR using Mifflin-St Jeor equation
  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  // Activity factors
  const activityFactors: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const activityFactor = activityFactors[activity] || 1.55;
  const tdee = bmr * activityFactor;

  // Goal adjustment (matches backend: shared/utils.ts calculateDailyTargets)
  let adjustment = 0;
  if (goal === 'bulk') adjustment = 300; // surplus for bulking
  if (goal === 'cut') adjustment = -400; // deficit for cutting
  
  // Calculate what the final kcal should be
  const calculatedTarget = Math.round(tdee + adjustment);

  const activityLabels: Record<string, string> = {
    sedentary: '久坐（几乎不运动）',
    light: '轻度活动（每周1-3天）',
    moderate: '中度活动（每周3-5天）',
    active: '高度活跃（每周6-7天）',
    very_active: '非常活跃（每天2次高强度）',
  };

  const goalLabels: Record<string, { label: string; color: string }> = {
    bulk: { label: '增肌', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    cut: { label: '减脂', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    maintain: { label: '维持', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="hover-elevate" data-testid="card-tdee-calculation">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full" data-testid="button-toggle-tdee">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">TDEE计算详情</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-mono">
                  {targetKcal} kcal
                </Badge>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">体重</span>
                <span className="font-medium">{profile.weightLb} lb ({weightKg.toFixed(1)} kg)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">身高</span>
                <span className="font-medium">{heightCm} cm</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">年龄</span>
                <span className="font-medium">{age} 岁</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">性别</span>
                <span className="font-medium">{sex === 'male' ? '男性' : '女性'}</span>
              </div>
            </div>

            {/* BMR Calculation */}
            <div className="border-l-2 border-l-primary pl-3 space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h4 className="font-semibold text-sm">1. BMR（基础代谢率）</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                BMR是您在完全休息状态下，身体维持基本生命活动所需的热量（呼吸、心跳、体温调节等）
              </p>
              <div className="bg-muted/50 p-3 rounded text-xs font-mono space-y-1">
                <div className="text-muted-foreground">使用 Mifflin-St Jeor 公式：</div>
                {sex === 'male' ? (
                  <div className="text-foreground">
                    BMR = 10 × {weightKg.toFixed(1)} + 6.25 × {heightCm} - 5 × {age} + 5
                  </div>
                ) : (
                  <div className="text-foreground">
                    BMR = 10 × {weightKg.toFixed(1)} + 6.25 × {heightCm} - 5 × {age} - 161
                  </div>
                )}
                <div className="text-primary font-semibold pt-1">
                  = {bmr.toFixed(0)} kcal/天
                </div>
              </div>
            </div>

            {/* Activity Factor */}
            <div className="border-l-2 border-l-blue-500 pl-3 space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <h4 className="font-semibold text-sm">2. 活动系数</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                根据您的日常活动水平调整基础代谢率
              </p>
              <div className="bg-muted/50 p-3 rounded text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">您的活动水平</span>
                  <Badge variant="outline" className="text-xs">
                    {activityLabels[activity]}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">活动系数</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    × {activityFactor}
                  </span>
                </div>
              </div>
            </div>

            {/* TDEE Calculation */}
            <div className="border-l-2 border-l-green-500 pl-3 space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-green-500" />
                <h4 className="font-semibold text-sm">3. TDEE（每日总消耗）</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                TDEE是您每天实际消耗的总热量（包括运动、工作、日常活动等）
              </p>
              <div className="bg-muted/50 p-3 rounded text-xs font-mono space-y-1">
                <div className="text-foreground">
                  TDEE = BMR × 活动系数
                </div>
                <div className="text-foreground">
                  = {bmr.toFixed(0)} × {activityFactor}
                </div>
                <div className="text-green-600 dark:text-green-400 font-semibold pt-1">
                  = {tdee.toFixed(0)} kcal/天
                </div>
              </div>
            </div>

            {/* Goal Adjustment */}
            <div className="border-l-2 border-l-purple-500 pl-3 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                <h4 className="font-semibold text-sm">4. 目标调整</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                根据您的健身目标进行热量调整
              </p>
              <div className="bg-muted/50 p-3 rounded text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">您的目标</span>
                  <Badge className={goalLabels[goal].color}>
                    {goalLabels[goal].label}
                  </Badge>
                </div>
                {adjustment !== 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">热量调整</span>
                      <span className={`font-mono font-semibold ${adjustment > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {adjustment > 0 ? '+' : ''}{adjustment} kcal
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-semibold pt-2 border-t border-border">
                      <span className="text-foreground">最终每日目标</span>
                      <span className="font-mono text-primary text-base">
                        {targetKcal} kcal
                      </span>
                    </div>
                  </>
                )}
                {adjustment === 0 && (
                  <div className="flex justify-between items-center font-semibold pt-2 border-t border-border">
                    <span className="text-foreground">每日目标</span>
                    <span className="font-mono text-primary text-base">
                      {targetKcal} kcal
                    </span>
                  </div>
                )}
              </div>
              
              {/* Verification notice */}
              {Math.abs(calculatedTarget - targetKcal) > 5 && (
                <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 p-2 rounded mt-2">
                  ⚠️ 注意：计算值 ({calculatedTarget} kcal) 与目标 ({targetKcal} kcal) 略有差异，这可能是由于四舍五入造成的。
                </div>
              )}
            </div>

            {/* Explanation */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">💡 简单理解：</p>
              <p>• <strong>BMR</strong>：躺着不动也要消耗的热量</p>
              <p>• <strong>活动系数</strong>：考虑您的日常活动和运动</p>
              <p>• <strong>TDEE</strong>：您每天实际消耗的总热量</p>
              <p>• <strong>目标调整</strong>：增肌需要热量盈余，减脂需要热量赤字</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
