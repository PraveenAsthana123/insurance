import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { gzipSync } from 'zlib';

// Negotiate gzip with the client (Accept-Encoding) and send compressed bytes
// when supported. The blueprint is 8 MB raw, ~242 KB gzipped → 33× page-load win.
function maybeGzip(req, res, raw) {
  const accept = (req.headers['accept-encoding'] || '').toString();
  if (accept.includes('gzip')) {
    const gz = gzipSync(raw, { level: 6 });
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Length', String(gz.length));
    res.end(gz);
  } else {
    res.end(raw);
  }
}

// ETag-based 304 negotiation. Lets the browser short-circuit subsequent
// loads with a 304 (no body) when the file hasn't changed.  This is huge
// for SPA nav: bounce out + back = 0 byte transfer if cron hasn't touched
// the file. Uses mtime + size (cheap, no hash) — collision-safe enough
// for dev because mtime changes on every write.
function sendWithETag(req, res, path, payload, contentType) {
  const stat = statSync(path);
  const etag = `W/"${stat.size}-${stat.mtimeMs}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Vary', 'Accept-Encoding');
  // Allow brief cache so multiple components in the same render don't
  // each hit the network — but force revalidation after 30s.
  res.setHeader('Cache-Control', 'private, max-age=30, must-revalidate');
  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }
  maybeGzip(req, res, payload);
}

// Tiny middleware: maps /insurance-data/* (browser) → <root>/data/insurance/*
// (filesystem). Lets the InsuranceCatalogPage download multi-format sample
// files emitted by config/build_insurance_catalog.py without copying them
// into frontend/public. Production: FastAPI serves the same path via
// backend/api/insurance_data.py (or nginx alias if static).
const insuranceDataServer = () => ({
  name: 'insurance-data-server',
  configureServer(server) {
    const dataRoot = resolve(__dirname, '..', 'data', 'insurance');
    const mime = {
      '.csv': 'text/csv; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.xml': 'application/xml; charset=utf-8',
      '.txt': 'text/plain; charset=utf-8',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    server.middlewares.use('/insurance-data', (req, res, next) => {
      try {
        // /insurance-data/<dept>/<file.ext>
        const rel = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '');
        if (!rel || rel.includes('..')) return next();
        const full = resolve(dataRoot, rel);
        if (!full.startsWith(dataRoot)) return next();   // path-traversal guard
        if (!existsSync(full) || !statSync(full).isFile()) return next();
        const ext = '.' + full.split('.').pop().toLowerCase();
        res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${full.split('/').pop()}"`);
        // gzip text-ish payloads only; skip pre-compressed binary
        const compressible = new Set(['.csv', '.json', '.txt', '.md', '.html', '.xml', '.svg']);
        if (compressible.has(ext)) {
          res.setHeader('Vary', 'Accept-Encoding');
          maybeGzip(req, res, readFileSync(full));
        } else {
          res.end(readFileSync(full));
        }
      } catch (e) {
        next(e);
      }
    });
  },
});

// Tiny middleware: maps /insurance-audit/* (browser) → <root>/jobs/reports/insurance/*
// (filesystem). Lets InsurancePage render the hourly audit JSON written by
// scripts/insurance_alignment_audit.py without staging it into public/.
// Production: FastAPI is expected to serve the same path; for now the
// fetch in InsurancePage degrades gracefully when the file is missing.
const insuranceAuditServer = () => ({
  name: 'insurance-audit-server',
  configureServer(server) {
    const auditRoot = resolve(__dirname, '..', 'jobs', 'reports', 'insurance');
    server.middlewares.use('/insurance-audit', (req, res, next) => {
      try {
        const rel = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '');
        if (!rel || rel.includes('..')) return next();
        const full = resolve(auditRoot, rel);
        if (!full.startsWith(auditRoot)) return next();
        if (!existsSync(full) || !statSync(full).isFile()) return next();
        const ext = '.' + full.split('.').pop().toLowerCase();
        const mime = { '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };
        sendWithETag(req, res, full, readFileSync(full), mime[ext] || 'application/octet-stream');
      } catch (e) {
        next(e);
      }
    });
  },
});

// Tiny middleware: serves <root>/data/insurance/blueprint.json inline (not
// as attachment) at /insurance-blueprint. Distinct from /insurance-data
// which forces Content-Disposition: attachment for sample-file downloads.
const insuranceBlueprintServer = () => ({
  name: 'insurance-blueprint-server',
  configureServer(server) {
    const blueprintPath = resolve(__dirname, '..', 'data', 'insurance', 'blueprint.json');
    server.middlewares.use('/insurance-blueprint', (req, res, next) => {
      try {
        if (!existsSync(blueprintPath) || !statSync(blueprintPath).isFile()) return next();
        sendWithETag(req, res, blueprintPath, readFileSync(blueprintPath), 'application/json; charset=utf-8');
      } catch (e) {
        next(e);
      }
    });
  },
});

// Serves the three operator-editable state files (capability_status.json,
// maturity_state.json, implementation_state.json) at /insurance-state/<file>.
const insuranceStateServer = () => ({
  name: 'insurance-state-server',
  configureServer(server) {
    const stateRoot = resolve(__dirname, '..', 'data', 'insurance');
    const allowed = new Set([
      'capability_status.json',
      'maturity_state.json',
      'implementation_state.json',
    ]);
    server.middlewares.use('/insurance-state', (req, res, next) => {
      try {
        const rel = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '');
        if (!allowed.has(rel)) return next();
        const full = resolve(stateRoot, rel);
        if (!full.startsWith(stateRoot)) return next();
        if (!existsSync(full) || !statSync(full).isFile()) return next();
        sendWithETag(req, res, full, readFileSync(full), 'application/json; charset=utf-8');
      } catch (e) {
        next(e);
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), insuranceDataServer(), insuranceAuditServer(), insuranceBlueprintServer(), insuranceStateServer()],
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
