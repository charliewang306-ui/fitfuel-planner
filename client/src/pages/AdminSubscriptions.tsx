import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function AdminSubscriptions() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/subscriptions'],
  });

  const subscriptions = data?.subscriptions || [];

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
            <h1 className="text-3xl font-bold" data-testid="text-subscriptions-title">订阅管理</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub: any) => (
              <Card key={sub.id} data-testid={`card-subscription-${sub.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{sub.id}</h3>
                        <Badge variant={sub.subscriptionTier === 'pro' ? 'default' : 'secondary'}>
                          {sub.subscriptionTier?.toUpperCase() || 'FREE'}
                        </Badge>
                        <Badge
                          variant={
                            sub.subscriptionStatus === 'active'
                              ? 'default'
                              : sub.subscriptionStatus === 'trialing'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {sub.subscriptionStatus || 'inactive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Stripe订阅ID: </span>
                          <span className="font-mono text-xs">
                            {sub.stripeSubscriptionId || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">到期时间: </span>
                          <span className="font-medium">
                            {sub.subscriptionEndsAt
                              ? formatDistanceToNow(new Date(sub.subscriptionEndsAt), {
                                  addSuffix: true,
                                  locale: zhCN,
                                })
                              : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">创建时间: </span>
                          <span className="font-medium">
                            {formatDistanceToNow(new Date(sub.createdAt), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {subscriptions.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">暂无订阅记录</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
