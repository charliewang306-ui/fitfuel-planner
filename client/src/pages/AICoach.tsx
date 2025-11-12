import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageCircle, Dumbbell, Brain, Salad, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { AdBanner } from "@/components/AdBanner";

type CoachMode = 'nutrition' | 'workout' | 'mindset';

interface TrainingLog {
  id: string;
  userId: string;
  date: string;
  workoutType: 'push' | 'pull' | 'legs';
  notes: string | null;
}

interface TriModuleResponse {
  mode: CoachMode;
  response: string;
  quotaConsumed: boolean;
  remaining: number;
}

interface ResponseWithQuestion {
  mode: CoachMode;
  text: string;
  question: string;
  timestamp: number;
}

export default function AICoach() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation(['coach', 'common']);
  const { plan } = useSubscription();
  const [question, setQuestion] = useState('');
  const [responses, setResponses] = useState<ResponseWithQuestion[]>([]);
  const [showTrainingLog, setShowTrainingLog] = useState(false);
  const [trainingType, setTrainingType] = useState<'push' | 'pull' | 'legs'>('push');
  const [trainingNotes, setTrainingNotes] = useState('');

  const isPlusOrPro = plan === 'premium';

  // Get AI Coach quota status
  interface QuotaStatus {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    isUnlimited?: boolean;
    requiresUpgrade?: boolean;
  }

  const { data: quotaStatus, refetch: refetchQuota } = useQuery<QuotaStatus>({
    queryKey: ['/api/ai/coach/quota'],
    enabled: isPlusOrPro,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get latest training log
  const { data: latestTraining } = useQuery<TrainingLog | null>({
    queryKey: ['/api/training-logs/latest'],
    enabled: isPlusOrPro,
  });

  // Generate tri-module coach response
  const askMutation = useMutation({
    mutationFn: async (userQuestion: string) => {
      const res = await apiRequest('POST', '/api/ai/tri-module-coach', {
        question: userQuestion,
        language: i18n.language
      });
      const data: TriModuleResponse = await res.json();
      return { ...data, userQuestion };
    },
    onSuccess: (data) => {
      // Add new response to history with user's question
      setResponses(prev => [...prev, { 
        mode: data.mode, 
        text: data.response, 
        question: data.userQuestion,
        timestamp: Date.now() 
      }]);
      setQuestion('');
      
      // Refresh quota status
      refetchQuota();
      
      // Show appropriate toast based on quota consumption
      if (data.quotaConsumed && data.remaining !== undefined) {
        // Warn if running low on quota
        if (data.remaining <= 3 && data.remaining > 0) {
          toast({
            title: t('coach:toasts.quota_warning'),
            description: t('coach:toasts.quota_warning_desc', { remaining: data.remaining }),
            variant: 'default',
          });
        } else {
          toast({
            title: t('coach:toasts.conversation_success'),
            description: t('coach:toasts.quota_consumed', { remaining: data.remaining }),
          });
        }
      } else {
        toast({
          title: t('coach:toasts.conversation_success'),
          description: t('coach:toasts.generated'),
        });
      }
    },
    onError: (error: any) => {
      // Handle quota exceeded error specially
      if (error.message && error.message.includes('quota_exceeded')) {
        try {
          const errorData = JSON.parse(error.message.replace('quota_exceeded: ', ''));
          toast({
            title: t('coach:toasts.quota_exceeded'),
            description: `${errorData.message}\n\n💡 ${errorData.suggestion}`,
            variant: 'destructive',
            duration: 8000,
          });
        } catch {
          toast({
            title: t('coach:toasts.quota_exceeded_full'),
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        const errorMsg = error.message || t('coach:toasts.generate_failed');
        toast({
          title: t('coach:toasts.generate_failed'),
          description: errorMsg,
          variant: 'destructive',
        });
      }
    }
  });

  // Log training
  const logTrainingMutation = useMutation({
    mutationFn: async (data: { date: string; workoutType: 'push' | 'pull' | 'legs'; notes?: string }) => {
      const res = await apiRequest('POST', '/api/training-logs', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs/latest'] });
      setShowTrainingLog(false);
      setTrainingNotes('');
      toast({
        title: t('coach:training.training_logged'),
        description: t('coach:training.training_saved', { type: trainingType.toUpperCase() }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('coach:training.log_failed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleAsk = () => {
    if (!question.trim()) {
      toast({
        title: t('coach:toasts.empty_question'),
        description: t('coach:toasts.empty_question_desc'),
        variant: 'destructive',
      });
      return;
    }
    
    askMutation.mutate(question);
  };

  const handleLogTraining = () => {
    const today = new Date().toISOString().split('T')[0];
    logTrainingMutation.mutate({
      date: today,
      workoutType: trainingType,
      notes: trainingNotes || undefined
    });
  };

  const getModeIcon = (mode: CoachMode) => {
    switch (mode) {
      case 'nutrition': return <Salad className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'workout': return <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'mindset': return <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getModeName = (mode: CoachMode) => {
    switch (mode) {
      case 'nutrition': return t('coach:modules.nutrition.name');
      case 'workout': return t('coach:modules.workout.name');
      case 'mindset': return t('coach:modules.mindset.name');
    }
  };

  const getModeColor = (mode: CoachMode) => {
    switch (mode) {
      case 'nutrition': return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400';
      case 'workout': return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'mindset': return 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400';
    }
  };

  const isGenerating = askMutation.isPending;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-b border-purple-500/20">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-purple-500/20">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t('coach:page_title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            {t('coach:page_subtitle')}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 ml-[52px] mt-1 font-medium">
            {t('coach:page_description')}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Feature Info Card */}
        <Card className="border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              {t('coach:system_title')}
            </CardTitle>
            <CardDescription>
              {t('coach:system_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <Salad className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t('coach:modules.nutrition.name')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('coach:modules.nutrition.description')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t('coach:modules.workout.name')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('coach:modules.workout.description')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t('coach:modules.mindset.name')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('coach:modules.mindset.description')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest Training Status */}
        {isPlusOrPro && latestTraining && (
          <Card className="border-blue-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-muted-foreground">{t('coach:training.last_training')}</span>
                  <Badge variant="outline" className="text-xs">
                    {latestTraining.workoutType.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{latestTraining.date}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTrainingLog(!showTrainingLog)}
                  data-testid="button-toggle-training-log"
                >
                  {showTrainingLog ? t('coach:training.cancel') : t('coach:training.log_training')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Training Log Form */}
        {isPlusOrPro && showTrainingLog && (
          <Card className="border-blue-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {t('coach:training.log_today')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('coach:training.training_type')}</label>
                <div className="flex gap-2">
                  {(['push', 'pull', 'legs'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={trainingType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTrainingType(type)}
                      className="flex-1"
                      data-testid={`button-training-${type}`}
                    >
                      {type.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('coach:training.notes_optional')}</label>
                <textarea
                  value={trainingNotes}
                  onChange={(e) => setTrainingNotes(e.target.value)}
                  placeholder={t('coach:training.notes_placeholder')}
                  className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="input-training-notes"
                />
              </div>
              
              <Button
                onClick={handleLogTraining}
                disabled={logTrainingMutation.isPending}
                className="w-full"
                data-testid="button-save-training"
              >
                {logTrainingMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('coach:training.saving')}
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-4 h-4 mr-2" />
                    {t('coach:training.save_training')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Ask Coach - Plus/Pro Only */}
        {isPlusOrPro ? (
          <Card className="border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                {t('coach:ask.title')}
                {quotaStatus && (
                  <Badge 
                    variant={quotaStatus.remaining <= 3 && quotaStatus.remaining > 0 ? 'destructive' : 'default'} 
                    className="text-xs ml-auto"
                    data-testid="badge-quota-status"
                  >
                    {quotaStatus.isUnlimited 
                      ? t('coach:ask.quota_unlimited')
                      : t('coach:ask.quota_remaining', { remaining: quotaStatus.remaining, limit: quotaStatus.limit })}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('coach:ask.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('coach:ask.your_question')}
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t('coach:ask.placeholder')}
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isGenerating}
                  data-testid="input-coach-question"
                />
              </div>
              <Button
                onClick={handleAsk}
                disabled={isGenerating || !question.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
                data-testid="button-ask-coach"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('coach:ask.thinking')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('coach:ask.ask_button')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Upgrade Prompt for Free Users */
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className="p-3 rounded-full bg-purple-500/10 w-fit mx-auto">
                  <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t('coach:upgrade.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('coach:upgrade.description')}
                </p>
                <Button
                  variant="default"
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => window.location.href = '/settings'}
                  data-testid="button-upgrade-coach"
                >
                  {t('coach:upgrade.button')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Response History */}
        {responses.map((response, idx) => (
          <Card key={response.timestamp} className={`border ${getModeColor(response.mode)}`} data-testid={`response-card-${response.mode}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {getModeIcon(response.mode)}
                {getModeName(response.mode)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* User Question */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('coach:responses.your_question')}</p>
                  <p className="text-sm text-foreground">{response.question}</p>
                </div>
                
                {/* AI Response */}
                <div className={`p-4 rounded-lg border ${getModeColor(response.mode)}`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {response.text}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Ad Banner for Free Users */}
        <AdBanner />
      </div>
    </div>
  );
}
