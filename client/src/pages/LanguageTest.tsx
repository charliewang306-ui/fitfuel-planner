import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Info } from "lucide-react";

export default function LanguageTest() {
  const { i18n, t } = useTranslation();
  
  const browserLang = navigator.language || (navigator.languages && navigator.languages[0]);
  const storedLang = localStorage.getItem('fitfuel-language');
  const currentLang = i18n.language;
  
  const clearStoredLanguage = () => {
    localStorage.removeItem('fitfuel-language');
    window.location.reload();
  };
  
  const testLanguages = ['en', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ja', 'ko', 'hi', 'ar', 'pt', 'ru'];
  
  const isFirstVisit = !storedLang;
  const shouldMatchBrowser = isFirstVisit && browserLang;
  const browserLangCode = browserLang?.split('-')[0];
  const isCorrectlyDetected = !shouldMatchBrowser || currentLang === browserLangCode || 
                               (browserLang.includes('zh') && currentLang.startsWith('zh'));
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Language Detection Test
              {isCorrectlyDetected ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Working
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Issue
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Verify that language auto-detection works correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Browser Language:</span>
                <Badge variant="outline">{browserLang || 'Unknown'}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Stored Preference:</span>
                <Badge variant="outline">{storedLang || 'None (First Visit)'}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Current Language:</span>
                <Badge variant="default">{currentLang}</Badge>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex gap-2 mb-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Detection Status
                  </p>
                  {isFirstVisit ? (
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      ✓ First visit detected - should use browser language ({browserLangCode})
                    </p>
                  ) : (
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      ✓ Returning user - using saved preference ({storedLang})
                    </p>
                  )}
                  
                  {!isCorrectlyDetected && (
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-2">
                      ⚠️ Language mismatch detected! Expected {browserLangCode} but got {currentLang}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Test Translation:</p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-lg">{t('app.name')}</p>
                <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
              </div>
            </div>
            
            <Button 
              onClick={clearStoredLanguage}
              variant="outline"
              className="w-full"
              data-testid="button-clear-language"
            >
              Clear Saved Language & Reload (Test First Visit)
            </Button>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Quick Test Languages:</p>
              <div className="grid grid-cols-4 gap-2">
                {testLanguages.map(lang => (
                  <Button
                    key={lang}
                    variant={currentLang === lang ? "default" : "outline"}
                    size="sm"
                    onClick={() => i18n.changeLanguage(lang)}
                  >
                    {lang}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Console Logs</CardTitle>
            <CardDescription>
              Check browser console (F12) for detailed language detection logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Look for: <code className="bg-muted px-1 rounded">[i18n] Language Detection:</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
