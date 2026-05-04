import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/v1': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY || '');
              proxyReq.setHeader('anthropic-version', '2023-06-01');
              proxyReq.setHeader('anthropic-beta', 'web-search-2025-03-05');
            });
          },
        },
      },
    },
  }
})
