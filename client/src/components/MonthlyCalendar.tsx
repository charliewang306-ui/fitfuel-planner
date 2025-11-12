import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthlyCalendarProps {
  onDayClick?: (day: string) => void;
}

export function MonthlyCalendar({ onDayClick }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  // Fetch monthly status
  const { data: monthData } = useQuery<{ statuses: Array<{ day: string; completed: boolean }> }>({
    queryKey: ['/api/daily-status/month', year, month],
  });

  // Fetch streak
  const { data: streakData } = useQuery<{ streak: number }>({
    queryKey: ['/api/daily-status/streak'],
  });

  const statuses = monthData?.statuses || [];
  const streak = streakData?.streak || 0;

  // Build status map for quick lookup
  const statusMap = new Map<string, boolean>();
  statuses.forEach(s => statusMap.set(s.day, s.completed));

  // Calculate calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  // Generate days array
  const days: Array<{ date: number; dateStr: string; completed: boolean; isToday: boolean }> = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const completed = statusMap.get(dateStr) || false;
    days.push({ date: day, dateStr, completed, isToday });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">本月打卡</CardTitle>
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
          {days.map(({ date, dateStr, completed, isToday }) => (
            <button
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              className={`
                aspect-square rounded-md flex items-center justify-center text-sm font-medium
                transition-all
                ${completed 
                  ? 'bg-primary text-primary-foreground hover-elevate' 
                  : 'border border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                }
                ${isToday ? 'ring-2 ring-primary/50' : ''}
                active-elevate-2
              `}
              data-testid={`calendar-day-${dateStr}`}
            >
              {date}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-md bg-primary" />
            <span>完成</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-md border border-muted-foreground/30" />
            <span>未完成</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
