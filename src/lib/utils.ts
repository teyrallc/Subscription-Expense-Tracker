import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addDays, addMonths, addYears, parseISO, startOfDay, isBefore, isAfter, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns"
import type { Subscription, Currency, SummaryPeriod } from "./types"
export { CURRENCIES } from "./types"

export function getPeriodDates(period: SummaryPeriod, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  let start: Date;
  let end: Date;

  switch (period) {
    case 'this_month':
      start = startOfMonth(today);
      end = endOfMonth(today);
      break;
    case 'last_3_months':
      start = startOfMonth(subMonths(today, 2));
      end = endOfMonth(today);
      break;
    case 'this_year_billed':
      start = startOfYear(today);
      end = today;
      break;
    case 'this_year_total':
      start = startOfYear(today);
      end = endOfYear(today);
      break;
    case 'last_year':
      const lastYearDate = new Date(today.getFullYear() - 1, 0, 1);
      start = startOfYear(lastYearDate);
      end = endOfYear(lastYearDate);
      break;
    case 'lifetime':
      start = new Date(2000, 0, 1);
      end = today;
      break;
    case 'custom':
      start = startOfDay(new Date(customStart || ''));
      end = startOfDay(new Date(customEnd || ''));
      break;
    default:
      start = startOfMonth(today);
      end = endOfMonth(today);
  }
  return { start, end };
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  TWD: 'NT$',
  EUR: '€',
  CNY: '¥'
};

// Rates relative to USD (base USD = 1)
export const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  TWD: 32.5,
  EUR: 0.92,
  CNY: 7.23
};

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  const amountInUSD = amount / EXCHANGE_RATES[from];
  return amountInUSD * EXCHANGE_RATES[to];
}

export function formatCurrency(amount: number, currency: Currency): string {
  return `${CURRENCY_SYMBOLS[currency]}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateBillingDates(sub: Subscription, fromDate: Date, toDate: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(parseISO(sub.firstBillingDate));
  const end = startOfDay(toDate);
  const start = startOfDay(fromDate);

  if (sub.billingCycle.value <= 0) return [];

  let i = 0;
  // If first billing date is way before fromDate, we need to advance it to save loop iterations.
  // Actually, for custom days this might be slow if the gap is huge (e.g., years). 
  // Let's just do a while loop, it handles most realistic cases fine.
  while (!isAfter(current, end) && i < 10000) {
    if (!isBefore(current, start)) {
      dates.push(current);
    }
    
    if (sub.billingCycle.type === 'one_time') {
      break;
    }

    if (sub.billingCycle.type === 'monthly') {
      current = addMonths(current, 1);
    } else if (sub.billingCycle.type === 'yearly') {
      current = addYears(current, 1);
    } else if (sub.billingCycle.type === 'custom_days') {
      current = addDays(current, sub.billingCycle.value);
    } else if (sub.billingCycle.type === 'custom_months') {
      current = addMonths(current, sub.billingCycle.value);
    } else if (sub.billingCycle.type === 'custom_years') {
      current = addYears(current, sub.billingCycle.value);
    } else {
      break;
    }
    i++;
  }

  return dates;
}

export const defaultCategories = [
  { id: '1', name: 'Software', color: '#3b82f6' }, // blue-500
  { id: '2', name: 'Server', color: '#8b5cf6' }, // violet-500
  { id: '3', name: 'Office', color: '#10b981' }, // emerald-500
  { id: '4', name: 'Marketing', color: '#f59e0b' }, // amber-500
  { id: '5', name: 'Other', color: '#6b7280' }, // gray-500
];
