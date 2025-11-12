import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Plus, ShoppingCart } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MealPlan } from "@shared/schema";

export default function MealPlanning() {
  const { toast } = useToast();
  const [newPlanName, setNewPlanName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Fetch meal plans
  const { data: mealPlans = [] } = useQuery<MealPlan[]>({
    queryKey: ['/api/meal-plans']
  });

  // Fetch shopping list for selected plan
  const { data: shoppingList = [] } = useQuery<any[]>({
    queryKey: ['/api/meal-plans', selectedPlanId, 'shopping-list'],
    enabled: !!selectedPlanId
  });

  // Create meal plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: { name: string; startDate: string; endDate: string }) => {
      const res = await apiRequest('POST', '/api/meal-plans', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      toast({
        title: '计划已创建',
        description: '膳食计划已成功创建'
      });
      setShowCreateForm(false);
      setNewPlanName('');
    }
  });

  const handleCreatePlan = () => {
    if (!newPlanName.trim()) {
      toast({
        title: '请输入计划名称',
        variant: 'destructive'
      });
      return;
    }

    // Create plan for next 7 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 6);

    createPlanMutation.mutate({
      name: newPlanName,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">膳食计划</h1>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-auto">
        {/* Create New Plan Button */}
        {!showCreateForm && (
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="w-full"
            data-testid="button-create-plan"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建新计划
          </Button>
        )}

        {/* Create Plan Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>创建7天膳食计划</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="计划名称 (例如: 第1周计划)"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                data-testid="input-plan-name"
              />
              <div className="flex gap-2">
                <Button onClick={handleCreatePlan} className="flex-1" data-testid="button-submit-plan">
                  创建计划
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewPlanName('');
                  }}
                  data-testid="button-cancel-plan"
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meal Plans List */}
        <div className="space-y-3">
          {mealPlans.map((plan) => (
            <Card 
              key={plan.id}
              className="cursor-pointer hover-elevate"
              onClick={() => setSelectedPlanId(selectedPlanId === plan.id ? null : plan.id)}
              data-testid={`plan-${plan.id}`}
            >
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{plan.name}</span>
                  {plan.isActive && (
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-primary/10 rounded">
                      进行中
                    </span>
                  )}
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  {plan.startDate} 至 {plan.endDate}
                </div>
              </CardHeader>

              {/* Shopping List (expanded when selected) */}
              {selectedPlanId === plan.id && shoppingList.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ShoppingCart className="w-4 h-4" />
                      购物清单
                    </div>
                    {shoppingList.map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex justify-between items-center p-2 bg-muted/50 rounded"
                        data-testid={`shopping-item-${idx}`}
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.brand && (
                            <div className="text-xs text-muted-foreground">{item.brand}</div>
                          )}
                        </div>
                        <div className="text-sm font-mono">
                          {Math.round(item.totalGrams)}g
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {mealPlans.length === 0 && !showCreateForm && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无膳食计划</p>
              <p className="text-sm">点击上方按钮创建您的第一个计划</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
