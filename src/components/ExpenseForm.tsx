import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { Subscription, Category, BillingCycleType, Company, Currency } from '../lib/types';
import { format } from 'date-fns';
import { CURRENCIES } from '../lib/utils';

interface ExpenseFormProps {
  subscription?: Subscription;
  categories: Category[];
  companies: Company[];
  onSave: (sub: Omit<Subscription, 'id'>) => void;
  onCancel: () => void;
  onAddCategory: (cat: Omit<Category, 'id'>) => void;
}

export function ExpenseForm({ subscription, categories, companies, onSave, onCancel, onAddCategory }: ExpenseFormProps) {
  const [name, setName] = useState(subscription?.name || '');
  const [amount, setAmount] = useState(subscription?.amount?.toString() || '');
  const [currency, setCurrency] = useState<Currency>(subscription?.currency || 'USD');
  const [firstBillingDate, setFirstBillingDate] = useState(
    subscription?.firstBillingDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [categoryId, setCategoryId] = useState(subscription?.categoryId || categories[0]?.id || '');
  const [billingCycleType, setBillingCycleType] = useState<BillingCycleType>(
    subscription?.billingCycle.type || 'monthly'
  );
  const [billingCycleValue, setBillingCycleValue] = useState(
    subscription?.billingCycle.value?.toString() || '1'
  );

  // New Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#ef4444');

  // New Company State
  const [companyId, setCompanyId] = useState(subscription?.companyId || companies[0]?.id || '1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !firstBillingDate || !categoryId || !companyId) return;

    onSave({
      name,
      amount: parseFloat(amount),
      currency,
      firstBillingDate,
      categoryId,
      companyId,
      billingCycle: {
        type: billingCycleType,
        value: parseInt(billingCycleValue) || 1
      }
    });
  };

  const handleAddCategory = () => {
    if (!newCatName) return;
    onAddCategory({ name: newCatName, color: newCatColor });
    setIsAddingCategory(false);
    setNewCatName('');
  };

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          {subscription ? '編輯項目' : '新增扣款項目'}
        </h3>
        <button onClick={onCancel} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">項目名稱</label>
          <input 
            type="text" 
            required 
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-border/80 bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            placeholder="e.g. Netflix"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">扣款金額</label>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                className="w-24 h-11 px-2 rounded-lg border border-border/80 bg-muted/30 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                {CURRENCIES.map((c: Currency) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input 
                type="number" 
                required 
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 h-11 px-3 rounded-lg border border-border/80 bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">首次扣款日期</label>
            <input 
              type="date" 
              required 
              value={firstBillingDate}
              onChange={e => setFirstBillingDate(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border/80 bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">管理單位</label>
            <select 
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border/80 bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">項目分類</label>
            {isAddingCategory ? (
              <div className="flex gap-2 items-center bg-muted/30 p-2 rounded-lg border border-border/60">
                <input 
                  type="color" 
                  value={newCatColor}
                  onChange={e => setNewCatColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
                />
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="新分類名稱"
                  className="flex-1 h-9 px-2 w-full min-w-0 text-sm rounded bg-background border border-border/80 outline-none"
                />
                <button 
                  type="button" 
                  onClick={handleAddCategory}
                  className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shrink-0"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAddingCategory(false)}
                  className="p-1.5 hover:bg-muted rounded-md shrink-0"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select 
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="flex-1 h-11 px-3 rounded-lg border border-border/80 bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="h-11 px-4 text-sm font-medium border border-border/80 rounded-lg hover:bg-muted transition-colors"
                >
                  新增
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">扣款週期</label>
          <div className="flex gap-2">
            <select 
              value={billingCycleType}
              onChange={e => setBillingCycleType(e.target.value as BillingCycleType)}
              className="flex-1 h-11 px-3 rounded-lg border border-border/80 bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
            >
              <option value="one_time">單次支出</option>
              <option value="monthly">每月</option>
              <option value="yearly">每年</option>
              <option value="custom_days">自訂 (天)</option>
              <option value="custom_months">自訂 (月)</option>
              <option value="custom_years">自訂 (年)</option>
            </select>
            {billingCycleType.startsWith('custom_') && (
              <input 
                type="number" 
                min="1"
                required
                value={billingCycleValue}
                onChange={e => setBillingCycleValue(e.target.value)}
                className="w-20 h-11 px-3 rounded-lg border border-border/80 bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            )}
          </div>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            className="w-full h-12 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            儲存項目
          </button>
        </div>
      </form>
    </div>
  );
}
