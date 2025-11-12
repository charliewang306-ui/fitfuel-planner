import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ContactSupport() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-b">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回设置
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-blue-500/20">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">联系支持</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Contact Support
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              如何联系我们
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              如果您需要帮助或有任何问题，请通过以下方式联系我们：
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">电子邮件</p>
                  <a 
                    href="mailto:support@mythicatech.com"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    support@mythicatech.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">工作时间</p>
                  <p className="text-sm text-muted-foreground">
                    周一至周五，09:00 – 18:00（当地时间）
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                我们通常在 48 小时内回复。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* English Version */}
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              English Version
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If you need any help or have questions, please contact us:
            </p>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Email:</span>{" "}
                <a href="mailto:support@mythicatech.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  support@mythicatech.com
                </a>
              </p>
              <p>
                <span className="font-medium">Business Hours:</span> Monday – Friday, 09:00 – 18:00 (local time)
              </p>
              <p className="pt-2 border-t border-muted">
                We typically reply within 48 hours.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
