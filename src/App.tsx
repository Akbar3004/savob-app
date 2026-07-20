import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Heart,
  Wallet,
  Download,
  Upload,
  RefreshCw,
  HeartHandshake,
  TrendingUp,
  Info,
  CheckCircle2,
  Settings2,
  ArrowLeftRight,
  DollarSign,
  CloudLightning,
  CloudRain,
  CloudOff,
  LogOut,
  User,
  Calendar,
  BarChart3,
  FileText,
  Award,
  Sparkles,
  Gauge,
} from 'lucide-react';
import { Transaction, MonthlyStats, formatUZS, formatUSD, MONTH_NAMES } from './types';
import { MetricCard } from './components/MetricCard';
import { TransactionForm } from './components/TransactionForm';
import { MonthlyChart } from './components/MonthlyChart';
import { TransactionList } from './components/TransactionList';
import { AuthModal } from './components/AuthModal';
import { StatsModal } from './components/StatsModal';
import { ExtremesModal } from './components/ExtremesModal';
import { ExportPDFModal } from './components/ExportPDFModal';
import { MonthlyWrapModal } from './components/MonthlyWrapModal';
import { IncomeGoalCard } from './components/IncomeGoalCard';
import { saveUserData, loadUserData, hashPassword, UserData } from './services/db';

export default function App() {
  const [binId, setBinId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [charityPercentage, setCharityPercentage] = useState<number>(10);
  const [exchangeRate, setExchangeRate] = useState<number>(12850);
  const [incomeGoals, setIncomeGoals] = useState<{ [monthKey: string]: number }>({});
  const [userPassword, setUserPassword] = useState<string>('');
  
  // New States
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isExtremesOpen, setIsExtremesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isWrapOpen, setIsWrapOpen] = useState(false);
  const [wrapMonthKey, setWrapMonthKey] = useState('');
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [fetchingRate, setFetchingRate] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sinxronlash ref'lari — har doim eng oxirgi qiymatlarni ushlab turadi
  const binIdRef = useRef<string | null>(null);
  const pendingSaveRef = useRef<UserData | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    binIdRef.current = binId;
  }, [binId]);

  // ---- localStorage kesh yordamchilari (qurilmada ma'lumot hech qachon yo'qolmaydi) ----
  const cacheKeys = (id: string) => ({
    tx: `savob_tx_${id}`,
    percent: `savob_percent_${id}`,
    rate: `savob_rate_${id}`,
    goals: `savob_goals_${id}`,
  });

  const writeCache = (id: string, d: UserData) => {
    const k = cacheKeys(id);
    localStorage.setItem(k.tx, JSON.stringify(d.transactions));
    localStorage.setItem(k.percent, String(d.charityPercentage));
    localStorage.setItem(k.rate, String(d.exchangeRate));
    localStorage.setItem(k.goals, JSON.stringify(d.incomeGoals || {}));
  };

  const readCache = (id: string): UserData | null => {
    const k = cacheKeys(id);
    const tx = localStorage.getItem(k.tx);
    if (tx === null) return null;
    try {
      return {
        transactions: JSON.parse(tx),
        charityPercentage: parseInt(localStorage.getItem(k.percent) || '10', 10),
        exchangeRate: parseFloat(localStorage.getItem(k.rate) || '12850'),
        incomeGoals: JSON.parse(localStorage.getItem(k.goals) || '{}'),
      };
    } catch {
      return null;
    }
  };

  const applyUserData = (d: UserData) => {
    setTransactions(d.transactions);
    setCharityPercentage(d.charityPercentage);
    setExchangeRate(d.exchangeRate);
    setIncomeGoals(d.incomeGoals || {});
  };

  const scheduleRetry = () => {
    if (retryTimerRef.current) return;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      flushPending();
    }, 8000);
  };

  // Bulutga yozilmay qolgan o'zgarishni qayta yuborishga urinadi
  const flushPending = async () => {
    const id = binIdRef.current;
    const payload = pendingSaveRef.current;
    if (!id || !payload) return;
    setSyncStatus('syncing');
    const ok = await saveUserData(id, payload);
    if (ok) {
      if (pendingSaveRef.current === payload) pendingSaveRef.current = null;
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
      scheduleRetry();
    }
  };

  // Ilova ochilganda: sessiyani tiklash + barqaror bulut bilan sinxronlash
  useEffect(() => {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    setSelectedPeriod(currentMonthStr);

    const savedPassword = localStorage.getItem('savob_password');
    const legacyBinId = localStorage.getItem('savob_bin_id');
    if (!savedPassword) return;

    let cancelled = false;

    (async () => {
      // Barqaror kalit: parol xeshi (eski jsonblob sessiyalarini ham ko'chiradi)
      let id: string;
      try {
        id = await hashPassword(savedPassword);
      } catch {
        id = legacyBinId || '';
      }
      if (!id || cancelled) return;

      setBinId(id);
      binIdRef.current = id;
      setUserPassword(savedPassword);
      localStorage.setItem('savob_bin_id', id);

      // 1) Darhol keshdan yuklash — bo'sh ekran bo'lmaydi, mahalliy ma'lumot yo'qolmaydi
      const cache = readCache(id) || (legacyBinId ? readCache(legacyBinId) : null);
      if (cache && !cancelled) {
        applyUserData(cache);
        writeCache(id, cache); // eski kalitdagi keshni yangi kalitga ko'chiramiz
      }

      // 2) Barqaror bulutdan fonda sinxronlash
      const cloud = await loadUserData(id);
      if (cancelled) return;

      if (cloud) {
        applyUserData(cloud);
        writeCache(id, cloud);
        setSyncStatus('synced');
      } else if (cache) {
        // Bulutda ma'lumot yo'q / ulanib bo'lmadi — mahalliy nusxadan qayta tiklaymiz
        pendingSaveRef.current = cache;
        flushPending();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Tarmoq qaytganda yoki ilovaga qaytilganda kutilayotgan o'zgarishlarni yuboramiz
  useEffect(() => {
    const onOnline = () => flushPending();
    const onVisible = () => {
      if (document.visibilityState === 'visible') flushPending();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // O'zgarishlarni saqlash: avval mahalliy kesh (kafolatli), keyin bulut (xatoda qayta urinish)
  const performSync = async (
    updatedTxs: Transaction[],
    percent: number,
    rate: number,
    currentBinId: string,
    goals: { [monthKey: string]: number } = incomeGoals
  ) => {
    const payload: UserData = {
      transactions: updatedTxs,
      charityPercentage: percent,
      exchangeRate: rate,
      incomeGoals: goals,
    };

    writeCache(currentBinId, payload);
    pendingSaveRef.current = payload;

    setSyncStatus('syncing');
    const ok = await saveUserData(currentBinId, payload);
    if (ok) {
      if (pendingSaveRef.current === payload) pendingSaveRef.current = null;
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
      scheduleRetry();
    }
  };

  const handleAuthSuccess = (
    newBinId: string,
    data: { transactions: Transaction[]; charityPercentage: number; exchangeRate: number },
    passwordPlain: string
  ) => {
    setBinId(newBinId);
    binIdRef.current = newBinId;
    setUserPassword(passwordPlain);
    applyUserData(data);

    localStorage.setItem('savob_bin_id', newBinId);
    localStorage.setItem('savob_password', passwordPlain);
    writeCache(newBinId, data);

    showToast('Tizimga kirildi!');
  };

  const handleLogout = () => {
    if (confirm("Hisobingizdan chiqmoqchimisiz? Ma'lumotlaringiz bulutda xavfsiz saqlanadi.")) {
      localStorage.removeItem('savob_bin_id');
      localStorage.removeItem('savob_password');
      binIdRef.current = null;
      pendingSaveRef.current = null;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setBinId(null);
      setUserPassword('');
      setTransactions([]);
    }
  };

  const saveTransactions = (updatedList: Transaction[]) => {
    setTransactions(updatedList);
    if (binId) {
      performSync(updatedList, charityPercentage, exchangeRate, binId);
    }
  };

  const handlePercentageChange = (val: number) => {
    setCharityPercentage(val);
    showToast(`Hayriya foizi ${val}% ga o'rnatildi!`, 'info');
    if (binId) {
      performSync(transactions, val, exchangeRate, binId);
    }
  };

  const handleExchangeRateChange = (val: number) => {
    setExchangeRate(val);
    if (binId) {
      performSync(transactions, charityPercentage, val, binId);
    }
  };

  const handleSetIncomeGoal = (monthKey: string, value: number) => {
    const updatedGoals = { ...incomeGoals };
    if (value > 0) {
      updatedGoals[monthKey] = value;
    } else {
      delete updatedGoals[monthKey];
    }
    setIncomeGoals(updatedGoals);
    showToast(
      value > 0 ? 'Oylik daromad maqsadi saqlandi!' : 'Oylik maqsad olib tashlandi.',
      value > 0 ? 'success' : 'info'
    );
    if (binId) {
      performSync(transactions, charityPercentage, exchangeRate, binId, updatedGoals);
    }
  };

  const handleOnlineRateFetch = async () => {
    setFetchingRate(true);
    try {
      const res = await fetch('/api/rate');
      if (!res.ok) throw new Error('Kursni yuklab bo\'lmadi');
      const data = await res.json();
      if (data.rate) {
        handleExchangeRateChange(data.rate);
        showToast(`Kurs muvaffaqiyatli yangilandi: 1 USD = ${data.rate} so'm`, 'success');
      } else {
        throw new Error('CBU rate parsing failed');
      }
    } catch (err) {
      showToast('Kursni onlayn olishda xatolik yuz berdi.', 'error');
    } finally {
      setFetchingRate(false);
    }
  };

  // 🆕 Start New Month
  const handleStartNewMonth = () => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Find previous month before the current calendar month
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7);

    // Switch selection to current month
    setSelectedPeriod(currentMonthPrefix);
    
    // Check if there are transactions in previous month to wrap
    const prevMonthTxs = transactions.filter(t => t.date.startsWith(prevMonthPrefix));
    if (prevMonthTxs.length > 0) {
      // Trigger Spotify Wrapped for the previous month!
      setWrapMonthKey(prevMonthPrefix);
      setIsWrapOpen(true);
      showToast('Yangi oy boshlandi! O\'tgan oylik jamlanma wrap yuklandi.', 'success');
    } else {
      showToast('Yangi oy boshlandi! Yuqoridagi kartalar tozalab berildi.', 'success');
    }
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id' | 'charityPercentage'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`,
      charityPercentage,
    };
    const updated = [tx, ...transactions];
    saveTransactions(updated);
    showToast(`Yangi tushum kiritildi (${newTx.currency}).`);
  };

  const handleUpdateTransaction = (id: string, updatedTx: Omit<Transaction, 'id' | 'charityPercentage'>) => {
    const updated = transactions.map((t) =>
      t.id === id ? { ...t, ...updatedTx } : t
    );
    saveTransactions(updated);
    setEditingTransaction(null);
    showToast('Tushum muvaffaqiyatli tahrirlandi.');
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm("Ushbu tushumni ro'yxatdan o'chirmoqchimisiz?")) {
      const updated = transactions.filter((t) => t.id !== id);
      saveTransactions(updated);
      showToast("Kirim ro'yxatdan o'chirildi.", 'info');
      if (editingTransaction?.id === id) setEditingTransaction(null);
    }
  };

  // Convert helpers
  const toUZS = (t: Transaction) => t.currency === 'USD' ? t.amount * exchangeRate : t.amount;
  const toUSD = (t: Transaction) => t.currency === 'UZS' ? t.amount / exchangeRate : t.amount;

  // Filter transactions by selected period
  const periodTransactions = useMemo(() => {
    if (selectedPeriod === 'all') return transactions;
    return transactions.filter(t => t.date.startsWith(selectedPeriod));
  }, [transactions, selectedPeriod]);

  // Totals for filtered period
  const totalUZS = useMemo(() => periodTransactions.reduce((sum, t) => sum + toUZS(t), 0), [periodTransactions, exchangeRate]);
  const totalUSD = useMemo(() => periodTransactions.reduce((sum, t) => sum + toUSD(t), 0), [periodTransactions, exchangeRate]);
  const charityUZS = useMemo(() => (totalUZS * charityPercentage) / 100, [totalUZS, charityPercentage]);
  const charityUSD = useMemo(() => (totalUSD * charityPercentage) / 100, [totalUSD, charityPercentage]);
  const netUZS = useMemo(() => totalUZS - charityUZS, [totalUZS, charityUZS]);
  const netUSD = useMemo(() => totalUSD - charityUSD, [totalUSD, charityUSD]);

  // Calculate comparison with previous month for top cards
  const prevPeriod = useMemo(() => {
    if (selectedPeriod === 'all') return null;
    const [year, month] = selectedPeriod.split('-').map(Number);
    const date = new Date(year, month - 1 - 1, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${prevYear}-${prevMonth}`;
  }, [selectedPeriod]);

  const prevPeriodTransactions = useMemo(() => {
    if (!prevPeriod) return [];
    return transactions.filter(t => t.date.startsWith(prevPeriod));
  }, [transactions, prevPeriod]);

  const prevTotalUZS = useMemo(() => prevPeriodTransactions.reduce((sum, t) => sum + toUZS(t), 0), [prevPeriodTransactions, exchangeRate]);
  const prevCharityUZS = useMemo(() => (prevTotalUZS * charityPercentage) / 100, [prevTotalUZS, charityPercentage]);
  const prevNetUZS = useMemo(() => prevTotalUZS - prevCharityUZS, [prevTotalUZS, prevCharityUZS]);

  const totalComparePct = useMemo(() => {
    if (selectedPeriod === 'all' || prevTotalUZS === 0) return null;
    return ((totalUZS - prevTotalUZS) / prevTotalUZS) * 100;
  }, [totalUZS, prevTotalUZS, selectedPeriod]);

  const charityComparePct = useMemo(() => {
    if (selectedPeriod === 'all' || prevCharityUZS === 0) return null;
    return ((charityUZS - prevCharityUZS) / prevCharityUZS) * 100;
  }, [charityUZS, prevCharityUZS, selectedPeriod]);

  const netComparePct = useMemo(() => {
    if (selectedPeriod === 'all' || prevNetUZS === 0) return null;
    return ((netUZS - prevNetUZS) / prevNetUZS) * 100;
  }, [netUZS, prevNetUZS, selectedPeriod]);

  // Unique list of periods for selector
  const availablePeriods = useMemo(() => {
    const list = Array.from(new Set<string>(transactions.map(t => t.date.slice(0, 7))));
    // Make sure current calendar month is always selectable even if empty
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    if (!list.includes(currentMonthStr)) {
      list.push(currentMonthStr);
    }
    return list.sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const getMonthNameUz = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${MONTH_NAMES[month] || month} ${year}`;
  };

  const monthlyStats = useMemo(() => {
    const groups: { [key: string]: { uzs: number; usd: number; count: number } } = {};
    transactions.forEach((t) => {
      const monthKey = t.date.slice(0, 7);
      if (!groups[monthKey]) groups[monthKey] = { uzs: 0, usd: 0, count: 0 };
      groups[monthKey].uzs += toUZS(t);
      groups[monthKey].usd += toUSD(t);
      groups[monthKey].count += 1;
    });

    const statsList: MonthlyStats[] = Object.keys(groups).map((monthKey) => {
      const [year, month] = monthKey.split('-');
      const monthName = MONTH_NAMES[month] ? `${MONTH_NAMES[month]} ${year}` : monthKey;
      const total = groups[monthKey];
      return {
        monthKey,
        monthName,
        totalUZS: total.uzs,
        totalUSD: total.usd,
        charityUZS: (total.uzs * charityPercentage) / 100,
        charityUSD: (total.usd * charityPercentage) / 100,
        netUZS: total.uzs - (total.uzs * charityPercentage) / 100,
        netUSD: total.usd - (total.usd * charityPercentage) / 100,
        transactionCount: total.count,
      };
    });

    return statsList.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [transactions, charityPercentage, exchangeRate]);

  // Export/Import backup
  const handleExportData = () => {
    const exportData = { transactions, exchangeRate, charityPercentage, incomeGoals };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `savob_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Zaxira fayli yuklab olindi.', 'success');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileReader = new FileReader();
      fileReader.readAsText(files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.transactions && Array.isArray(parsed.transactions)) {
            saveTransactions(parsed.transactions);
            if (parsed.exchangeRate) handleExchangeRateChange(parsed.exchangeRate);
            if (parsed.charityPercentage) handlePercentageChange(parsed.charityPercentage);
            if (parsed.incomeGoals && typeof parsed.incomeGoals === 'object') {
              setIncomeGoals(parsed.incomeGoals);
              if (binId) performSync(parsed.transactions, charityPercentage, exchangeRate, binId, parsed.incomeGoals);
            }
            showToast("Ma'lumotlar fayldan tiklandi!", 'success');
          } else if (Array.isArray(parsed)) {
            saveTransactions(parsed);
            showToast("Ma'lumotlar fayldan tiklandi!", 'success');
          } else {
            alert("Fayl formati mos kelmadi.");
          }
        } catch {
          alert("Faylni o'qishda xatolik yuz berdi.");
        }
      };
    }
  };

  const handleResetData = () => {
    if (confirm("Haqiqatdan ham barcha ma'lumotlarni o'chirib yubormoqchimisiz?")) {
      saveTransactions([]);
      showToast("Barcha ma'lumotlar tozalandi.", 'info');
    }
  };

  // If not logged in, display AuthModal
  if (!binId) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 bg-pattern text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-indigo-950/95 border-indigo-800 text-indigo-50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/95 border-rose-800 text-rose-50'
                : 'bg-slate-900/95 border-slate-700 text-slate-100'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${toastMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`} />
            <span>{toastMessage.text}</span>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200/50"
            >
              <HeartHandshake className="w-5 h-5" />
            </motion.div>
            <div>
              <h1 className="text-base md:text-lg font-black font-display tracking-tight">
                <span className="gradient-text">SAVOB</span> <span className="text-slate-800">APP</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  Ehsan Hisoblagich
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  {syncStatus === 'synced' && (
                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
                      <CloudRain className="w-3.5 h-3.5 animate-pulse" /> Bulutda
                    </span>
                  )}
                  {syncStatus === 'syncing' && (
                    <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-0.5">
                      <CloudLightning className="w-3.5 h-3.5 animate-spin" /> Sinxron...
                    </span>
                  )}
                  {syncStatus === 'error' && (
                    <span className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5">
                      <CloudOff className="w-3.5 h-3.5" /> Offlayn
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 bg-slate-100 border border-slate-200/60 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700">
              <User className="w-4 h-4 text-indigo-500" />
              <span>Parol: {userPassword.slice(0, 3)}***</span>
            </div>

            {/* Detailed Stats Quick Trigger */}
            <button
              onClick={() => setIsStatsOpen(true)}
              className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold"
              title="Batafsil statistika"
            >
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider">Statistika</span>
            </button>

            {/* Personal Min/Max Analysis Trigger */}
            <button
              onClick={() => setIsExtremesOpen(true)}
              className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold"
              title="Shaxsiy tahlil: eng katta / eng kichik / o'rtacha kirim"
            >
              <Gauge className="w-4 h-4 text-slate-600" />
            </button>

            {/* PDF Export Quick Trigger */}
            <button
              onClick={() => setIsExportOpen(true)}
              className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold"
              title="PDF jadval yuklab olish"
            >
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider">PDF Eksport</span>
            </button>

            <button
              onClick={handleExportData}
              className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold"
              title="Zaxira nusxasini yuklab olish"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider">Backup</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold"
              title="Fayldan tiklash"
            >
              <Upload className="w-4 h-4" />
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 transition-all border border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold"
              title="Chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">

        {/* Dashboard Period Selector & Start New Month */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4 bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dashboard hisoboti:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
            >
              <option value="all">Barcha davrlar</option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>{getMonthNameUz(p)}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {/* Start New Month Button */}
            <button
              onClick={handleStartNewMonth}
              className="py-2 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Yangi oy boshlash
            </button>
          </div>
        </div>

        {/* Oylik daromad maqsadi kartasi */}
        {(() => {
          const goalMonthKey =
            selectedPeriod === 'all' ? new Date().toISOString().slice(0, 7) : selectedPeriod;
          return (
            <IncomeGoalCard
              transactions={transactions}
              charityPercentage={charityPercentage}
              exchangeRate={exchangeRate}
              monthKey={goalMonthKey}
              goal={incomeGoals[goalMonthKey] || 0}
              onSetGoal={handleSetIncomeGoal}
            />
          );
        })()}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            id="metric-total"
            title={selectedPeriod === 'all' ? "JAMI JAMG'ARMA (BARCHASI)" : `JAMI DAROMAD (${getMonthNameUz(selectedPeriod).toUpperCase()})`}
            valueUZS={formatUZS(totalUZS)}
            valueUSD={formatUSD(totalUSD)}
            icon={<Wallet className="w-4 h-4" />}
            gradient="bg-gradient-to-r from-indigo-500 to-purple-500"
            iconBg="bg-gradient-to-br from-indigo-500 to-purple-600"
            comparePct={totalComparePct}
            delay={0}
          >
            <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden mt-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1.2, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              />
            </div>
          </MetricCard>

          <MetricCard
            id="metric-charity"
            title={`HAYRIYA (${charityPercentage}%)`}
            valueUZS={formatUZS(charityUZS)}
            valueUSD={formatUSD(charityUSD)}
            icon={<Heart className="w-4 h-4 fill-current" />}
            gradient="bg-gradient-to-r from-amber-400 to-orange-500"
            iconBg="bg-gradient-to-br from-amber-400 to-orange-500"
            comparePct={charityComparePct}
            delay={0.1}
          >
            <p className="text-[10px] font-bold text-amber-500 italic mt-1">
              ❤️ Avtomatik hisoblangan ehson ulushi
            </p>
          </MetricCard>

          <MetricCard
            id="metric-net"
            title="SOF SUMMA"
            valueUZS={formatUZS(netUZS)}
            valueUSD={formatUSD(netUSD)}
            icon={<TrendingUp className="w-4 h-4" />}
            gradient="bg-gradient-to-r from-emerald-400 to-teal-500"
            iconBg="bg-gradient-to-br from-emerald-400 to-teal-500"
            comparePct={netComparePct}
            delay={0.2}
          >
            <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-wider">
              Qo'lga tushuvchi sof miqdor
            </p>
          </MetricCard>
        </div>

        {/* Settings Row: Exchange Rate + Charity Percentage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Exchange Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-3d p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-100">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-800 text-sm">Valyuta kursi</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">1 USD = ? so'm</p>
                </div>
              </div>

              {/* Online Rate fetch button */}
              <button
                onClick={handleOnlineRateFetch}
                disabled={fetchingRate}
                className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-xl text-3xs font-black uppercase tracking-wider flex items-center gap-1 transition-all"
              >
                <ArrowLeftRight className={`w-3 h-3 ${fetchingRate ? 'animate-spin' : ''}`} />
                {fetchingRate ? 'Yuklanmoqda...' : 'Onlayn olish'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => handleExchangeRateChange(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-4 py-3 text-lg font-bold font-display bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">so'm / $1</span>
            </div>
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {[12500, 12700, 12850, 13000, 13200].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleExchangeRateChange(rate)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${
                    exchangeRate === rate
                      ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-100'
                      : 'bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {rate.toLocaleString()}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Charity Percentage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-3d p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-100">
                <Settings2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-800 text-sm">Hayriya foizi</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Ehson ulushi foizini belgilang</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Belgilangan:</span>
              <span className="text-xl font-black font-display text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl">
                {charityPercentage}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={charityPercentage}
              onChange={(e) => handlePercentageChange(parseFloat(e.target.value))}
              className="w-full mb-3"
            />

            <div className="grid grid-cols-3 gap-1.5">
              {[2.5, 5, 10, 15, 20, 25].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePercentageChange(preset)}
                  className={`text-[11px] font-bold py-2 px-1.5 rounded-xl border transition-all text-center ${
                    charityPercentage === preset
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {preset === 2.5 ? '2.5% Zakot' : `${preset}%`}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Form + Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <TransactionForm
              onAdd={handleAddTransaction}
              onUpdate={handleUpdateTransaction}
              editingTransaction={editingTransaction}
              onCancelEdit={() => setEditingTransaction(null)}
              charityPercentage={charityPercentage}
              exchangeRate={exchangeRate}
            />
          </div>
          <div className="lg:col-span-2">
            <MonthlyChart stats={monthlyStats} charityPercentage={charityPercentage} />
          </div>
        </div>

        {/* Transaction History */}
        <div className="w-full">
          <TransactionList
            transactions={transactions}
            onDelete={handleDeleteTransaction}
            onEdit={(t) => {
              setEditingTransaction(t);
              window.scrollTo({ top: 500, behavior: 'smooth' });
            }}
            currentPercentage={charityPercentage}
            exchangeRate={exchangeRate}
          />
        </div>
      </main>

      {/* Modals */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        transactions={transactions}
        exchangeRate={exchangeRate}
      />

      <ExtremesModal
        isOpen={isExtremesOpen}
        onClose={() => setIsExtremesOpen(false)}
        transactions={transactions}
        exchangeRate={exchangeRate}
      />

      <ExportPDFModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        transactions={transactions}
        exchangeRate={exchangeRate}
      />

      <MonthlyWrapModal
        isOpen={isWrapOpen}
        onClose={() => setIsWrapOpen(false)}
        transactions={transactions}
        monthKey={wrapMonthKey}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
