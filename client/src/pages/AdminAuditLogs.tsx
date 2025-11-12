import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

const actionLabels: Record<string, string> = {
  grant_pro: "赠送Pro",
  ban_user: "封禁用户",
  unban_user: "解封用户",
};

export default function AdminAuditLogs() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/audit-logs'],
  });

  const logs = data?.logs || [];

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
            <h1 className="text-3xl font-bold" data-testid="text-audit-logs-title">审计日志</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-16 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <Card key={log.id} data-testid={`log-${log.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{actionLabels[log.action] || log.action}</Badge>
                        <span className="text-sm text-muted-foreground">
                          操作者: <span className="font-mono">{log.actorId}</span>
                        </span>
                        {log.targetId && (
                          <span className="text-sm text-muted-foreground">
                            目标: <span className="font-mono">{log.targetId}</span>
                          </span>
                        )}
                      </div>
                      {log.metadata && (
                        <div className="text-xs font-mono bg-muted p-2 rounded">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                        <span>
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {logs.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">暂无审计日志</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
