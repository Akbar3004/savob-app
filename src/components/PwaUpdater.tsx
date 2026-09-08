import React, { useEffect, useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';

/**
 * Service worker'ni ro'yxatdan o'tkazadi va yangi versiya chiqqanda
 * pastda kichik chiziq ko'rsatadi.
 *
 * Nima uchun avtomatik yangilanmaydi: siz summa kiritayotgan payt sahifa
 * o'z-o'zidan qayta yuklansa, yozayotganingiz yo'qoladi. Shuning uchun
 * qaror sizga qoldiriladi — "Yangilash" bosilganda yangi versiya o'rnatiladi.
 */
export const PwaUpdater: React.FC = () => {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Lokal ishlab chiqishda service worker keraksiz (va keshi xalaqit beradi)
    if (import.meta.env.DEV) return;

    let reg: ServiceWorkerRegistration | null = null;
    let cancelled = false;

    const watchInstalling = (r: ServiceWorkerRegistration) => {
      const sw = r.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        // "installed" + eski worker hali boshqarayotgan bo'lsa => yangi versiya tayyor
        if (sw.state === 'installed' && navigator.serviceWorker.controller && !cancelled) {
          setWaiting(sw);
        }
      });
    };

    navigator.serviceWorker
      // updateViaCache: 'none' — brauzer sw.js ning o'zini keshlab qo'ymasin,
      // aks holda yangi versiyani sezmay qolardi
      .register('/sw.js', { updateViaCache: 'none' })
      .then((r) => {
        if (cancelled) return;
        reg = r;
        if (r.waiting && navigator.serviceWorker.controller) setWaiting(r.waiting);
        watchInstalling(r);
        r.addEventListener('updatefound', () => watchInstalling(r));
      })
      .catch(() => {
        /* ro'yxatdan o'tmasa ilova oddiy sayt sifatida ishlayveradi */
      });

    // Yangi versiya o'rnatilgach sahifani qayta yuklaymiz
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Ilova ekranga qaytganda yangilanish bor-yo'qligini tekshiramiz —
    // telefonda ilova haftalab ochiq turishi mumkin
    const onVisible = () => {
      if (document.visibilityState === 'visible') reg?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="mx-auto max-w-md flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl pointer-events-auto">
        <Download className="w-4 h-4 text-indigo-300 shrink-0" />
        <p className="flex-1 min-w-0 text-[12px] font-semibold text-slate-100 leading-snug">
          Yangi versiya tayyor
        </p>
        <button
          onClick={() => {
            setBusy(true);
            waiting.postMessage('SKIP_WAITING');
          }}
          disabled={busy}
          className="shrink-0 flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white text-[11px] font-bold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Yuklanmoqda' : 'Yangilash'}
        </button>
      </div>
    </div>
  );
};
