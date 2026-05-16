import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ai-orchestra fixture: empty-js
// Minimal Vite config that triggers the js-ts pack's vite.md rule via the
// `vite.config.ts` detection signal. Not actually executed.
export default defineConfig({
  plugins: [react()],
});
