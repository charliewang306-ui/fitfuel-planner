import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Bot, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
  });

  const { data: tokenData } = useQuery({
    queryKey: ['/api/system/integration-tokens'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">管理后台</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>访问被拒绝</CardTitle>
            <CardDescription>您没有管理员权限</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} data-testid="button-back-home">
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "总用户数",
      value: stats.totalUsers,
      icon: Users,
      description: "注册用户总数",
    },
    {
      title: "活跃订阅",
      value: stats.activeSubscriptions,
      icon: CreditCard,
      description: "Plus & Pro 订阅",
    },
    {
      title: "今日AI菜单",
      value: stats.aiUsageToday?.menu || 0,
      icon: Bot,
      description: "AI生成菜单次数",
    },
    {
      title: "今日AI教练",
      value: stats.aiUsageToday?.coach || 0,
      icon: Activity,
      description: "AI教练对话次数",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold" data-testid="text-admin-title">管理后台</h1>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-exit-admin">
              返回应用
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {tokenData?.tokens?.filter((t: any) => t.status !== 'active').map((token: any) => {
          const isExpired = token.status === 'expired';
          const isUrgent = token.daysUntilExpiry <= 7 && token.daysUntilExpiry >= 0;
          const providerName = token.provider === 'apple' ? 'Apple OAuth' : 'Google OAuth';
          
          return (
            <Alert 
              key={token.id}
              variant={isExpired ? "destructive" : "default"} 
              className={`mb-6 ${isExpired ? '' : isUrgent ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'}`}
              data-testid={`alert-jwt-${token.provider}`}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-semibold">
                {isExpired ? '🔴 CRITICAL' : isUrgent ? '🟠 URGENT' : '🟡 WARNING'}: {providerName} JWT {isExpired ? 'EXPIRED' : 'Expiring Soon'}
              </AlertTitle>
              <AlertDescription>
                {isExpired ? (
                  <>
                    JWT expired {Math.abs(token.daysUntilExpiry)} days ago on {new Date(token.expiresAt).toISOString().split('T')[0]}. 
                    <strong> Users cannot login with {providerName}!</strong> Generate a new JWT immediately.
                  </>
                ) : (
                  <>
                    JWT expires in <strong>{token.daysUntilExpiry} days</strong> on {new Date(token.expiresAt).toISOString().split('T')[0]}. 
                    {isUrgent ? ' Generate a new JWT immediately!' : ' Please plan to regenerate the JWT soon.'}
                  </>
                )}
              </AlertDescription>
            </Alert>
          );
        })}

        {tokenData?.tokens?.every((t: any) => t.status === 'active') && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950" data-testid="alert-jwt-all-active">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="font-semibold text-green-800 dark:text-green-200">
              ✅ All OAuth Tokens Active
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              All OAuth integration JWTs are valid and healthy. Next check: {
                tokenData.tokens.length > 0 
                  ? new Date(Math.min(...tokenData.tokens.map((t: any) => new Date(t.expiresAt).getTime()))).toISOString().split('T')[0]
                  : 'N/A'
              }
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} data-testid={`card-stat-${stat.title}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`text-value-${stat.title}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card data-testid="card-subscription-breakdown">
            <CardHeader>
              <CardTitle>订阅分布</CardTitle>
              <CardDescription>各等级订阅用户数</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.subscriptionBreakdown?.map((item: any) => (
                  <div key={item.tier || 'free'} className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">
                      {item.tier || 'Free'}
                    </span>
                    <span className="text-lg font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-usage-summary">
            <CardHeader>
              <CardTitle>今日AI使用</CardTitle>
              <CardDescription>AI功能调用统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">AI菜单</span>
                  <span className="text-lg font-bold">{stats.aiUsageToday?.menu || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">AI教练</span>
                  <span className="text-lg font-bold">{stats.aiUsageToday?.coach || 0}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-sm font-bold">总计</span>
                  <span className="text-lg font-bold">{stats.aiUsageToday?.total || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="hover-elevate cursor-pointer" 
            onClick={() => setLocation("/admin/users")}
            data-testid="card-nav-users"
          >
            <CardHeader>
              <CardTitle className="text-base">用户管理</CardTitle>
              <CardDescription>搜索、查看、管理用户</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover-elevate cursor-pointer" 
            onClick={() => setLocation("/admin/subscriptions")}
            data-testid="card-nav-subscriptions"
          >
            <CardHeader>
              <CardTitle className="text-base">订阅管理</CardTitle>
              <CardDescription>查看所有订阅状态</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover-elevate cursor-pointer" 
            onClick={() => setLocation("/admin/ai-usage")}
            data-testid="card-nav-ai-usage"
          >
            <CardHeader>
              <CardTitle className="text-base">AI使用统计</CardTitle>
              <CardDescription>查看AI功能使用情况</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover-elevate cursor-pointer" 
            onClick={() => setLocation("/admin/audit-logs")}
            data-testid="card-nav-audit-logs"
          >
            <CardHeader>
              <CardTitle className="text-base">审计日志</CardTitle>
              <CardDescription>查看管理操作记录</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
