import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * sw.js ga build belgisini joylaydi.
 *
 * Sababi: brauzer service worker'ni faqat FAYL MAZMUNI o'zgarganda yangi deb
 * biladi. sw.js esa statik fayl — har deploy'da bir xil qolardi. Natijada
 * "Yangi versiya tayyor" xabari hech qachon chiqmasdi.
 *
 * Belgi build natijasidagi fayl nomlaridan olinadi (ular mazmun xeshi bilan
 * ataladi). Ya'ni hech narsa o'zgarmasa — belgi ham o'zgarmaydi va keraksiz
 * yangilanish so'ralmaydi.
 */
function serviceWorkerBuildId(): Plugin {
  return {
    name: 'savob-sw-build-id',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (!fs.existsSync(swPath)) return;

      const assetsDir = path.resolve(__dirname, 'dist/assets');
      const names = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).sort().join('|') : '';
      const id = crypto.createHash('sha256').update(names).digest('hex').slice(0, 12);

      const src = fs.readFileSync(swPath, 'utf8');
      if (!src.includes('__BUILD_ID__')) {
        this.warn('sw.js ichida __BUILD_ID__ topilmadi — yangilanish xabari ishlamasligi mumkin');
        return;
      }
      fs.writeFileSync(swPath, src.replace('__BUILD_ID__', id));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorkerBuildId()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
