import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, Calendar, Copy } from 'lucide-react';
import type { Subscription, Category } from '../lib/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency, generateBillingDates } from '../lib/utils';

interface AggregatedSubscription extends Subscription {
  occurrences: number;
  totalAmount: number;
  nextDate: Date | null;
}

interface ExpenseListProps {
  subscriptions: AggregatedSubscription[];
  categories: Category[];
  onEdit: (sub: Subscription) => void;
  onDuplicate: (sub: Subscription) => void;
  onDelete: (id: string) => void;
}

export function ExpenseList({ subscriptions, categories, onEdit, onDuplicate, onDelete }: ExpenseListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-border/60 shadow-sm">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📝</span>
        </div>
        <p className="text-muted-foreground font-medium">所選時段內無任何支出項目</p>
      </div>
    );
  }

  const getCycleText = (sub: Subscription) => {
    switch (sub.billingCycle.type) {
      case 'one_time': return '單次支出';
      case 'monthly': return '每月';
      case 'yearly': return '每年';
      case 'custom_days': return `每 ${sub.billingCycle.value} 天`;
      case 'custom_months': return `每 ${sub.billingCycle.value} 個月`;
      case 'custom_years': return `每 ${sub.billingCycle.value} 年`;
    }
  };

  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);

  const thisMonthItems: AggregatedSubscription[] = [];
  const otherItems: AggregatedSubscription[] = [];

  subscriptions.forEach(sub => {
    const hasThisMonth = generateBillingDates(sub, mStart, mEnd).length > 0;
    if (hasThisMonth) {
      thisMonthItems.push(sub);
    } else {
      otherItems.push(sub);
    }
  });

  const renderCard = (sub: AggregatedSubscription) => {
    const cat = categories.find(c => c.id === sub.categoryId);
    const isOneTime = sub.billingCycle.type === 'one_time';
    const isMenuOpen = openMenuId === sub.id;
    
    return (
      <div key={sub.id} className={`${isOneTime ? 'bg-amber-50/50 border-amber-200/60' : 'bg-white border-border/60'} p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:shadow-md relative`}>
        <div className="flex-1 flex items-start sm:items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${cat?.color || '#ccc'}20`, color: cat?.color }}
          >
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat?.color }} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h4 className="font-semibold text-foreground text-base sm:text-lg">
                {sub.name}
              </h4>
              {sub.occurrences > 1 && (
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    [x{sub.occurrences}]
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat?.color }} />
                {cat?.name || 'Unknown'}
              </span>
              <span>•</span>
              <span>{getCycleText(sub)}</span>
              {sub.nextDate && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {sub.occurrences > 1 ? '時段首扣: ' : '日期: '}
                    {format(sub.nextDate, 'yyyy-MM-dd')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-4 mt-2 sm:mt-0 pl-16 sm:pl-0">
          <div className="text-right">
            <p className="font-bold text-foreground text-lg">
              {formatCurrency(sub.amount, sub.currency || 'USD')}
            </p>
            {sub.occurrences > 1 && (
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5 bg-muted/50 px-1.5 py-0.5 rounded">
                時段總計 {formatCurrency(sub.totalAmount, sub.currency || 'USD')}
              </p>
            )}
          </div>
          <div className="relative" ref={isMenuOpen ? menuRef : null}>
            <button 
              onClick={() => setOpenMenuId(isMenuOpen ? null : sub.id)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-36 bg-white border border-border shadow-xl rounded-xl py-1.5 z-20 animate-in fade-in zoom-in duration-150 origin-bottom-right">
                <button 
                  onClick={() => { onEdit(sub); setOpenMenuId(null); }}
                  className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                  編輯
                </button>
                <button 
                  onClick={() => { onDuplicate(sub); setOpenMenuId(null); }}
                  className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  複製
                </button>
                <div className="h-px bg-border my-1 mx-2"></div>
                <button 
                  onClick={() => { onDelete(sub.id); setOpenMenuId(null); }}
                  className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/5 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  刪除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {thisMonthItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="flex-1 h-px bg-border/80"></div>
            <h3 className="text-sm font-bold text-foreground/80 shrink-0 tracking-widest">本月即將扣款</h3>
            <div className="flex-1 h-px bg-border/80"></div>
          </div>
          <div className="space-y-4">
            {thisMonthItems.map(renderCard)}
          </div>
        </div>
      )}

      {otherItems.length > 0 && (
        <div className="space-y-4">
          {thisMonthItems.length > 0 && (
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="flex-1 h-px bg-border/80 border-dashed"></div>
              <div className="w-2 h-2 rounded-full bg-border/60"></div>
              <div className="flex-1 h-px bg-border/80 border-dashed"></div>
            </div>
          )}
          <div className="space-y-4">
            {otherItems.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}
