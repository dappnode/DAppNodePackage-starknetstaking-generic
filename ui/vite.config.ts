import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  // Get the RPC URL for proxy target
  const rpcTarget = env.VITE_RPC_PROXY_TARGET || 'http://execution.starknet-sepolia.dncore.dappnode:6060';

  return {
    server: {
      port: 3003,
      host: '0.0.0.0',
      proxy: {
        // Proxy /rpc requests to the actual Starknet RPC
        '/rpc': {
          target: rpcTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/rpc/, ''),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
