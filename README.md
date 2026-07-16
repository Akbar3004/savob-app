# SAVOB APP — Kunlik Jamg'arma va Hayriya

Kunlik daromadlarni kiritish, jamg'armani kuzatish, belgilangan foizda hayriya (ehson) summasini avtomatik hisoblash va oylik statistika ilovasi.

## Imkoniyatlar

- 💰 UZS va USD valyutalarida tushumlarni kiritish
- ❤️ Hayriya foizini belgilash (2.5% zakotdan 50% gacha) va avtomatik hisoblash
- 📊 Oylik ustunli grafik va batafsil statistika (kunlik, haftalik, oylik, maxsus davr)
- 📄 PDF hisobot eksporti (jsPDF)
- ✨ "Savob Wrapped" — oylik jamlanma kartasi
- ☁️ Parol asosida bulutda sinxronlash (localStorage kesh bilan oflayn ham ishlaydi)
- 💱 O'zbekiston Markaziy banki (CBU) dan jonli USD kursi

## Texnologiyalar

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Motion (animatsiyalar), Lucide (ikonkalar)
- Vercel Serverless Functions (`api/`)

## Lokal ishga tushirish

```bash
npm install
npm run dev
```

Ilova http://localhost:3000 da ochiladi.

> Eslatma: `api/` papkasidagi serverless funksiyalar (bulut sinxronlash va valyuta kursi) Vercel muhitida ishlaydi. Lokal rejimda ular uchun `vercel dev` dan foydalaning.

## Vercel'ga joylash

```bash
vercel
```

Hech qanday muhit o'zgaruvchisi (env) talab qilinmaydi.
