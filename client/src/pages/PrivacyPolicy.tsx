import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-b">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回设置
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-green-500/20">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">隐私政策</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Privacy Policy
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              我们如何保护您的隐私
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground">
              我们尊重并保护您的个人数据。所有收集的信息仅用于应用功能，例如卡路里计算、饮食跟踪和进度分析。我们不会将您的数据出售给任何第三方。
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">我们收集的信息可能包括：</h3>
                <ul className="space-y-1 ml-4 text-sm text-muted-foreground">
                  <li className="list-disc">电子邮件（用于登录和账户恢复）</li>
                  <li className="list-disc">体重、目标和饮食记录</li>
                  <li className="list-disc">技术日志（用于改进应用性能和修复错误）</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-muted">
                <h3 className="text-sm font-semibold text-foreground mb-2">账户删除</h3>
                <p className="text-sm text-muted-foreground">
                  您可以随时通过联系我们 <a href="mailto:support@mythicatech.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@mythicatech.com</a> 请求永久删除您的账户和所有相关数据。
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  数据一旦删除，将无法恢复。
                </p>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                使用本应用即表示您同意本隐私政策。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* English Version */}
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              Privacy Policy (English)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              We respect and protect your personal data. All collected information is only used for app features such as calorie calculation, meal tracking, and progress analysis. We do not sell your data to any third party.
            </p>

            <div>
              <p className="font-medium text-foreground mb-2">Information we collect may include:</p>
              <ul className="space-y-1 ml-4">
                <li className="list-disc">Email (for login & account recovery)</li>
                <li className="list-disc">Weight, goals, and meal logs</li>
                <li className="list-disc">Technical logs (for improving app performance and fixing bugs)</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-muted">
              <p className="font-medium text-foreground mb-2">Account Deletion</p>
              <p>
                You may request permanent deletion of your account and all associated data at any time by contacting us at{" "}
                <a href="mailto:support@mythicatech.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  support@mythicatech.com
                </a>
              </p>
              <p className="mt-2">Once deleted, the data cannot be restored.</p>
            </div>

            <p className="pt-3 border-t border-muted">
              By using this app, you agree to this Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
