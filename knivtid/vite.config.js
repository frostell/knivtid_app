import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base public path - important for Tauri asset loading
  base: './',
  
  // Specify the correct entry point
  root: resolve(__dirname, 'src'),
  
  // Build configuration
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'esnext'
  },
  
  // Ensure Vite resolves properly
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // Server configuration for development
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Ensure file changes are detected
      usePolling: true,
      interval: 1000
    }
  }
}); 