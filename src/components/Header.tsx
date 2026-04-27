import { Wallet, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import type { Currency } from '../lib/types';
import { CURRENCIES, CURRENCY_SYMBOLS, formatCurrency } from '../lib/utils';
import type { User } from 'firebase/auth';

interface HeaderProps {
  totalDeduction: number;
  displayCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export function Header({ totalDeduction, displayCurrency, onCurrencyChange, user, onLogin, onLogout }: HeaderProps) {
  return (
    <header className="bg-white border-b border-border sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 p-2.5 rounded-xl">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">訂閱與支出追蹤</h1>
            <p className="text-sm text-muted-foreground font-medium">Subscription & Expense Tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 border-r border-border/60 pr-6">
            <span className="text-xs font-medium text-muted-foreground">顯示幣別</span>
            <select 
              value={displayCurrency}
              onChange={e => onCurrencyChange(e.target.value as Currency)}
              className="h-8 px-2 rounded-lg bg-muted/40 border border-border/60 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-primary/50"
            >
              {CURRENCIES.map((c: Currency) => (
                <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>
              ))}
            </select>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground font-medium mb-0.5">本月預計扣款總金額</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalDeduction, displayCurrency)}
            </p>
          </div>

          <div className="border-l border-border/60 pl-6">
            {user ? (
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-primary" />
                  </div>
                )}
                <button 
                  onClick={onLogout}
                  className="p-2 hover:bg-destructive/10 rounded-lg text-destructive/70 hover:text-destructive transition-colors"
                  title="登出"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Google 登入同步</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
