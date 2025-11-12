import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AdBanner } from "@/components/AdBanner";
import { Clock, Check, SkipForward, ScanBarcode, Loader2, Plus, Edit, Trash2, X, AlertCircle, Coffee, Utensils, Info, Zap, Sparkles, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Reminder, FoodLog } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";

interface FoodLogWithName extends FoodLog {
  foodName?: string;
}

export default function Timeline() {
  const { t, i18n } = useTranslation(['timeline', 'common']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { hasFeature } = useSubscription();
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [newReminderType, setNewReminderType] = useState<string>('meal');
  const [newReminderTime, setNewReminderTime] = useState('12:00');
  const [showSnackRecommendations, setShowSnackRecommendations] = useState(false);
  const [currentSnackReminder, setCurrentSnackReminder] = useState<Reminder | null>(null);
  
  // Food log editing states
  const [showEditFoodDialog, setShowEditFoodDialog] = useState(false);
  const [editingFoodLog, setEditingFoodLog] = useState<FoodLogWithName | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  
  // Plus+ feature: ±90min flexibility window
  const hasFlexibility = hasFeature('timeline_advance_notice');
  const FLEXIBILITY_WINDOW_MINUTES = 90;
  
  // Snack recommendations (大众适用版)
  const snackRecommendations = [
    {
      id: 1,
      name: '鸡蛋2个（或蛋白3个）+ 香蕉1根'
    },
    {
      id: 2,
      name: '0脂希腊酸奶200g（如果买不到，用普通低脂酸奶）'
    },
    {
      id: 3,
      name: '全麦面包2片 + 花生酱1汤匙'
    },
    {
      id: 4,
      name: '脱脂牛奶300ml + 苹果1个'
    },
    {
      id: 5,
      name: '豆腐干80–100g + 黄瓜或小番茄一把'
    },
    {
      id: 6,
      name: '花生一小把 + 原味酸奶100g （注意量避免超脂）'
    },
    {
      id: 7,
      name: '豆奶300ml + 水果（如梨/苹果/橘子）任选1'
    },
    {
      id: 8,
      name: '金枪鱼水浸罐头半罐 + 饼干2片（预算友好）'
    }
  ];

  // Fetch today's reminders
  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ['/api/reminders/today'],
  });

  // Update reminder status mutation
  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, status, delayedUntil, completedAt, scheduledTime, type }: { 
      id: string; 
      status?: string; 
      delayedUntil?: string; 
      completedAt?: string;
      scheduledTime?: string;
      type?: string;
    }) => {
      const res = await apiRequest('PATCH', `/api/reminder/${id}`, { 
        status, 
        delayedUntil, 
        completedAt,
        scheduledTime,
        type
      });
      if (!res.ok) throw new Error('Failed to update reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/today'] });
      setShowEditDialog(false);
      setEditingReminder(null);
    },
    onError: (error: any) => {
      toast({
        title: t('timeline:toast.updateFailed'),
        description: error.message || t('timeline:toast.updateFailedDesc'),
        variant: 'destructive'
      });
    }
  });

  // Delete reminder mutation
  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/reminder/${id}`, {});
      if (!res.ok) throw new Error('Failed to delete reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/today'] });
      toast({
        title: t('timeline:toast.deleteSuccess'),
        description: t('timeline:toast.reminderDeleted')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('timeline:toast.deleteFailed'),
        description: error.message || t('timeline:toast.reminderDeleteFailed'),
        variant: 'destructive'
      });
    }
  });

  // Create reminder mutation
  const createReminderMutation = useMutation({
    mutationFn: async (data: { type: string; scheduledTime: string }) => {
      const res = await apiRequest('POST', '/api/reminder', data);
      if (!res.ok) throw new Error('Failed to create reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/today'] });
      setShowAddDialog(false);
      setNewReminderType('meal');
      setNewReminderTime('12:00');
      toast({
        title: t('timeline:toast.createSuccess'),
        description: t('timeline:toast.reminderAdded')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('timeline:toast.createFailed'),
        description: error.message || t('timeline:toast.reminderCreateFailed'),
        variant: 'destructive'
      });
    }
  });

  // Fetch today's food logs with language parameter
  const { data: foodLogs = [] } = useQuery<FoodLogWithName[]>({
    queryKey: ['/api/foodlogs/today', i18n.language],
    queryFn: async () => {
      const res = await fetch(`/api/foodlogs/today?lang=${i18n.language}`);
      if (!res.ok) throw new Error('Failed to fetch food logs');
      return res.json();
    }
  });

  // Edit food log mutation
  const editFoodLogMutation = useMutation({
    mutationFn: async ({ id, amountG }: { id: string; amountG: number }) => {
      const res = await apiRequest('PATCH', `/api/foodlog/${id}`, { amountG });
      if (!res.ok) throw new Error('Failed to update food log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/foodlogs/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      setShowEditFoodDialog(false);
      setEditingFoodLog(null);
      setEditAmount('');
      toast({
        title: t('timeline:toast.editSuccess'),
        description: t('timeline:toast.foodLogUpdated')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('timeline:toast.editFailed'),
        description: error.message || t('timeline:toast.foodLogUpdateFailed'),
        variant: 'destructive'
      });
    }
  });

  // Delete food log mutation
  const deleteFoodLogMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/foodlog/${id}`, {});
      if (!res.ok) throw new Error('Failed to delete food log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/foodlogs/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      toast({
        title: t('timeline:toast.deleteSuccess'),
        description: t('timeline:toast.foodLogDeleted')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('timeline:toast.deleteFailed'),
        description: error.message || t('timeline:toast.foodLogDeleteFailed'),
        variant: 'destructive'
      });
    }
  });

  // Calculate countdown timers - update every 60s
  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();
      const newCountdowns: Record<string, number> = {};
      
      reminders.forEach(reminder => {
        if (reminder.status !== 'completed' && reminder.status !== 'skipped') {
          let targetTime: Date;
          
          // If delayed, count down to delayedUntil
          if (reminder.status === 'delayed' && reminder.delayedUntil) {
            targetTime = new Date(reminder.delayedUntil);
          } else {
            // Otherwise, use scheduledTime
            const [hours, minutes] = reminder.scheduledTime.split(':').map(Number);
            targetTime = new Date(now);
            targetTime.setHours(hours, minutes, 0, 0);
          }
          
          const diffMs = targetTime.getTime() - now.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          
          // Store the difference (can be negative for overdue)
          newCountdowns[reminder.id] = diffSeconds;
        }
      });
      
      // Only update state if countdowns actually changed (prevent infinite loops)
      setCountdowns(prev => {
        const hasChanged = Object.keys(newCountdowns).length !== Object.keys(prev).length ||
          Object.keys(newCountdowns).some(id => prev[id] !== newCountdowns[id]);
        return hasChanged ? newCountdowns : prev;
      });
    };
    
    updateCountdowns(); // Run immediately
    const interval = setInterval(updateCountdowns, 60000); // Update every 60s

    return () => clearInterval(interval);
  }, [reminders]);

  // Complete reminder - opens logging dialog
  const handleComplete = (reminder: Reminder) => {
    // Navigate to the appropriate page to log the intake
    if (reminder.type === 'water') {
      navigate('/water?scheduleId=' + reminder.id);
    } else if (reminder.type === 'ai_morning' || reminder.type === 'ai_evening') {
      // AI reminders navigate to AI Coach page
      navigate('/ai-coach');
      // Mark as completed after navigation
      updateReminderMutation.mutate({
        id: reminder.id,
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    } else {
      navigate('/log?scheduleId=' + reminder.id);
    }
  };

  // Postpone reminder mutation
  const postponeReminderMutation = useMutation({
    mutationFn: async ({ id, delayMinutes }: { id: string; delayMinutes: number }) => {
      const res = await apiRequest('POST', `/api/schedule/${id}/postpone`, { delayMinutes });
      if (!res.ok) throw new Error('Failed to postpone reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/today'] });
      toast({
        title: t('timeline:toast.postponed'),
        description: t('timeline:toast.reminderPostponed')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('timeline:toast.postponeFailed'),
        description: error.message || t('timeline:toast.reminderPostponeFailed'),
        variant: 'destructive'
      });
    }
  });

  // Skip reminder mutation
  const skipReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/schedule/${id}/skip`, {});
      if (!res.ok) throw new Error('Failed to skip reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/today'] });
      toast({
        title: t('timeline:toast.skipped'),
        description: t('timeline:toast.reminderSkipped')
      });
    },
    onError: (error: any) => {
      toast({
        title: t('timeline:toast.skipFailed'),
        description: error.message || t('timeline:toast.reminderSkipFailed'),
        variant: 'destructive'
      });
    }
  });

  const handlePostpone = (id: string, minutes: number = 15) => {
    postponeReminderMutation.mutate({ id, delayMinutes: minutes });
  };

  const handleSkip = (id: string) => {
    skipReminderMutation.mutate(id);
  };

  const getReminderLabel = (type: string) => {
    const key = `timeline:reminder_types.${type}`;
    return t(key, { defaultValue: t('timeline:reminder_types.meal') });
  };
  
  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'water':
        return Coffee;
      case 'ai_morning':
      case 'ai_evening':
        return Sparkles;
      default:
        return Utensils;
    }
  };
  
  const getReminderColor = (type: string) => {
    switch (type) {
      case 'ai_morning':
      case 'ai_evening':
        return 'border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5';
      case 'water':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'pre_workout':
      case 'post_workout':
        return 'border-orange-500/20 bg-orange-500/5';
      default:
        return 'border-border bg-card';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'countdown':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'delayed':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'postponed':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'missed':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'skipped':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t('timeline:status.completed');
      case 'countdown':
        return t('timeline:status.countdown');
      case 'delayed':
        return t('timeline:status.delayed');
      case 'postponed':
        return t('timeline:status.postponed');
      case 'missed':
        return t('timeline:status.missed');
      case 'skipped':
        return t('timeline:status.skipped');
      default:
        return t('timeline:status.pending');
    }
  };

  const formatCountdown = (seconds: number) => {
    const isOverdue = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const mins = Math.floor((absSeconds % 3600) / 60);
    
    const prefix = isOverdue ? t('timeline:countdown.overdue') : t('timeline:countdown.remaining');
    
    if (hours > 0) {
      return `${prefix} ${t('timeline:countdown.formatHours', { hours, minutes: mins })}`;
    } else {
      return `${prefix} ${t('timeline:countdown.formatMinutes', { minutes: mins })}`;
    }
  };
  
  const getCountdownColor = (seconds: number) => {
    if (seconds < 0) {
      // Overdue - red
      return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400';
    } else {
      // Upcoming - green
      return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
    }
  };

  // Helper: Get flexibility window status for a reminder
  const getFlexibilityStatus = (seconds: number) => {
    if (!hasFlexibility) return null;
    
    const windowSeconds = FLEXIBILITY_WINDOW_MINUTES * 60;
    const minutesToScheduled = Math.floor(seconds / 60);
    
    // Early window: -90min to 0 (can complete early)
    if (seconds < 0 && seconds >= -windowSeconds) {
      return {
        status: 'early' as const,
        message: t('timeline:flexibility.window_open'),
        color: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
        icon: Zap
      };
    }
    
    // Late window: 0 to +90min (still within window)
    if (seconds >= 0 && seconds <= windowSeconds) {
      const minutesRemaining = Math.floor(seconds / 60);
      return {
        status: 'late' as const,
        message: t('timeline:flexibility.late_window', { minutes: minutesRemaining }),
        color: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',
        icon: Zap
      };
    }
    
    // Outside window
    if (seconds > windowSeconds) {
      return {
        status: 'future' as const,
        message: t('timeline:flexibility.window_active'),
        color: 'bg-muted/50 border-border text-muted-foreground',
        icon: Clock
      };
    }
    
    // Beyond late window (truly missed)
    return {
      status: 'closed' as const,
      message: t('timeline:flexibility.window_closed'),
      color: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400',
      icon: AlertCircle
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-semibold text-foreground">{t('timeline:pageTitle')}</h1>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            data-testid="button-add-reminder"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('timeline:createButton')}
          </Button>
        </div>
      </header>

      {/* Info Banner */}
      <div className="px-4 pt-4">
        <Card className={hasFlexibility ? "border-blue-500/20 bg-blue-500/5" : "border-primary/20 bg-primary/5"}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              {hasFlexibility ? (
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t('timeline:infoBanner.title')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('timeline:infoBanner.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Professional Advice Card */}
        <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20" data-testid="card-professional-advice">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">{t('timeline:professionalAdvice.title')}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('timeline:professionalAdvice.content')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 space-y-6">
        {/* Food Logs Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              {t('timeline:foodLogs.title')}
            </h2>
            <Badge variant="secondary">{foodLogs.length} {t('timeline:foodLogs.count')}</Badge>
          </div>
          
          {foodLogs.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">{t('timeline:foodLogs.empty')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {foodLogs
                .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
                .map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">
                              {log.foodName || t('timeline:foodLogs.unknownFood')}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {log.amountG}g
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                            <span>{Math.round(log.kcal)} kcal</span>
                            <span>{t('timeline:foodLogs.macros.protein')} {log.proteinG.toFixed(1)}g</span>
                            <span>{t('timeline:foodLogs.macros.fat')} {log.fatG.toFixed(1)}g</span>
                            <span>{t('timeline:foodLogs.macros.carbs')} {log.carbsG.toFixed(1)}g</span>
                            {log.fiberG > 0 && <span>{t('timeline:foodLogs.macros.fiber')} {log.fiberG.toFixed(1)}g</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.datetime).toLocaleString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              month: 'numeric',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingFoodLog(log);
                              setEditAmount(log.amountG.toString());
                              setShowEditFoodDialog(true);
                            }}
                            data-testid={`button-edit-food-${log.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(t('timeline:foodLogs.deleteConfirm'))) {
                                deleteFoodLogMutation.mutate(log.id);
                              }
                            }}
                            disabled={deleteFoodLogMutation.isPending}
                            data-testid={`button-delete-food-${log.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Reminders Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t('timeline:reminders.title')}
          </h2>
          {reminders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{t('timeline:reminders.noReminders')}</p>
          </div>
        ) : (
          reminders.map((reminder, index) => {
            const countdown = countdowns[reminder.id];
            const label = getReminderLabel(reminder.type);
            
            return (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={`
                  ${countdown !== undefined && countdown < 0 && reminder.status !== 'completed' && reminder.status !== 'skipped' 
                    ? 'border-l-4 border-l-red-500' 
                    : countdown !== undefined && countdown > 0 && reminder.status !== 'completed' && reminder.status !== 'skipped'
                    ? 'border-l-4 border-l-green-500'
                    : ''}
                  ${reminder.status === 'completed' || reminder.status === 'skipped' ? 'opacity-60 border-l-4 border-l-gray-400' : ''}
                `}
                data-testid={`reminder-card-${reminder.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-foreground">
                          {label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {reminder.scheduledTime}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={getStatusColor(reminder.status)}
                        variant="outline"
                      >
                        {getStatusLabel(reminder.status)}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingReminder(reminder);
                            setShowEditDialog(true);
                          }}
                          data-testid={`button-edit-reminder-${reminder.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteReminderMutation.mutate(reminder.id)}
                          disabled={deleteReminderMutation.isPending}
                          data-testid={`button-delete-reminder-${reminder.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Show actions for active reminders (not completed/skipped) */}
                {(reminder.status === 'pending' || reminder.status === 'postponed' || reminder.status === 'delayed' || reminder.status === 'missed') && (
                  <CardContent className="space-y-3">
                    {/* Countdown Timer (for non-missed) */}
                    {reminder.status !== 'missed' && countdown !== undefined && (
                      <div className={`flex items-center justify-between p-4 rounded-lg border ${getCountdownColor(countdown)}`}>
                        <span className="text-lg font-semibold">
                          {formatCountdown(countdown)}
                        </span>
                      </div>
                    )}
                    
                    {/* Plus+ Flexibility Window Status */}
                    {hasFlexibility && countdown !== undefined && reminder.status !== 'missed' && (
                      (() => {
                        const flexStatus = getFlexibilityStatus(countdown);
                        if (flexStatus && (flexStatus.status === 'early' || flexStatus.status === 'late')) {
                          const FlexIcon = flexStatus.icon;
                          return (
                            <div className={`flex items-center gap-2 p-3 rounded-lg border ${flexStatus.color}`}>
                              <FlexIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm font-medium">
                                {flexStatus.message}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}

                    {/* Missed Reminder Message */}
                    {reminder.status === 'missed' && (
                      <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-700 dark:text-red-300">
                            {t('timeline:reminders.missed.title')}
                          </p>
                          <p className="text-xs text-red-600/80 dark:text-red-400/80">
                            {t('timeline:reminders.missed.message')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Snack Recommendations Button (only for snack type) */}
                    {reminder.type === 'snack' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setCurrentSnackReminder(reminder);
                          setShowSnackRecommendations(true);
                        }}
                        data-testid={`button-snack-recommendations-${reminder.id}`}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {t('timeline:reminders.snackRecommendations')}
                      </Button>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleComplete(reminder)}
                        disabled={postponeReminderMutation.isPending || skipReminderMutation.isPending}
                        data-testid={`button-complete-${reminder.id}`}
                      >
                        {(() => {
                          const Icon = getReminderIcon(reminder.type);
                          return <Icon className="w-4 h-4 mr-1" />;
                        })()}
                        {reminder.type === 'ai_morning' || reminder.type === 'ai_evening' 
                          ? t('timeline:ai_reminders.view_advice')
                          : reminder.status === 'missed' 
                            ? t('timeline:ai_reminders.catchup')
                            : t('timeline:ai_reminders.complete')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSkip(reminder.id)}
                        disabled={postponeReminderMutation.isPending || skipReminderMutation.isPending}
                        data-testid={`button-skip-${reminder.id}`}
                      >
                        <SkipForward className="w-4 h-4 mr-1" />
                        {t('timeline:buttons.skip')}
                      </Button>
                    </div>

                    {/* Quick Postpone Buttons (only for non-missed) */}
                    {reminder.status !== 'missed' && (
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePostpone(reminder.id, 15)}
                          disabled={postponeReminderMutation.isPending || skipReminderMutation.isPending}
                          data-testid={`button-postpone-15-${reminder.id}`}
                        >
                          {t('timeline:postpone.min15')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePostpone(reminder.id, 30)}
                          disabled={postponeReminderMutation.isPending || skipReminderMutation.isPending}
                          data-testid={`button-postpone-30-${reminder.id}`}
                        >
                          {t('timeline:postpone.min30')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePostpone(reminder.id, 60)}
                          disabled={postponeReminderMutation.isPending || skipReminderMutation.isPending}
                          data-testid={`button-postpone-60-${reminder.id}`}
                        >
                          {t('timeline:postpone.min60')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}

                {reminder.status === 'pending' && !countdown && (
                  <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-2">
                      {t('timeline:reminders.scheduledAt', { time: reminder.scheduledTime })}
                    </div>
                  </CardContent>
                )}

                {reminder.status === 'completed' && reminder.completedAt && (
                  <CardContent>
                    <div className="flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-400 py-2">
                      <Check className="w-4 h-4" />
                      {t('timeline:reminders.completedAt', { time: new Date(reminder.completedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })}
                    </div>
                  </CardContent>
                )}

                {reminder.status === 'delayed' && reminder.delayedUntil && (
                  <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-2">
                      {t('timeline:reminders.delayedUntil', { time: new Date(reminder.delayedUntil).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })}
                    </div>
                  </CardContent>
                )}

                {reminder.status === 'skipped' && (
                  <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-2">
                      {t('timeline:reminders.skippedText')}
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })
        )}
        </div>

        {/* Advertisement Banner - Free users only */}
        <AdBanner position="bottom" className="mt-6" />
      </main>

      {/* Edit Reminder Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('timeline:dialogs.editReminder.title')}</DialogTitle>
            <DialogDescription>{t('timeline:dialogs.editReminder.description')}</DialogDescription>
          </DialogHeader>
          {editingReminder && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">{t('timeline:dialogs.editReminder.type')}</Label>
                <Select
                  value={editingReminder.type}
                  onValueChange={(value) => setEditingReminder({ ...editingReminder, type: value as any })}
                >
                  <SelectTrigger id="edit-type" data-testid="select-edit-reminder-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meal">{t('timeline:reminder_types.meal')}</SelectItem>
                    <SelectItem value="snack">{t('timeline:reminder_types.snack')}</SelectItem>
                    <SelectItem value="water">{t('timeline:reminder_types.water')}</SelectItem>
                    <SelectItem value="pre_workout">{t('timeline:reminder_types.pre_workout')}</SelectItem>
                    <SelectItem value="post_workout">{t('timeline:reminder_types.post_workout')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">{t('timeline:dialogs.editReminder.time')}</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editingReminder.scheduledTime}
                  onChange={(e) => setEditingReminder({ ...editingReminder, scheduledTime: e.target.value })}
                  data-testid="input-edit-reminder-time"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              data-testid="button-cancel-edit"
            >
              {t('timeline:buttons.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (editingReminder) {
                  updateReminderMutation.mutate({
                    id: editingReminder.id,
                    type: editingReminder.type,
                    scheduledTime: editingReminder.scheduledTime
                  });
                }
              }}
              disabled={updateReminderMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateReminderMutation.isPending ? t('timeline:buttons.saving') : t('timeline:buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Reminder Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('timeline:dialogs.addReminder.title')}</DialogTitle>
            <DialogDescription>{t('timeline:dialogs.addReminder.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-type">{t('timeline:dialogs.editReminder.type')}</Label>
              <Select
                value={newReminderType}
                onValueChange={setNewReminderType}
              >
                <SelectTrigger id="add-type" data-testid="select-add-reminder-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meal">{t('timeline:reminder_types.meal')}</SelectItem>
                  <SelectItem value="snack">{t('timeline:reminder_types.snack')}</SelectItem>
                  <SelectItem value="water">{t('timeline:reminder_types.water')}</SelectItem>
                  <SelectItem value="pre_workout">{t('timeline:reminder_types.pre_workout')}</SelectItem>
                  <SelectItem value="post_workout">{t('timeline:reminder_types.post_workout')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-time">{t('timeline:dialogs.editReminder.time')}</Label>
              <Input
                id="add-time"
                type="time"
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                data-testid="input-add-reminder-time"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              data-testid="button-cancel-add"
            >
              {t('timeline:buttons.cancel')}
            </Button>
            <Button
              onClick={() => {
                createReminderMutation.mutate({
                  type: newReminderType,
                  scheduledTime: newReminderTime
                });
              }}
              disabled={createReminderMutation.isPending}
              data-testid="button-save-add"
            >
              {createReminderMutation.isPending ? t('timeline:buttons.creating') : t('timeline:buttons.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Food Log Dialog */}
      <Dialog open={showEditFoodDialog} onOpenChange={setShowEditFoodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('timeline:dialogs.editFoodLog.title')}</DialogTitle>
            <DialogDescription>{t('timeline:dialogs.editFoodLog.description')}</DialogDescription>
          </DialogHeader>
          {editingFoodLog && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('timeline:dialogs.editFoodLog.foodName')}</Label>
                <div className="text-sm text-muted-foreground">
                  {editingFoodLog.foodName || t('timeline:foodLogs.unknownFood')}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">{t('timeline:dialogs.editFoodLog.amount')}</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  data-testid="input-edit-food-amount"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {t('timeline:dialogs.editFoodLog.notice')}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditFoodDialog(false);
                setEditingFoodLog(null);
                setEditAmount('');
              }}
              data-testid="button-cancel-edit-food"
            >
              {t('timeline:buttons.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (editingFoodLog) {
                  const newAmount = parseFloat(editAmount);
                  if (isNaN(newAmount) || newAmount <= 0) {
                    toast({
                      title: t('timeline:dialogs.editFoodLog.invalidAmount'),
                      description: t('timeline:dialogs.editFoodLog.invalidAmountDesc'),
                      variant: 'destructive'
                    });
                    return;
                  }
                  editFoodLogMutation.mutate({
                    id: editingFoodLog.id,
                    amountG: newAmount
                  });
                }
              }}
              disabled={editFoodLogMutation.isPending}
              data-testid="button-save-edit-food"
            >
              {editFoodLogMutation.isPending ? t('timeline:buttons.saving') : t('timeline:buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snack Recommendations Dialog */}
      <Dialog open={showSnackRecommendations} onOpenChange={setShowSnackRecommendations}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('timeline:dialogs.snackRecommendations.title')}</DialogTitle>
            <DialogDescription>{t('timeline:dialogs.snackRecommendations.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {snackRecommendations.map((snack) => (
              <Card 
                key={snack.id}
                className="hover-elevate active-elevate-2 cursor-pointer border-2"
                onClick={() => {
                  setShowSnackRecommendations(false);
                  if (currentSnackReminder) {
                    navigate('/log?scheduleId=' + currentSnackReminder.id);
                  }
                }}
                data-testid={`snack-recommendation-${snack.id}`}
              >
                <CardContent className="p-4">
                  <p className="font-medium text-foreground">{snack.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSnackRecommendations(false)}
              data-testid="button-close-snack-recommendations"
            >
              {t('timeline:buttons.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
