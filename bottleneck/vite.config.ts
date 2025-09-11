import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import electron from 'vite-plugin-electron/simple';
import path from 'path';

export default defineConfig(() => ({
  root: 'src/renderer',
  base: '',
  plugins: [
    react(),
    electron({
      main: { entry: 'src/main/index.ts' },
      preload: { input: { preload: 'src/preload/index.ts' } }
    })
  ],
  server: { port: 5173, strictPort: true },
  build: { outDir: '../../dist/renderer', emptyOutDir: true },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@preload': path.resolve(__dirname, 'src/preload')
    }
  }
}));
