import React from 'react';

/**
 * SOKIN SUV — sahifaning orqa foni.
 *
 * To'rtta katta yorug'lik dog'i 54–89 soniyada bir aylanadi. Qimirlashini
 * faqat to'xtab qarasangiz sezasiz — bu ataylab shunday: ilova har kuni
 * ochiladi va fon raqamlar bilan diqqat talashmasligi kerak.
 *
 * Nega bu kerak: ilovadagi kartalar allaqachon muzli shisha
 * (backdrop-filter: blur), lekin orqasida tekis oq fon turgani uchun
 * xiralashtiradigan narsaning o'zi yo'q edi. Endi bor.
 *
 * `position: fixed` + `z-index: -1` — sahifa bilan birga siljimaydi va
 * hamma kontentning ORQASIDA qoladi. Shu sababli ilovaning ildiz
 * div'idan `bg-slate-50` olib tashlangan: aks holda u fonni yopib qo'yardi.
 */
export const WaterBackground: React.FC = () => (
  <div className="water-bg" aria-hidden="true">
    <span className="water-blob water-blob-1" />
    <span className="water-blob water-blob-2" />
    <span className="water-blob water-blob-3" />
    <span className="water-blob water-blob-4" />
  </div>
);
