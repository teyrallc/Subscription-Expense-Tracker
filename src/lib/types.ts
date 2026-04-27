export type Category = {
  id: string;
  name: string;
  color: string;
};

export type Company = {
  id: string;
  name: string;
};

export const CURRENCIES = ['USD', 'TWD', 'EUR', 'CNY'] as const;
export type Currency = typeof CURRENCIES[number];

export type BillingCycleType = 'monthly' | 'yearly' | 'one_time' | 'custom_days' | 'custom_months' | 'custom_years';

export type BillingCycle = {
  type: BillingCycleType;
  value: number; 
};

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  currency?: Currency; // Optional for backward compatibility
  firstBillingDate: string; // ISO format YYYY-MM-DD
  categoryId: string;
  companyId?: string; // Added optional for backward compatibility
  billingCycle: BillingCycle;
};

export type SummaryPeriod = 'this_month' | 'last_3_months' | 'this_year_billed' | 'this_year_total' | 'last_year' | 'lifetime' | 'custom';
