import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Atelier Shooting — port 3001 (atelier-social occupe le 3000 par défaut Next.js).
// La clé Gemini est lue côté client via import.meta.env.VITE_GEMINI_API_KEY (apps/atelier-shooting/.env.local).
export default defineConfig({
  server: {
    port: 3001,
    host: 'localhost',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
