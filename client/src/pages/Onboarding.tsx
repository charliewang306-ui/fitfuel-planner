import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    weightLb: "",
    heightCm: "",
    heightUnit: "cm" as "cm" | "in",
    age: "",
    sex: "male" as "male" | "female",
    goal: "maintain",
    activity: "moderate",
    wakeTime: "07:00",
    sleepTime: "23:00",
  });

  const progress = (step / 3) * 100;

  const saveProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("No user");
      }

      const { error } = await supabase
        .from("user_profiles")        // ⬅️ 只用这个表名！
        .upsert({
          // 注意：我们用 user_id 关联用户，id(int8) 自己增
          user_id: user.id,
          weight_lb: data.weightLb,
          height_cm: data.heightCm,
          age: data.age,
          sex: data.sex,
          goal: data.goal,
          activity: data.activity,
          wake_time: data.wakeTime,
          sleep_time: data.sleepTime,
          unit_pref: data.unitPref,
          decimal_places: data.decimalPlaces,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("supabase upsert error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      localStorage.setItem("onboarding_complete", "true");
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      const weightValue = parseFloat(formData.weightLb);
      const heightValue =
        formData.heightUnit === "in"
          ? parseFloat(formData.heightCm) * 2.54
          : parseFloat(formData.heightCm);
      const ageValue = parseInt(formData.age);

      if (isNaN(weightValue) || weightValue <= 0) {
        toast({
          title: "体重无效",
          description: "请输入有效的体重值",
          variant: "destructive",
        });
        return;
      }

      if (isNaN(heightValue) || heightValue < 120 || heightValue > 220) {
        toast({
          title: "身高无效",
          description: "请输入120-220cm之间的身高",
          variant: "destructive",
        });
        return;
      }

      if (isNaN(ageValue) || ageValue < 15 || ageValue > 100) {
        toast({
          title: "年龄无效",
          description: "请输入15-100岁之间的年龄",
          variant: "destructive",
        });
        return;
      }

      saveProfileMutation.mutate({
        weightLb: weightValue,
        heightCm: heightValue,
        age: ageValue,
        sex: formData.sex,
        goal: formData.goal,
        activity: formData.activity,
        wakeTime: formData.wakeTime,
        sleepTime: formData.sleepTime,
        unitPref: "g",
        decimalPlaces: 1,
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 py-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              欢迎使用 FitFuel Planner
            </h1>
            <p className="text-sm text-muted-foreground">水+营养智能管家</p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">步骤 {step} / 3</p>
      </header>

      <main className="flex-1 px-4 pb-6">
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>设置你的目标</CardTitle>
              <CardDescription>
                告诉我们你的体重和目标，我们将为你计算每日营养需求
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">当前体重 (磅)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="例如: 160"
                  value={formData.weightLb}
                  onChange={(e) =>
                    setFormData({ ...formData, weightLb: e.target.value })
                  }
                  data-testid="input-onboarding-weight"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.weightLb &&
                    `约 ${(
                      parseFloat(formData.weightLb) * 0.453592
                    ).toFixed(1)} kg`}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="height">当前身高</Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant={
                        formData.heightUnit === "cm" ? "default" : "outline"
                      }
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setFormData({ ...formData, heightUnit: "cm" })
                      }
                      data-testid="button-height-cm"
                    >
                      cm
                    </Button>
                    <Button
                      type="button"
                      variant={
                        formData.heightUnit === "in" ? "default" : "outline"
                      }
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setFormData({ ...formData, heightUnit: "in" })
                      }
                      data-testid="button-height-in"
                    >
                      in
                    </Button>
                  </div>
                </div>
                <Input
                  id="height"
                  type="number"
                  min={formData.heightUnit === "cm" ? "120" : "47"}
                  max={formData.heightUnit === "cm" ? "220" : "87"}
                  step="0.1"
                  placeholder={
                    formData.heightUnit === "cm" ? "例如: 170" : "例如: 67"
                  }
                  value={formData.heightCm}
                  onChange={(e) =>
                    setFormData({ ...formData, heightCm: e.target.value })
                  }
                  data-testid="input-onboarding-height"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.heightCm &&
                    formData.heightUnit === "cm" &&
                    `约 ${(parseFloat(formData.heightCm) / 2.54).toFixed(1)} in`}
                  {formData.heightCm &&
                    formData.heightUnit === "in" &&
                    `约 ${(parseFloat(formData.heightCm) * 2.54).toFixed(1)} cm`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">年龄</Label>
                <Input
                  id="age"
                  type="number"
                  min="15"
                  max="100"
                  placeholder="例如: 25"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  data-testid="input-onboarding-age"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sex">生理性别</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(v: "male" | "female") =>
                    setFormData({ ...formData, sex: v })
                  }
                >
                  <SelectTrigger
                    id="sex"
                    data-testid="select-onboarding-sex"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男性 (Male)</SelectItem>
                    <SelectItem value="female">女性 (Female)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  用于精确计算基础代谢率 (BMR)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">你的目标</Label>
                <Select
                  value={formData.goal}
                  onValueChange={(v) =>
                    setFormData({ ...formData, goal: v })
                  }
                >
                  <SelectTrigger
                    id="goal"
                    data-testid="select-onboarding-goal"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cut">
                      减脂 (Lose Fat) • 热量缺口 -400 kcal
                    </SelectItem>
                    <SelectItem value="maintain">
                      维持 (Maintain) • 保持当前体重
                    </SelectItem>
                    <SelectItem value="bulk">
                      增肌 (Gain Muscle) • 热量盈余 +300 kcal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-foreground">
                  {formData.goal === "cut" &&
                    "减脂模式：基础热量 -400 kcal，帮助你安全减重"}
                  {formData.goal === "bulk" &&
                    "增肌模式：基础热量 +300 kcal，支持肌肉生长"}
                  {(!formData.goal || formData.goal === "maintain") &&
                    "维持模式：保持当前体重，均衡营养摄入"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>活动水平</CardTitle>
              <CardDescription>选择最符合你日常活动量的选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activity">每日活动量</Label>
                <Select
                  value={formData.activity}
                  onValueChange={(v) =>
                    setFormData({ ...formData, activity: v })
                  }
                >
                  <SelectTrigger
                    id="activity"
                    data-testid="select-onboarding-activity"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">久坐 - 几乎不运动</SelectItem>
                    <SelectItem value="light">
                      轻度活动 - 每周1-3天运动
                    </SelectItem>
                    <SelectItem value="moderate">
                      中度活动 - 每周3-5天运动
                    </SelectItem>
                    <SelectItem value="active">
                      活跃 - 每周6-7天运动
                    </SelectItem>
                    <SelectItem value="very_active">
                      非常活跃 - 高强度训练或体力劳动
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-foreground">
                  提示: 选择正确的活动水平可以帮助我们更准确地计算你的营养需求
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>作息时间</CardTitle>
              <CardDescription>
                设置你的作息时间，我们将在合适的时间提醒你
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wake-time">起床时间</Label>
                <Input
                  id="wake-time"
                  type="time"
                  value={formData.wakeTime}
                  onChange={(e) =>
                    setFormData({ ...formData, wakeTime: e.target.value })
                  }
                  data-testid="input-onboarding-wake"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sleep-time">睡觉时间</Label>
                <Input
                  id="sleep-time"
                  type="time"
                  value={formData.sleepTime}
                  onChange={(e) =>
                    setFormData({ ...formData, sleepTime: e.target.value })
                  }
                  data-testid="input-onboarding-sleep"
                />
              </div>

              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                  🎉 即将完成设置!
                </p>
                <p className="text-sm text-muted-foreground">
                  点击"开始使用"后，我们将为你生成个性化的营养计划
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="sticky bottom-0 bg-background border-t border-border px-4 py-4 space-y-2">
        <Button
          className="w-full h-12"
          onClick={handleNext}
          disabled={
            (step === 1 &&
              (!formData.weightLb || !formData.heightCm || !formData.age)) ||
            saveProfileMutation.isPending
          }
          data-testid="button-onboarding-next"
        >
          {saveProfileMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              {step === 3 ? "开始使用" : "下一步"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {step > 1 && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleBack}
            data-testid="button-onboarding-back"
          >
            返回
          </Button>
        )}
      </footer>
    </div>
  );
}
  
