import { defineConfig } from 'vite';

export default defineConfig({
  root: './src/dashboard',
  base: './', // GitHub Pages 배포를 위한 상대 경로 설정
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    // 최적화 설정
    minify: 'terser',
    sourcemap: false,
    cssCodeSplit: false
  },
  server: {
    port: 5173,
    open: true
  }
});
