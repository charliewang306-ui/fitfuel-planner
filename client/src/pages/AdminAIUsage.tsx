import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function AdminAIUsage() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/ai-usage'],
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin")}
              data-testid="button-back-admin"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold" data-testid="text-ai-usage-title">AI使用统计</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="card-top-menu-users">
            <CardHeader>
              <CardTitle>AI菜单使用排行</CardTitle>
              <CardDescription>近30天使用次数最多的用户</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.topMenuUsers?.map((item: any, idx: number) => (
                    <div
                      key={item.userId}
                      className="flex justify-between items-center p-3 bg-card border rounded-lg"
                      data-testid={`menu-user-${idx}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          #{idx + 1}
                        </div>
                        <span className="font-mono text-sm">{item.userId}</span>
                      </div>
                      <span className="text-lg font-bold">{item.count} 次</span>
                    </div>
                  ))}
                  {(!data?.topMenuUsers || data.topMenuUsers.length === 0) && (
                    <p className="text-center text-muted-foreground py-6">暂无数据</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-top-coach-users">
            <CardHeader>
              <CardTitle>AI教练使用排行</CardTitle>
              <CardDescription>近30天使用次数最多的用户</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.topCoachUsers?.map((item: any, idx: number) => (
                    <div
                      key={item.userId}
                      className="flex justify-between items-center p-3 bg-card border rounded-lg"
                      data-testid={`coach-user-${idx}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          #{idx + 1}
                        </div>
                        <span className="font-mono text-sm">{item.userId}</span>
                      </div>
                      <span className="text-lg font-bold">{item.count} 次</span>
                    </div>
                  ))}
                  {(!data?.topCoachUsers || data.topCoachUsers.length === 0) && (
                    <p className="text-center text-muted-foreground py-6">暂无数据</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
