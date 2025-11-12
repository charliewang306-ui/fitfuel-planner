import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-b">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回设置
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-purple-500/20">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">服务条款</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Terms of Service
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              使用条款
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground">
              使用本应用即表示您确认并同意以下条款：
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-semibold text-foreground mb-2">1. 免责声明</p>
                <p className="text-sm text-muted-foreground">
                  所有营养和饮食建议仅用于一般健康和信息目的，并非医疗建议。
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-semibold text-foreground mb-2">2. 用户责任</p>
                <p className="text-sm text-muted-foreground">
                  用户对自己的食物选择、卡路里摄入和活动结果负责。
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-semibold text-foreground mb-2">3. 付费订阅</p>
                <p className="text-sm text-muted-foreground">
                  付费订阅可解锁高级功能且不可转让。订阅将根据所选计费周期自动续订。
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-semibold text-foreground mb-2">4. 管理订阅</p>
                <p className="text-sm text-muted-foreground">
                  您可以随时通过应用或商店账户设置管理或取消订阅。
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-semibold text-foreground mb-2">5. 客户支持</p>
                <p className="text-sm text-muted-foreground">
                  如果您对费用或账单有任何疑问，请联系我们：{" "}
                  <a href="mailto:support@mythicatech.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                    support@mythicatech.com
                  </a>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm text-destructive font-medium">
                如果您不同意这些条款，请停止使用本应用。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* English Version */}
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              Terms of Service (English)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              By using this app, you acknowledge and agree to the following terms:
            </p>

            <ol className="space-y-3 ml-4">
              <li className="list-decimal">
                <span className="font-medium text-foreground">Medical Disclaimer:</span> All nutritional and meal recommendations are for general wellness and informational purposes only, and are not medical advice.
              </li>
              <li className="list-decimal">
                <span className="font-medium text-foreground">User Responsibility:</span> Users are responsible for their own food choices, calorie intake, and activity results.
              </li>
              <li className="list-decimal">
                <span className="font-medium text-foreground">Subscriptions:</span> Paid subscriptions unlock premium features and are non-transferable. Subscriptions renew automatically according to the selected billing cycle.
              </li>
              <li className="list-decimal">
                <span className="font-medium text-foreground">Subscription Management:</span> You may manage or cancel your subscription at any time through the app or your store account settings.
              </li>
              <li className="list-decimal">
                <span className="font-medium text-foreground">Support:</span> If you have any questions about charges or billing, contact us at{" "}
                <a href="mailto:support@mythicatech.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  support@mythicatech.com
                </a>
              </li>
            </ol>

            <p className="pt-3 border-t border-muted text-destructive font-medium">
              If you do not agree with these terms, please stop using the app.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
