import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Allow the CatalogsPage to fetch markdown from docs/ in dev.
  // In production, the FastAPI backend serves these via /api/v1/catalogs/raw.
  publicDir: false,                              // we mount docs/ ourselves
  server: {
    // Serve markdown files from repo root (one level up) in dev. The
    // CatalogsPage tries /api/v1/catalogs/raw first, then falls back to
    // GET /<path>; this lets the fallback work without the backend.
    fs: {
      allow: [resolve(__dirname, '..')],
    },
    // Allow demo tunnels (cloudflared, ngrok) to reach the dev server.
    // Vite blocks unknown Host headers by default for security.
    allowedHosts: [
      'localhost',
      '.trycloudflare.com',
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok.app',
    ],
    proxy: {
      // Proxy all /api/* requests to the FastAPI backend to avoid CORS
      // during dev. salesApi.js uses relative paths so this just works.
      // Override in local dev by setting BEV_API_TARGET env var.
      '/api': {
        // 'backend' is the docker-compose service name; resolves on the insur_default network.
        // Override with BEV_API_TARGET for non-docker dev (e.g., http://localhost:8000).
        target: process.env.BEV_API_TARGET || 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Split heavy deps into separate chunks so initial page-load stays small.
    // Without this, ChartShowcase + PhaseDetailPage pull in 6MB+ of vendor JS
    // into the initial bundle.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // React core — stable, cache-friendly across deploys.
          if (id.includes('react/') || id.includes('react-dom/')) return 'react';
          // Routing — used everywhere but small.
          if (id.includes('react-router')) return 'router';
          // Markdown render — used on CatalogsPage + PhaseDetailPage.
          if (id.includes('react-markdown') || id.includes('micromark') || id.includes('mdast') || id.includes('hast-')) return 'markdown';
          // Recharts — used in ChartShowcase, PhaseDetailPage Dashboard, and dept tabs.
          if (id.includes('recharts') || id.includes('d3-')) return 'recharts';
          // Plotly — heavyweight; used only on ChartShowcase (Sankey, Boxplot).
          if (id.includes('plotly') || id.includes('react-plotly')) return 'plotly';
          // ECharts — heavyweight; used only on ChartShowcase (Heatmap, Gauge).
          if (id.includes('echarts')) return 'echarts';
          // Leaflet + react-leaflet — geo map on ChartShowcase.
          if (id.includes('leaflet')) return 'leaflet';
          // PDF export — used on PhaseDetailPage Report tab; loaded via
          // dynamic import() so will become its own chunk automatically,
          // but bucket here for predictable naming.
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-export';
          // Wordcloud — d3-cloud is small, keep with recharts bucket via
          // the d3- prefix match above.
        },
      },
    },
    // With splitting, individual chunks fit more cleanly. The main index is
    // still ~1.2 MB pre-gzip (~300 KB gzip) because 14 depts × 17 tabs share
    // the initial bundle. Further optimization would use React.lazy on the
    // per-dept tab routes — deferred to Phase 3b. For now: 1500 suppresses
    // the noise without hiding a real regression.
    chunkSizeWarningLimit: 1500,
  },
});
