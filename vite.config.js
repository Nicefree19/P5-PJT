import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

/**
 * P5 Dashboard Vite Configuration
 * WP-4: 번들러 최적화 설정
 * WP-9-5: PWA 지원 추가
 *
 * 목표:
 * - 프로덕션 번들 < 150KB (WP-1-A/B 완료 후)
 * - Gzip/Brotli 압축 지원
 * - 코드 스플리팅 준비
 * - 번들 분석 도구
 * - PWA 오프라인 지원
 */
export default defineConfig(({ mode }) => ({
  root: './src/dashboard',
  base: './', // GitHub Pages 상대 경로

  // 개발 서버 설정
  server: {
    port: 5173,
    open: true,
    // HMR 최적화
    hmr: {
      overlay: true
    }
  },

  // 미리보기 서버 (빌드 결과물 테스트)
  preview: {
    port: 4173,
    open: true
  },

  // 빌드 최적화
  build: {
    outDir: '../../dist',
    emptyOutDir: true,

    // Terser 압축 (최고 압축률)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // 프로덕션에서 console.log 제거
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : []
      },
      mangle: {
        safari10: true // Safari 10 호환성
      },
      format: {
        comments: false // 주석 제거
      }
    },

    // 소스맵 설정
    sourcemap: mode !== 'production', // 프로덕션에서는 비활성화

    // CSS 최적화
    cssCodeSplit: true, // CSS 코드 스플리팅 활성화
    cssMinify: true,

    // 청크 크기 경고 임계값
    chunkSizeWarningLimit: 500, // 500KB

    // Rollup 옵션
    rollupOptions: {
      output: {
        // 청크 파일 분리 전략
        manualChunks: (id) => {
          // Alpine.js 분리 (CDN 사용 시 해당 없음)
          // if (id.includes('alpinejs')) return 'alpine';

          // 유틸리티 모듈 분리
          if (id.includes('/js/utils/')) return 'utils';

          // 스토어 모듈 분리
          if (id.includes('/js/stores/')) return 'stores';

          // API/Auth 모듈 분리
          if (id.includes('/js/api') || id.includes('/js/auth') || id.includes('/js/sync')) {
            return 'api';
          }
        },

        // 에셋 파일명 패턴
        assetFileNames: (assetInfo) => {
          // CSS 파일
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          // 폰트 파일
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          // 이미지 파일
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },

        // JS 청크 파일명
        chunkFileNames: 'assets/js/[name]-[hash].js',

        // 진입점 파일명
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },

    // 모듈 사전 로드 폴리필
    modulePreload: {
      polyfill: true
    },

    // 빌드 대상 브라우저 (최신 브라우저 최적화)
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']
  },

  // 플러그인
  plugins: [
    // 정적 파일 복사
    viteStaticCopy({
      targets: [
        {
          src: 'data/*',
          dest: 'data'
        },
        {
          src: 'js/*',
          dest: 'js'
        },
        {
          src: 'css/*',
          dest: 'css'
        },
        // PWA 파일
        {
          src: 'manifest.json',
          dest: '.'
        },
        {
          src: 'sw.js',
          dest: '.'
        },
        {
          src: 'assets/**/*',
          dest: 'assets'
        }
      ]
    }),

    // Gzip 압축 (프로덕션 빌드)
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // 1KB 이상 파일만 압축
      deleteOriginFile: false,
      verbose: true
    }),

    // Brotli 압축 (더 높은 압축률)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
      verbose: true
    }),

    // 번들 분석 (npm run build:analyze)
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap' // sunburst, treemap, network
    })
  ].filter(Boolean),

  // 최적화 설정
  optimizeDeps: {
    // 사전 번들링할 의존성
    include: [
      // Alpine.js는 CDN으로 로드하므로 제외
    ],
    // 제외할 의존성
    exclude: []
  },

  // esbuild 설정 (개발 모드 빠른 변환)
  esbuild: {
    // 프로덕션에서 console/debugger 제거
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // 법적 주석 유지
    legalComments: 'none'
  },

  // 환경 변수 접두사
  envPrefix: 'P5_'
}));
