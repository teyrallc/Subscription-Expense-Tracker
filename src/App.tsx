import { useState, useMemo } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { SummaryWidget } from './components/SummaryWidget';
import { ConfirmModal } from './components/ConfirmModal';
import { useLocalStorage } from './lib/useStorage';
import type { Subscription, Category, Company, Currency, SummaryPeriod } from './lib/types';
import { defaultCategories, generateBillingDates, convertCurrency, getPeriodDates } from './lib/utils';
import { startOfMonth, endOfMonth, isSameDay, format } from 'date-fns';
import { useEffect } from 'react';
import { auth, db, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

function App() {
  const [user] = useAuthState(auth);
  
  const [subscriptions, setSubscriptions] = useLocalStorage<Subscription[]>('teyra-subs', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('teyra-categories', defaultCategories);
  const [companies, setCompanies] = useLocalStorage<Company[]>('teyra-companies', [{ id: '1', name: 'Teyra LLC' }]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("登入失敗，請確認 Firebase 配置是否正確");
    }
  };

  const handleLogout = () => signOut(auth);

  // Firestore Sync Logic
  useEffect(() => {
    if (!user) return;

    // Use a flag to avoid syncing local changes back to Firestore immediately during initial load
    let isInitialLoad = true;

    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Only update local state if data is actually different (shallow check)
        // This prevents the auto-save useEffect from firing unnecessarily
        if (isInitialLoad) {
          if (data.subscriptions) setSubscriptions(data.subscriptions);
          if (data.categories) setCategories(data.categories);
          if (data.companies) setCompanies(data.companies);
          isInitialLoad = false;
        }
      } else {
        // First time login: Upload current LocalStorage to cloud
        setDoc(doc(db, 'users', user.uid), {
          subscriptions,
          categories,
          companies,
          lastUpdated: new Date().toISOString()
        });
      }
    });

    return () => unsub();
  }, [user]);

  // Auto-save to Firestore (throttled)
  useEffect(() => {
    if (!user) return;
    
    const timeoutId = setTimeout(() => {
      setDoc(doc(db, 'users', user.uid), {
        subscriptions,
        categories,
        companies,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    }, 2000); // 2 second throttle

    return () => clearTimeout(timeoutId);
  }, [subscriptions, categories, companies, user]);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'ALL'>('ALL');
  
  // Currency State
  const [displayCurrency, setDisplayCurrency] = useLocalStorage<Currency>('teyra-display-currency', 'TWD');
  
  // By default, select all companies if none selected, or just keep a state
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(['1']);

  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [showOneTime, setShowOneTime] = useState(true);

  const [period, setPeriod] = useState<SummaryPeriod>('this_month');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const companyFilteredSubs = useMemo(() => {
    if (selectedCompanyIds.length === 0) return [];
    return subscriptions.filter(sub => selectedCompanyIds.includes(sub.companyId || '1'));
  }, [subscriptions, selectedCompanyIds]);

  // Calculate fixed monthly total for header
  const headerTotal = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    let total = 0;
    companyFilteredSubs.forEach(sub => {
      const dates = generateBillingDates(sub, start, end);
      const subTotal = dates.length * sub.amount;
      total += convertCurrency(subTotal, sub.currency || 'USD', displayCurrency);
    });
    return total;
  }, [companyFilteredSubs, displayCurrency]);

  const handleSaveSub = (subData: Omit<Subscription, 'id'>) => {
    if (editingSub && editingSub.id && editingSub.id !== 'duplicate') {
      setSubscriptions(subs => subs.map(s => s.id === editingSub.id ? { ...subData, id: s.id } : s));
    } else {
      setSubscriptions(subs => [...subs, { ...subData, id: Math.random().toString(36).substring(2, 9) }]);
    }
    setIsFormOpen(false);
    setEditingSub(undefined);
  };

  const handleDuplicate = (sub: Subscription) => {
    setEditingSub({ ...sub, id: 'duplicate' });
    setIsFormOpen(true);
  };

  const handleDeleteSub = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '刪除項目',
      message: '確定要刪除這個扣款項目嗎？此動作無法復原。',
      onConfirm: () => {
        setSubscriptions(subs => subs.filter(s => s.id !== id));
      }
    });
  };

  const handleAddCategory = (catData?: Omit<Category, 'id'>) => {
    const name = catData ? catData.name : newCategoryName;
    if (!name) return;
    
    const newId = Math.random().toString(36).substring(2, 9);
    const color = catData ? catData.color : (() => {
      const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
      return colors[Math.floor(Math.random() * colors.length)];
    })();
    
    setCategories(cats => [...cats, { id: newId, name, color }]);
    if (!catData) {
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) return;
    
    setConfirmModal({
      isOpen: true,
      title: '刪除分類',
      message: '確定要刪除此分類嗎？這將會連同該分類下的所有項目一併刪除。',
      onConfirm: () => {
        setCategories(cats => cats.filter(c => c.id !== id));
        setSubscriptions(subs => subs.filter(s => s.categoryId !== id));
        if (selectedCategoryId === id) setSelectedCategoryId('ALL');
      }
    });
  };

  const handleAddCompany = () => {
    if (!newCompanyName) return;
    const newId = Math.random().toString(36).substring(2, 9);
    setCompanies(comps => [...comps, { name: newCompanyName, id: newId }]);
    setSelectedCompanyIds(prev => [...prev, newId]);
    setIsAddingCompany(false);
    setNewCompanyName('');
  };

  const handleDeleteCompany = (id: string) => {
    if (companies.length <= 1) return;
    
    setConfirmModal({
      isOpen: true,
      title: '刪除管理單位',
      message: '確定要刪除此管理單位嗎？這將會連同該單位下的所有扣款項目一併刪除。',
      onConfirm: () => {
        setCompanies(comps => comps.filter(c => c.id !== id));
        setSubscriptions(subs => subs.filter(s => s.companyId !== id));
        setSelectedCompanyIds(prev => prev.filter(pId => pId !== id));
      }
    });
  };

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setIsFormOpen(true);
  };

  const selectedDateSubs = useMemo(() => {
    if (!selectedDate) return [];
    return companyFilteredSubs.filter(sub => {
      const dates = generateBillingDates(sub, selectedDate, selectedDate);
      return dates.some(d => isSameDay(d, selectedDate));
    });
  }, [selectedDate, companyFilteredSubs]);

  const filteredSubs = useMemo(() => {
    let base = selectedCategoryId === 'ALL' ? companyFilteredSubs : companyFilteredSubs.filter(s => s.categoryId === selectedCategoryId);
    if (!showOneTime) {
      base = base.filter(s => s.billingCycle.type !== 'one_time');
    }
    return base;
  }, [companyFilteredSubs, selectedCategoryId, showOneTime]);

  const sortedAndFilteredSubs = useMemo(() => {
    const { start, end } = getPeriodDates(period, customStart, customEnd);
    
    return filteredSubs.map(sub => {
      const dates = generateBillingDates(sub, start, end);
      return {
        ...sub,
        occurrences: dates.length,
        totalAmount: dates.length * sub.amount,
        nextDate: dates[0] || null
      };
    }).filter(item => item.occurrences > 0)
      .sort((a, b) => {
        if (!a.nextDate && !b.nextDate) return 0;
        if (!a.nextDate) return 1;
        if (!b.nextDate) return -1;
        return a.nextDate.getTime() - b.nextDate.getTime();
      });
  }, [filteredSubs, period, customStart, customEnd]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header 
        totalDeduction={headerTotal} 
        displayCurrency={displayCurrency}
        onCurrencyChange={setDisplayCurrency}
        user={user || null}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Company Filter Section */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 items-center">
            {companies.map(company => {
              const isSelected = selectedCompanyIds.includes(company.id);
              return (
                <div key={company.id} className="relative group">
                  <button
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCompanyIds(prev => prev.filter(id => id !== company.id));
                      } else {
                        setSelectedCompanyIds(prev => [...prev, company.id]);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-white border border-border/60 text-foreground hover:bg-muted/50'}`}
                  >
                    {company.name}
                  </button>
                  {companies.length > 1 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCompany(company.id);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-border shadow-sm text-muted-foreground hover:text-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {isAddingCompany ? (
              <div className="flex gap-1 items-center bg-white border border-border/60 p-1 rounded-xl h-9 shadow-sm">
                <input 
                  type="text" 
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  placeholder="新單位名稱"
                  className="w-28 px-2 text-sm bg-transparent outline-none"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCompany();
                    if (e.key === 'Escape') setIsAddingCompany(false);
                  }}
                />
                <button 
                  onClick={handleAddCompany}
                  className="p-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setIsAddingCompany(false)}
                  className="p-1 hover:bg-muted rounded-lg"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingCompany(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors bg-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="w-full lg:w-[380px] shrink-0 space-y-6">
            <SummaryWidget 
              subscriptions={companyFilteredSubs} 
              displayCurrency={displayCurrency}
              period={period}
              onPeriodChange={setPeriod}
              customStart={customStart}
              onCustomStartChange={setCustomStart}
              customEnd={customEnd}
              onCustomEndChange={setCustomEnd}
            />
            
            <CalendarView 
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              selectedDate={selectedDate}
              onSelectDate={d => setSelectedDate(d.getTime() === selectedDate?.getTime() ? null : d)}
              subscriptions={companyFilteredSubs}
              categories={categories}
            />

            {selectedDate && (
              <div className="bg-white p-5 rounded-2xl border border-primary/20 shadow-sm">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {selectedDate.toLocaleDateString()} 預計扣款
                </h3>
                {selectedDateSubs.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateSubs.map(sub => {
                      const cat = categories.find(c => c.id === sub.categoryId);
                      return (
                        <div key={sub.id} className="flex justify-between items-center text-sm p-3 bg-muted/40 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat?.color }} />
                            <span className="font-medium text-foreground">{sub.name}</span>
                          </div>
                          <span className="font-bold text-foreground">
                            ${sub.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                    <div className="pt-3 mt-3 border-t border-border flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">單日總計</span>
                      <span className="font-bold text-primary">
                        ${selectedDateSubs.reduce((acc, sub) => acc + sub.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">本日無扣款項目</p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-bold text-foreground tracking-tight">所有訂閱與支出</h2>
                <span className="text-xs text-muted-foreground font-medium">(依照左側選擇時段彙整)</span>
              </div>
              {!isFormOpen && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border/60 rounded-xl shadow-sm shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">顯示單次支出</span>
                    <button 
                      onClick={() => setShowOneTime(!showOneTime)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${showOneTime ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showOneTime ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <button 
                    onClick={() => setIsFormOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>新增項目</span>
                  </button>
                </div>
              )}
            </div>

            {isFormOpen && (
              <ExpenseForm 
                subscription={editingSub}
                categories={categories}
                companies={companies}
                onSave={handleSaveSub}
                onCancel={() => { setIsFormOpen(false); setEditingSub(undefined); }}
                onAddCategory={handleAddCategory}
              />
            )}

            {!isFormOpen && (
              <div className="flex overflow-x-auto pb-2 hide-scrollbar">
                <div className="flex gap-2 items-center">
                  {isAddingCategory ? (
                    <div className="flex gap-1 items-center bg-white border border-border/60 p-1 rounded-full h-8 shadow-sm">
                      <input 
                        type="text" 
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder="新分類"
                        className="w-20 px-2 text-xs bg-transparent outline-none"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddCategory();
                          if (e.key === 'Escape') setIsAddingCategory(false);
                        }}
                      />
                      <button 
                        onClick={handleAddCategory}
                        className="p-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => setIsAddingCategory(false)}
                        className="p-1 hover:bg-muted rounded-full"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingCategory(true)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors bg-white shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedCategoryId('ALL')}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategoryId === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    全部
                  </button>
                  {categories.map(cat => (
                    <div key={cat.id} className="relative group shrink-0">
                      <button
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${selectedCategoryId === cat.id ? 'bg-primary text-primary-foreground' : 'bg-white border border-border/60 text-foreground hover:bg-muted/50'}`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-border shadow-sm text-muted-foreground hover:text-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ExpenseList 
              subscriptions={sortedAndFilteredSubs}
              categories={categories}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteSub}
              currentMonth={getPeriodDates(period, customStart, customEnd).start}
            />
          </div>

        </div>
      </main>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default App;
