/**
 * SAVOB APP — service worker.
 *
 * Ikki vazifasi bor:
 *   1) Ilova internetsiz ham ochilsin
 *   2) Saytga yangi versiya chiqqanda u telefonga YETIB BORSIN
 *
 * Ikkinchisi muhim: noto'g'ri yozilgan service worker foydalanuvchini eski
 * versiyada abadiy qoldirib qo'yadi. Shu sababli HTML har doim avval
 * tarmoqdan olinadi, kesh esa faqat tarmoq yo'q bo'lganda ishlaydi.
 *
 * VERSION o'zgarganda eski keshlar o'chiriladi. Uni build vaqtida
 * vite.config.ts dagi plagin joylaydi — shu sababli har yangi deploy'da
 * bu fayl ham o'zgaradi va brauzer yangilanishni sezadi.
 */
const VERSION = '__BUILD_ID__';
const SHELL = `savob-shell-${VERSION}`;
const ASSETS = `savob-assets-${VERSION}`;

self.addEventListener('install', (event) => {
  // Ilova qobig'ini oldindan keshlaymiz, shunda birinchi oflayn ochilish ishlaydi
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.add(new Request('/', { cache: 'reload' })))
  );
  // skipWaiting() bu yerda ATAYLAB chaqirilmaydi: yangi versiya foydalanuvchi
  // "Yangilash" tugmasini bosganda o'rnatiladi, ish o'rtasida sahifa
  // to'satdan almashib ketmaydi.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('savob-') && !k.endsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Sahifadan "yangi versiyaga o't" degan buyruq
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Tashqi manbalar (shriftlar va h.k.) — brauzerning o'zi hal qiladi
  if (url.origin !== self.location.origin) return;

  // Sinxronlash va valyuta kursi — HECH QACHON keshlanmaydi.
  // Aks holda ilova eski ma'lumotni ko'rsatib, yangisini yozib yuborardi.
  if (url.pathname.startsWith('/api/')) return;

  // HTML: avval tarmoq → yangi versiya darhol keladi.
  // Tarmoq yo'q bo'lsa keshdagi nusxa ishlatiladi.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL);
          cache.put('/', fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(SHELL);
          const hit = await cache.match('/');
          if (hit) return hit;
          return new Response('Oflayn — ilova hali keshlanmagan.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  // /assets/* — Vite fayl nomiga xesh qo'shadi, ya'ni mazmuni hech qachon
  // o'zgarmaydi. Shuning uchun keshdan berish xavfsiz va tez.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })()
    );
    return;
  }

  // Qolganlari (ikonka, manifest): keshdan darhol beramiz,
  // orqa fonda yangi nusxani olib qo'yamiz.
  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSETS);
      const hit = await cache.match(req);
      const net = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      return hit || (await net) || Response.error();
    })()
  );
});
