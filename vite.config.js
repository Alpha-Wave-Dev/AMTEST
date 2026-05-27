import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Dev-server middleware that mirrors the Vercel /api/claude function locally,
// so `ANTHROPIC_API_KEY=sk-... npm run dev` Just Works.
const claudeProxyDevPlugin = {
  name: 'claude-proxy-dev',
  configureServer(server) {
    server.middlewares.use('/api/claude', async (req, res, next) => {
      if (req.method !== 'POST') return next();
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY env var not set on dev server' }));
        return;
      }
      let body = '';
      for await (const chunk of req) body += chunk;
      try {
        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body,
        });
        const text = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(text);
      } catch (e) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  },
};

// `vite build --mode preview` → self-contained preview/index.html for raw.githack hosting.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'preview'
    ? [react(), viteSingleFile()]
    : [react(), claudeProxyDevPlugin],
  build: mode === 'preview'
    ? {
        outDir: 'preview',
        emptyOutDir: true,
        assetsInlineLimit: 100000000,
        cssCodeSplit: false,
        rollupOptions: { inlineDynamicImports: true },
      }
    : {},
}))
