import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv('production', process.cwd(), ''),
    ...loadEnv(mode, process.cwd(), ''),
    ...process.env,
  };

  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://imwoiysafmrntfidbezu.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_9UhRjCuJFgLclCClG4MCOQ_qLVi2zEI';
  const mathbotUrl = process.env.VITE_MATHBOT_URL || env.VITE_MATHBOT_URL || 'https://vutrutoanhoctest4.vercel.app/api/mathbot';

  return {
    base: '/vutrutoanhoctest5/',
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabaseKey),
      'import.meta.env.VITE_MATHBOT_URL': JSON.stringify(mathbotUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
