import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

interface ProGateProps {
  children: React.ReactNode;
  feature?: string;
  fallback?: React.ReactNode;
}

export function ProGate({ children, feature = "此功能", fallback }: ProGateProps) {
  const { isPro, isLoading } = useSubscription();

  if (isLoading) {
    return null;
  }

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-6 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">PRO 专属功能</h3>
          <p className="text-sm text-muted-foreground">{feature}需要升级到 PRO 版本</p>
        </div>
        <Link href="/upgrade-pro">
          <Button className="w-full" data-testid="button-upgrade-to-pro">
            <Sparkles className="w-4 h-4 mr-2" />
            解锁 PRO
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function useProCheck() {
  const { isPro, isLoading } = useSubscription();
  return { isPro, isLoading };
}
