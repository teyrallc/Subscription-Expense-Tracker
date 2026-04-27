import { useMemo } from 'react';
import { generateBillingDates, convertCurrency, formatCurrency, getPeriodDates } from '../lib/utils';
import type { Subscription, Currency, SummaryPeriod } from '../lib/types';
import { PieChart } from 'lucide-react';

interface SummaryWidgetProps {
  subscriptions: Subscription[];
  displayCurrency: Currency;
  period: SummaryPeriod;
  onPeriodChange: (p: SummaryPeriod) => void;
  customStart: string;
  onCustomStartChange: (s: string) => void;
  customEnd: string;
  onCustomEndChange: (s: string) => void;
}

export function SummaryWidget({ 
  subscriptions, 
  displayCurrency,
  period,
  onPeriodChange,
  customStart,
  onCustomStartChange,
  customEnd,
  onCustomEndChange
}: SummaryWidgetProps) {

  const total = useMemo(() => {
    const { start, end } = getPeriodDates(period, customStart, customEnd);

    let sum = 0;
    subscriptions.forEach(sub => {
      const dates = generateBillingDates(sub, start, end);
      const subTotal = dates.length * sub.amount;
      sum += convertCurrency(subTotal, sub.currency || 'USD', displayCurrency);
    });
    return sum;
  }, [period, subscriptions, displayCurrency, customStart, customEnd]);

  const periods: { value: SummaryPeriod; label: string }[] = [
    { value: 'this_month', label: '本月' },
    { value: 'last_3_months', label: '近三個月' },
    { value: 'this_year_billed', label: '今年已扣款' },
    { value: 'this_year_total', label: '今年預計' },
    { value: 'last_year', label: '去年總計' },
    { value: 'lifetime', label: '所有時間' },
    { value: 'custom', label: '自訂日期' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4 text-foreground">
        <div className="bg-primary/5 p-1.5 rounded-lg">
          <PieChart className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold">花費總覽</h3>
      </div>
      
      <div className="mb-4">
        <select 
          value={period}
          onChange={e => onPeriodChange(e.target.value as SummaryPeriod)}
          className="w-full h-10 px-3 rounded-xl border border-border/80 bg-background focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium"
        >
          {periods.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {period === 'custom' && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground ml-1">開始日期</span>
            <input 
              type="date" 
              value={customStart}
              onChange={e => onCustomStartChange(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-border/80 bg-background text-xs outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground ml-1">結束日期</span>
            <input 
              type="date" 
              value={customEnd}
              onChange={e => onCustomEndChange(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-border/80 bg-background text-xs outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      )}

      <div className="p-4 bg-muted/40 rounded-xl border border-border/40">
        <p className="text-sm text-muted-foreground mb-1 font-medium">總計金額 ({displayCurrency})</p>
        <p className="text-3xl font-bold text-foreground tracking-tight">
          {formatCurrency(total, displayCurrency)}
        </p>
      </div>
    </div>
  );
}
