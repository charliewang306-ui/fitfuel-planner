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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  // 直接写入 Supabase 的 user_profiles 表
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      // 1. 拿当前登录用户
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw authError || new Error("尚未登录");
      }

      // 2. 把输入的数据整理一下
      const weightValue = parseFloat(formData.weightLb);
      const heightValue =
        formData.heightUnit === "in"
          ? parseFloat(formData.heightCm) * 2.54
          : parseFloat(formData.heightCm);
      const ageValue = parseInt(formData.age, 10);

      // 3. 写入 user_profiles（注意这里用 user.id 当主键）
      const { error } = await supabase.from("user_profiles").upsert(
        {
          id: user.id, // 表里 id 字段类型是 text/varchar，也可以存 uuid
          weight_lb: weightValue,
          height_cm: heightValue,
          age: ageValue,
          sex: formData.sex,
          goal: formData.goal,
          activity: formData.activity,
          wake_time: formData.wakeTime,
          sleep_time: formData.sleepTime,
          unit_pref: "g",
          decimal_places: 1,
        },
        { onConflict: "id" }
      );

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // 标记 Onboarding 完成
      localStorage.setItem("onboarding_complete", "true");
      // 刷新回首页
      window.location.href = "/";
    },
    onError: (error: any) => {
      console.error(error);
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
      // 最后一步，校验 + 保存
      const weightValue = parseFloat(formData.weightLb);
      const heightValue =
        formData.heightUnit === "in"
          ? parseFloat(formData.heightCm) * 2.54
          : parseFloat(formData.heightCm);
      const ageValue = parseInt(formData.age, 10);

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

      saveProfileMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">欢迎使用 FitFuel Planner</h1>
            <p className="text-sm text-muted-foreground">水+营养智能管家</p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">步骤 {step} / 3</p>
      </header>

      {/* Main Content：下面的 UI 和你之前一样，只是逻辑换成上面的 Supabase 版本 */}
      {/* ……（这里保留你原来的 Step1 / Step2 / Step3 JSX，略 ） */}
      {/* 为了节省篇幅，这里不重复粘 UI，如果你愿意我也可以给你完整 JSX 版 */}

      {/* Footer Buttons */}
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
