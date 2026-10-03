import { defineConfig, type UserConfig } from 'vite';
import { readFileSync } from 'fs';

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({ mode }): UserConfig => {
  const offlineSinglePlayer = mode === 'offline';

  return {
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __OFFLINE_SINGLE_PLAYER__: JSON.stringify(offlineSinglePlayer),
    },

    // A relative base makes the generated package portable under any static
    // server path. The post-build step also rewrites legacy root asset URLs.
    base: offlineSinglePlayer ? './' : '/',

  // Development server settings
  server: {
    port: 3030,
    open: false,
  },

  preview: {
    port: 3030,
    open: false,
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
    outDir: offlineSinglePlayer ? 'dist-offline' : 'dist',
    chunkSizeWarningLimit: 600,
    // Asset handling
    assetsDir: 'assets',
    // Source maps for debugging
    sourcemap: offlineSinglePlayer ? false : true,
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
      '@shared': '/shared',
    },
  },
  };
});
