# SAVOB APP — Kunlik Jamg'arma va Hayriya

Kunlik daromadlarni kiritish, jamg'armani kuzatish, belgilangan foizda hayriya (ehson) summasini avtomatik hisoblash va oylik statistika ilovasi.

## Imkoniyatlar

- 💰 UZS va USD valyutalarida tushumlarni kiritish
- ❤️ Hayriya foizini belgilash (2.5% zakotdan 50% gacha) va avtomatik hisoblash
- 📊 Oylik ustunli grafik va batafsil statistika (kunlik, haftalik, oylik, maxsus davr)
- 📄 PDF hisobot eksporti (jsPDF)
- ✨ "Savob Wrapped" — oylik jamlanma kartasi
- ☁️ Parol asosida **doimiy** bulutda sinxronlash (Upstash Redis) — ma'lumot o'chib ketmaydi
- 📴 localStorage kesh: oflayn ishlaydi, tarmoq tiklanganda avtomatik qayta yuboradi (hech qachon yo'qolmaydi)
- 💱 O'zbekiston Markaziy banki (CBU) dan jonli USD kursi
- 🧾 Oylik to'lov kursi: daromad ishlangan oydan keyin to'langani uchun har bir
  ish oyi o'z to'lov kursi bilan hisoblanadi. Kurs kiritilgach o'sha oyning
  hisoblari qotib qoladi; kiritilmagan oylar "taxminiy" deb belgilanadi
- 🎯 AdSense tuzatishi: YouTube Studio taxminiy raqam ko'rsatadi, AdSense'ga esa
  qayta hisoblangan boshqa summa keladi. Haqiqiy summani kiritsangiz, farq barcha
  kanallarga bir xil foizda taqsimlanadi va ehson/sof foyda qayta hisoblanadi
  (kunlik yozuvlarga tegilmaydi)
- ⏳ To'lov ikki bosqichda kiritiladi, chunki ular turli vaqtda ma'lum bo'ladi:
  avval AdSense'ga tushgan summa, keyinroq bankdan yechilgandagi kurs. Har biri
  mustaqil — birini kiritib, ikkinchisini keyin qo'shsa bo'ladi

## Texnologiyalar

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Motion (animatsiyalar), Lucide (ikonkalar)
- Vercel Serverless Functions (`api/`)
- Upstash Redis (Vercel KV) — doimiy ma'lumotlar ombori

## Ma'lumotlar ombori (muhim)

Ilova ma'lumotni **Upstash Redis** (Vercel KV) da saqlaydi. Bu bepul va
doimiy — kalitlar muddati o'tib o'chib ketmaydi.

> Ilgari `jsonblob.com` ishlatilgan edi; u 30 kun tegilmagan yozuvlarni
> o'chirib yuborardi, shu sabab bir muddatdan keyin ma'lumotlar saqlanmay
> qolar edi. Endi bu muammo bartaraf etilgan.

### Vercel'da sozlash (bir marta)

1. Vercel loyihasida **Storage** bo'limiga o'ting.
2. **Upstash for Redis** (yoki **KV**) ni yarating va loyihaga **Connect** qiling.
3. Vercel kerakli muhit o'zgaruvchilarini (`KV_REST_API_URL`,
   `KV_REST_API_TOKEN`) avtomatik qo'shadi.
4. Loyihani qayta **Deploy** qiling.

Ombor ulanmasa, API `503` bilan tushunarli xabar qaytaradi (ilova esa
localStorage'dagi mahalliy nusxadan ishlashda davom etadi).

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

So'ng yuqoridagi **"Ma'lumotlar ombori"** bo'limiga ko'ra Upstash Redis
(Vercel KV) ni ulang — bu yagona bir martalik sozlash.
