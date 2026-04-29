import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Atelier Shooting — port 3001 (atelier-social occupe le 3000 par défaut Next.js).
// La clé Gemini est lue côté client via import.meta.env.VITE_GEMINI_API_KEY (apps/atelier-shooting/.env.local).
//
// Alias @hub : pointe vers la racine du repo monorepo pour permettre les imports JSON
// depuis referentiels/ et assets_produits/ sans dupliquer la donnée.
// server.fs.allow autorise Vite à servir/résoudre des fichiers au-dessus de la racine de l'app.
export default defineConfig({
  server: {
    port: 3001,
    host: 'localhost',
    fs: {
      allow: ['..', '../..']
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@hub': path.resolve(__dirname, '../..')
    }
  }
});
