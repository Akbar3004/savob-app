import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, ShieldAlert, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { hashPassword, checkPasswordExists, registerUser, loadUserData } from '../services/db';
import { Transaction } from '../types';

interface AuthModalProps {
  onSuccess: (
    binId: string,
    data: { transactions: Transaction[]; charityPercentage: number; exchangeRate: number },
    passwordPlain: string
  ) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 4) {
      setError("Parol kamida 4 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    if (activeTab === 'register' && password !== confirmPassword) {
      setError('Parollar bir-biriga mos kelmadi.');
      return;
    }

    setLoading(true);

    try {
      const hashed = await hashPassword(password);

      if (activeTab === 'login') {
        const binId = await checkPasswordExists(hashed);
        if (!binId) {
          setError("Ushbu parol ro'yxatdan o'tmagan. Avval ro'yxatdan o'ting.");
          setLoading(false);
          return;
        }

        const data = await loadUserData(binId);
        if (!data) {
          setError("Ma'lumotlarni yuklab olishda xatolik yuz berdi.");
          setLoading(false);
          return;
        }

        setSuccess("Tizimga muvaffaqiyatli kirildi! Yuklanmoqda...");
        setTimeout(() => {
          onSuccess(binId, data, password);
        }, 1000);
      } else {
        // Register
        const binIdExists = await checkPasswordExists(hashed);
        if (binIdExists) {
          setError("Ushbu parol allaqachon band. Iltimos, boshqa parol tanlang.");
          setLoading(false);
          return;
        }

        // Create with some initial transactions
        const initialData = {
          transactions: [],
          charityPercentage: 10,
          exchangeRate: 12850,
        };

        const binId = await registerUser(hashed, initialData);
        if (!binId) {
          setError("Ro'yxatdan o'tishda xatolik yuz berdi. Qayta urinib ko'ring.");
          setLoading(false);
          return;
        }

        setSuccess("Yangi hisob muvaffaqiyatli yaratildi!");
        setTimeout(() => {
          onSuccess(binId, initialData, password);
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      setError("Server bilan aloqada xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-lg">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="card-3d max-w-md w-full p-8 relative overflow-hidden bg-white/95 border border-white/50 shadow-2xl"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Background gradient bubble */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <motion.div
            animate={{ rotate: loading ? 360 : 0 }}
            transition={{ repeat: loading ? Infinity : 0, duration: 2, ease: 'linear' }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200/50 mb-4"
          >
            {loading ? <RefreshCw className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </motion.div>
          <h2 className="text-xl font-black font-display tracking-tight text-slate-800">
            SAVOB <span className="text-indigo-600">APPLET</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Ma'lumotlaringizni xavfsiz saqlash va sinxronlash
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 relative z-10 border border-slate-200/60">
          <button
            onClick={() => {
              setActiveTab('login');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'login'
                ? 'bg-white text-indigo-600 shadow-md'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Kirish
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'register'
                ? 'bg-white text-indigo-600 shadow-md'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Yangi hisob
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 relative z-10">
          <div>
            <label className="block text-2xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Parol
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolingizni kiriting"
                disabled={loading}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {activeTab === 'register' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-2xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Parolni tasdiqlash
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Parolni qayta kiriting"
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-300"
              />
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-semibold text-rose-500 leading-normal"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] font-semibold text-emerald-600 leading-normal"
              >
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100/50 hover:shadow-indigo-200/60 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Tekshirilmoqda...' : activeTab === 'login' ? 'Kirish' : 'Hisobni yaratish'}
          </button>
        </form>

        <div className="mt-6 text-center text-[10px] text-slate-400 font-semibold leading-relaxed border-t border-slate-100 pt-4 relative z-10">
          ⚠️ Eslatma: Parolni unutmang! Parollar bir-biriga mos tushmasligi uchun murakkab parol tanlash tavsiya etiladi.
        </div>
      </motion.div>
    </div>
  );
};
