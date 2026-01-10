import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  // Development server settings
  server: {
    port: 3000,
    open: true,
  },

  // Build settings
  build: {
    // Preserve class names for save file compatibility
    minify: 'terser',
    terserOptions: {
      keep_classnames: true,
      keep_fnames: true,
    },
    // Output directory
    outDir: 'dist',
    // Asset handling
    assetsDir: 'assets',
    // Source maps for debugging
    sourcemap: true,
  },

  // CSS settings (LESS support is built-in)
  css: {
    preprocessorOptions: {
      less: {
        // Enable source maps
        sourceMap: true,
      },
    },
  },

  // Resolve settings
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
