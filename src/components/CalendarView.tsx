import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, 
  addMonths, subMonths, isToday, startOfDay
} from 'date-fns';
import { cn, generateBillingDates } from '../lib/utils';
import type { Subscription, Category } from '../lib/types';

interface CalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  subscriptions: Subscription[];
  categories: Category[];
}

export function CalendarView({ 
  currentMonth, 
  onMonthChange, 
  selectedDate, 
  onSelectDate, 
  subscriptions,
  categories
}: CalendarProps) {
  
  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Map dates to categories (for colors)
  const dateCategoryMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    subscriptions.forEach(sub => {
      const dates = generateBillingDates(sub, start, end);
      const cat = categories.find(c => c.id === sub.categoryId);
      if (!cat) return;

      dates.forEach(date => {
        if (isSameMonth(date, currentMonth)) {
          const key = startOfDay(date).getTime().toString();
          if (!map.has(key)) map.set(key, new Set());
          map.get(key)!.add(cat.color);
        }
      });
    });

    return map;
  }, [currentMonth, subscriptions, categories]);

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="p-5 flex items-center justify-between border-b border-border/40">
        <h2 className="text-lg font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <button 
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground pb-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {daysInMonth.map((date, i) => {
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isCurrentDay = isToday(date);
            const dayKey = startOfDay(date).getTime().toString();
            const colors = Array.from(dateCategoryMap.get(dayKey) || []);

            return (
              <button
                key={i}
                onClick={() => onSelectDate(date)}
                className={cn(
                  "relative h-12 sm:h-14 w-full rounded-xl flex flex-col items-center justify-start pt-2 transition-all duration-200",
                  !isCurrentMonth && "text-muted-foreground/30",
                  isCurrentMonth && "text-foreground hover:bg-muted/50",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                  isCurrentDay && !isSelected && "bg-primary/5 text-primary font-bold"
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  isSelected && "text-primary-foreground",
                  isCurrentMonth && !isSelected && !isCurrentDay && "text-foreground/80",
                )}>
                  {format(date, 'd')}
                </span>
                
                <div className="mt-1 flex gap-0.5 sm:gap-1 px-1 flex-wrap justify-center overflow-hidden h-3">
                  {colors.slice(0, 3).map((color, idx) => (
                    <span 
                      key={idx} 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? 'white' : color }}
                    />
                  ))}
                  {colors.length > 3 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-border" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.5)' : undefined }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
