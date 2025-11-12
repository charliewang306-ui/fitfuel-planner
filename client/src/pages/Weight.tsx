import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TrendingDown, TrendingUp, Minus, Scale } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { CheckinWeight, UserProfile } from "@shared/schema";

export default function Weight() {
  const { toast } = useToast();
  const [weightInput, setWeightInput] = useState("");
  const today = new Date().toISOString().split('T')[0];

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/profile']
  });

  const { data: weights = [], isLoading: weightsLoading } = useQuery<CheckinWeight[]>({
    queryKey: ['/api/weights'],
    queryFn: async () => {
      const res = await fetch('/api/weights?days=7');
      if (!res.ok) throw new Error('Failed to fetch weights');
      return res.json();
    }
  });

  const logWeightMutation = useMutation({
    mutationFn: async (weightLb: number) => {
      const res = await apiRequest('POST', '/api/weights', {
        date: today,
        weightLb
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weights'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({
        title: "体重已记录",
        description: "您的体重数据已成功保存"
      });
      setWeightInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "记录失败",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleLogWeight = () => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      toast({
        title: "无效输入",
        description: "请输入有效的体重值",
        variant: "destructive"
      });
      return;
    }
    logWeightMutation.mutate(weight);
  };

  // Calculate weight trend and suggestions
  const calculateTrend = () => {
    if (weights.length < 2) return null;
    
    const sortedWeights = [...weights].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const firstWeight = sortedWeights[0].weightLb;
    const lastWeight = sortedWeights[sortedWeights.length - 1].weightLb;
    const change = lastWeight - firstWeight;
    const changePercent = (change / firstWeight) * 100;
    const daysSpan = sortedWeights.length - 1;
    const weeklyRate = daysSpan > 0 ? (change / daysSpan) * 7 : 0;
    
    return {
      change,
      changePercent,
      weeklyRate,
      isIncreasing: change > 0.5,
      isDecreasing: change < -0.5,
      isStable: Math.abs(change) <= 0.5
    };
  };

  const trend = calculateTrend();

  const getTrendSuggestion = () => {
    if (!trend || !profile) return null;
    
    const { goal } = profile;
    const { isIncreasing, isDecreasing, isStable, weeklyRate } = trend;
    
    // Healthy weight loss: 1-2 lbs/week
    // Healthy weight gain: 0.5-1 lb/week
    
    if (goal === 'cut') {
      if (isDecreasing && weeklyRate >= -2 && weeklyRate <= -1) {
        return { icon: TrendingDown, color: "text-green-600", message: "完美！您的减重速度理想（1-2磅/周）" };
      } else if (isDecreasing && weeklyRate < -2) {
        return { icon: TrendingDown, color: "text-yellow-600", message: "减重过快，建议稍微增加热量摄入以保持肌肉" };
      } else if (isStable) {
        return { icon: Minus, color: "text-yellow-600", message: "体重稳定，考虑减少200-300卡路里以继续减脂" };
      } else {
        return { icon: TrendingUp, color: "text-red-600", message: "体重增加，建议减少热量摄入并增加运动量" };
      }
    } else if (goal === 'bulk') {
      if (isIncreasing && weeklyRate >= 0.5 && weeklyRate <= 1) {
        return { icon: TrendingUp, color: "text-green-600", message: "完美！您的增肌速度理想（0.5-1磅/周）" };
      } else if (isIncreasing && weeklyRate > 1) {
        return { icon: TrendingUp, color: "text-yellow-600", message: "增重过快，可能增加过多脂肪，建议稍微减少热量" };
      } else if (isStable) {
        return { icon: Minus, color: "text-yellow-600", message: "体重稳定，考虑增加200-300卡路里以促进肌肉生长" };
      } else {
        return { icon: TrendingDown, color: "text-red-600", message: "体重下降，建议增加热量摄入和蛋白质" };
      }
    } else { // maintain
      if (isStable) {
        return { icon: Minus, color: "text-green-600", message: "完美！体重保持稳定" };
      } else if (Math.abs(weeklyRate) <= 0.5) {
        return { icon: Minus, color: "text-green-600", message: "体重变化在正常范围内" };
      } else if (isIncreasing) {
        return { icon: TrendingUp, color: "text-yellow-600", message: "体重增加，考虑减少热量摄入或增加运动" };
      } else {
        return { icon: TrendingDown, color: "text-yellow-600", message: "体重下降，考虑增加热量摄入" };
      }
    }
  };

  const suggestion = getTrendSuggestion();

  // Prepare chart data
  const chartData = weights
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(w => ({
      date: new Date(w.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      weight: parseFloat(w.weightLb.toFixed(1))
    }));

  // Debug logging
  console.log('Weight.tsx - Raw weights data:', weights.map(w => ({ date: w.date, weightLb: w.weightLb })));
  console.log('Weight.tsx - Chart data:', chartData);

  const averageWeight = weights.length > 0 
    ? weights.reduce((sum, w) => sum + w.weightLb, 0) / weights.length 
    : 0;

  if (profileLoading || weightsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Scale className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-6 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">体重追踪</h1>
          <p className="text-muted-foreground">监测您的体重变化趋势</p>
        </div>

        {/* Log Weight Card */}
        <Card>
          <CardHeader>
            <CardTitle>记录体重</CardTitle>
            <CardDescription>输入今天的体重（磅）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight-input">体重 (lbs)</Label>
              <div className="flex gap-2">
                <Input
                  id="weight-input"
                  data-testid="input-weight"
                  type="number"
                  step="0.1"
                  placeholder="例如: 160.5"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogWeight();
                  }}
                />
                <Button 
                  data-testid="button-log-weight"
                  onClick={handleLogWeight}
                  disabled={logWeightMutation.isPending}
                >
                  {logWeightMutation.isPending ? "记录中..." : "记录"}
                </Button>
              </div>
            </div>
            {profile && (
              <p className="text-sm text-muted-foreground">
                当前目标体重: {profile.weightLb.toFixed(1)} lbs
              </p>
            )}
          </CardContent>
        </Card>

        {/* Trend Chart */}
        {weights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>7天体重趋势</CardTitle>
              <CardDescription>
                {weights.length < 7 
                  ? `已记录 ${weights.length} 天数据` 
                  : "过去7天的体重变化"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    {averageWeight > 0 && (
                      <ReferenceLine 
                        y={averageWeight} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="3 3"
                        label={{ value: '平均', position: 'right', fill: 'hsl(var(--muted-foreground))' }}
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trend Analysis */}
        {trend && suggestion && (
          <Card>
            <CardHeader>
              <CardTitle>趋势分析</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">体重变化</p>
                  <p className="text-2xl font-bold" data-testid="text-weight-change">
                    {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)} lbs
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">周变化率</p>
                  <p className="text-2xl font-bold" data-testid="text-weekly-rate">
                    {trend.weeklyRate > 0 ? '+' : ''}{trend.weeklyRate.toFixed(1)} lbs/周
                  </p>
                </div>
              </div>

              <div className={`flex items-start gap-3 p-4 rounded-lg bg-muted/50`}>
                <suggestion.icon className={`w-5 h-5 mt-0.5 ${suggestion.color}`} />
                <div className="flex-1">
                  <p className="font-medium mb-1">智能建议</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-suggestion">
                    {suggestion.message}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {weights.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Scale className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">开始追踪体重</h3>
              <p className="text-muted-foreground">
                记录您的第一次体重，开始监测进度
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
