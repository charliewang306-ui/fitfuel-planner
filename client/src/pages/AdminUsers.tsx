import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Search, ArrowLeft, Gift, Ban, Check } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [grantProDialog, setGrantProDialog] = useState(false);
  const [banDialog, setBanDialog] = useState(false);
  const [grantDays, setGrantDays] = useState("7");
  const [grantReason, setGrantReason] = useState("");
  const [banReason, setBanReason] = useState("");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/admin/users', searchQuery],
  });

  const { data: userDetails } = useQuery({
    queryKey: ['/api/admin/users', selectedUser?.id],
    enabled: !!selectedUser,
  });

  const grantProMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/admin/users/${selectedUser.id}/grant-pro`, {
        method: 'POST',
        body: JSON.stringify({ days: parseInt(grantDays), reason: grantReason }),
      });
    },
    onSuccess: () => {
      toast({ title: "成功", description: `已为用户 ${selectedUser.id} 赠送 Pro 订阅` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setGrantProDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const banMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/admin/users/${selectedUser.id}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason: banReason }),
      });
    },
    onSuccess: () => {
      toast({ title: "成功", description: `已封禁用户 ${selectedUser.id}` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setBanDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest(`/api/admin/users/${userId}/unban`, { method: 'POST' });
    },
    onSuccess: () => {
      toast({ title: "成功", description: "已解封用户" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser(null);
    },
  });

  const users = usersData?.users || [];

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
            <h1 className="text-3xl font-bold" data-testid="text-users-title">用户管理</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>搜索用户</CardTitle>
            <CardDescription>按用户ID搜索</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="输入用户ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-users"
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
            {users.map((user: any) => (
              <Card key={user.id} className="hover-elevate" data-testid={`card-user-${user.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{user.id}</h3>
                        {user.role === 'admin' && (
                          <Badge variant="default" data-testid="badge-admin">管理员</Badge>
                        )}
                        {user.role === 'staff' && (
                          <Badge variant="secondary">员工</Badge>
                        )}
                        {user.isBanned && (
                          <Badge variant="destructive" data-testid="badge-banned">已封禁</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">订阅: </span>
                          <span className="font-medium capitalize">
                            {user.subscriptionTier || 'free'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">状态: </span>
                          <span className="font-medium">
                            {user.subscriptionStatus || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">目标: </span>
                          <span className="font-medium">{user.goal}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">活动: </span>
                          <span className="font-medium">{user.activity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setGrantProDialog(true);
                        }}
                        data-testid={`button-grant-pro-${user.id}`}
                      >
                        <Gift className="h-4 w-4 mr-1" />
                        赠送Pro
                      </Button>
                      {user.isBanned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unbanMutation.mutate(user.id)}
                          data-testid={`button-unban-${user.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          解封
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setBanDialog(true);
                          }}
                          data-testid={`button-ban-${user.id}`}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          封禁
                        </Button>
                      )}
                    </div>
                  </div>
                  {user.isBanned && user.bannedReason && (
                    <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                      <p className="text-sm text-destructive">封禁原因: {user.bannedReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {users.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">未找到用户</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={grantProDialog} onOpenChange={setGrantProDialog}>
        <DialogContent data-testid="dialog-grant-pro">
          <DialogHeader>
            <DialogTitle>赠送Pro订阅</DialogTitle>
            <DialogDescription>
              为用户 {selectedUser?.id} 赠送Pro订阅权限
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="days">天数</Label>
              <Input
                id="days"
                type="number"
                value={grantDays}
                onChange={(e) => setGrantDays(e.target.value)}
                data-testid="input-grant-days"
              />
            </div>
            <div>
              <Label htmlFor="reason">原因（可选）</Label>
              <Textarea
                id="reason"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="赠送原因..."
                data-testid="input-grant-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGrantProDialog(false)}
              data-testid="button-cancel-grant"
            >
              取消
            </Button>
            <Button
              onClick={() => grantProMutation.mutate()}
              disabled={grantProMutation.isPending}
              data-testid="button-confirm-grant"
            >
              确认赠送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banDialog} onOpenChange={setBanDialog}>
        <DialogContent data-testid="dialog-ban-user">
          <DialogHeader>
            <DialogTitle>封禁用户</DialogTitle>
            <DialogDescription>
              确定要封禁用户 {selectedUser?.id} 吗？
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="ban-reason">封禁原因</Label>
            <Textarea
              id="ban-reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="请输入封禁原因..."
              data-testid="input-ban-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanDialog(false)}
              data-testid="button-cancel-ban"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => banMutation.mutate()}
              disabled={banMutation.isPending}
              data-testid="button-confirm-ban"
            >
              确认封禁
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
