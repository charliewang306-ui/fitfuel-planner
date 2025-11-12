import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DayDetail {
  day: string;
  completed: boolean;
  status: 'completed' | 'partial' | 'not';
  protein: number;
  proteinTarget: number;
  kcal: number;
  kcalTarget: number;
  water: number;
  waterTarget: number;
}

export default function Streak() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  // Fetch monthly status
  const { data: monthData, isLoading } = useQuery<{ 
    statuses: Array<{ 
      day: string; 
      completed: boolean; 
      status: 'completed' | 'partial' | 'not';
    }> 
  }>({
    queryKey: ['/api/daily-status/month', year, month],
  });

  // Fetch streak
  const { data: streakData } = useQuery<{ streak: number }>({
    queryKey: ['/api/daily-status/streak'],
  });

  const statuses = monthData?.statuses || [];
  const streak = streakData?.streak || 0;

  // Build status map for quick lookup
  const statusMap = new Map<string, { completed: boolean; status: 'completed' | 'partial' | 'not' }>();
  statuses.forEach(s => statusMap.set(s.day, { completed: s.completed, status: s.status }));

  // Calculate calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  // Generate days array
  const days: Array<{ 
    date: number; 
    dateStr: string; 
    completed: boolean; 
    status: 'completed' | 'partial' | 'not';
    isToday: boolean;
    isFuture: boolean;
  }> = [];
  
  const today = new Date().toISOString().split('T')[0];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const isFuture = dateStr > today;
    const statusInfo = statusMap.get(dateStr);
    const completed = statusInfo?.completed || false;
    const status = statusInfo?.status || 'not';
    days.push({ date: day, dateStr, completed, status, isToday, isFuture });
  }

  // Fetch day detail mutation
  const fetchDayDetailMutation = useMutation({
    mutationFn: async (day: string) => {
      const res = await apiRequest('GET', `/api/daily-status/detail/${day}`, undefined);
      if (!res.ok) throw new Error('Failed to fetch day detail');
      return res.json();
    },
    onSuccess: (data) => {
      setSelectedDay(data);
      setShowDayDialog(true);
    },
    onError: () => {
      toast({
        title: '加载失败',
        description: '无法加载该日详情',
        variant: 'destructive'
      });
    }
  });

  // Toggle day completion mutation
  const toggleDayMutation = useMutation({
    mutationFn: async (day: string) => {
      const res = await apiRequest('POST', '/api/daily-status/toggle', { day });
      if (!res.ok) throw new Error('Failed to toggle day');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-status/month', year, month] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-status/streak'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-status/today'] });
      
      // Refresh day detail if dialog is open
      if (selectedDay) {
        fetchDayDetailMutation.mutate(selectedDay.day);
      }
      
      toast({
        title: '更新成功',
        description: selectedDay?.completed ? '已撤销完成标记' : '已标记为完成'
      });
    },
    onError: () => {
      toast({
        title: '更新失败',
        description: '无法更新完成状态',
        variant: 'destructive'
      });
    }
  });

  const handleDayClick = (dateStr: string, isFuture: boolean) => {
    if (isFuture) return; // Don't allow clicking future dates
    fetchDayDetailMutation.mutate(dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // Calculate completion percentage for selected day
  const getCompletionPercentage = (detail: DayDetail | null) => {
    if (!detail) return { protein: 0, kcal: 0, water: 0 };
    return {
      protein: Math.round((detail.protein / detail.proteinTarget) * 100),
      kcal: Math.round((detail.kcal / detail.kcalTarget) * 100),
      water: Math.round((detail.water / detail.waterTarget) * 100)
    };
  };

  const percentages = getCompletionPercentage(selectedDay);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-xl font-semibold text-foreground">连续天数月历</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">月历视图</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  连续天数：<span className="font-bold text-primary">{streak}</span> 天
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handlePrevMonth} data-testid="button-prev-month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[80px] text-center">
                  {year}年{month}月
                </span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleNextMonth} data-testid="button-next-month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Actual days */}
              {days.map(({ date, dateStr, completed, status, isToday, isFuture }) => {
                let bgClass = '';
                let textClass = '';
                let borderClass = '';
                
                if (isFuture) {
                  // Future dates - disabled
                  bgClass = 'bg-muted/30';
                  textClass = 'text-muted-foreground/30';
                  borderClass = '';
                } else if (status === 'completed') {
                  // Completed - solid green
                  bgClass = 'bg-green-500';
                  textClass = 'text-white';
                  borderClass = '';
                } else if (status === 'partial') {
                  // Partial - light green
                  bgClass = 'bg-green-300';
                  textClass = 'text-green-800';
                  borderClass = '';
                } else {
                  // Not completed - white with border
                  bgClass = 'bg-white';
                  textClass = 'text-gray-400';
                  borderClass = 'border border-gray-300';
                }

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDayClick(dateStr, isFuture)}
                    disabled={isFuture}
                    className={`
                      aspect-square rounded-md flex items-center justify-center text-sm font-medium
                      transition-all
                      ${bgClass}
                      ${textClass}
                      ${borderClass}
                      ${isToday ? 'ring-2 ring-primary/50' : ''}
                      ${!isFuture ? 'hover-elevate active-elevate-2' : 'cursor-not-allowed'}
                    `}
                    data-testid={`calendar-day-${dateStr}`}
                  >
                    {date}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-md bg-green-500" />
                <span>完成</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-md bg-green-300" />
                <span>部分完成</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-md bg-white border border-gray-300" />
                <span>未完成</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Day Detail Dialog */}
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-day-detail">
          <DialogHeader>
            <DialogTitle>
              {selectedDay?.day 
                ? new Date(selectedDay.day + 'T00:00:00').toLocaleDateString('zh-CN', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })
                : '加载中...'
              }
            </DialogTitle>
            <DialogDescription>
              查看当天营养完成情况
            </DialogDescription>
          </DialogHeader>

          {selectedDay && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex justify-center">
                {selectedDay.status === 'completed' ? (
                  <Badge variant="default" className="text-sm">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    完成
                  </Badge>
                ) : selectedDay.status === 'partial' ? (
                  <Badge variant="secondary" className="text-sm">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    部分完成
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-sm">
                    未完成
                  </Badge>
                )}
              </div>

              {/* Nutrition Details */}
              <div className="space-y-3">
                {/* Protein */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">蛋白质</span>
                    <span className="font-medium">
                      {selectedDay.protein.toFixed(1)}g / {selectedDay.proteinTarget.toFixed(1)}g
                      <span className={`ml-2 ${percentages.protein >= 90 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        ({percentages.protein}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${percentages.protein >= 90 ? 'bg-green-600' : 'bg-muted-foreground'}`}
                      style={{ width: `${Math.min(percentages.protein, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Calories */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">热量</span>
                    <span className="font-medium">
                      {selectedDay.kcal.toFixed(0)} / {selectedDay.kcalTarget.toFixed(0)} kcal
                      <span className={`ml-2 ${Math.abs(percentages.kcal - 100) <= 10 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        ({percentages.kcal}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${Math.abs(percentages.kcal - 100) <= 10 ? 'bg-green-600' : 'bg-muted-foreground'}`}
                      style={{ width: `${Math.min(percentages.kcal, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Water */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">水分</span>
                    <span className="font-medium">
                      {selectedDay.water.toFixed(1)} / {selectedDay.waterTarget.toFixed(1)} oz
                      <span className={`ml-2 ${percentages.water >= 80 ? 'text-cyan-600' : 'text-muted-foreground'}`}>
                        ({percentages.water}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${percentages.water >= 80 ? 'bg-cyan-600' : 'bg-muted-foreground'}`}
                      style={{ width: `${Math.min(percentages.water, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDayDialog(false)}
              data-testid="button-close-dialog"
            >
              关闭
            </Button>
            <Button
              variant={selectedDay?.completed ? "secondary" : "default"}
              onClick={() => selectedDay && toggleDayMutation.mutate(selectedDay.day)}
              disabled={toggleDayMutation.isPending}
              data-testid="button-toggle-completion"
            >
              {toggleDayMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : selectedDay?.completed ? (
                "撤销完成"
              ) : (
                "标记完成"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
