#!/usr/bin/env node
import { build, context } from 'esbuild';
import tailwindcss from '@tailwindcss/vite';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { build as viteBuild } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const projectRoot = path.resolve(root, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');
const watchMode = process.argv.includes('--watch');

const entryPoints = {
  background: path.join(srcDir, 'background.ts'),
  devtools: path.join(srcDir, 'devtools.ts'),
  drawer: path.join(srcDir, 'drawer.ts'),
  'content-bridge': path.join(srcDir, 'content-bridge.ts')
};

async function copyStatic() {
  await mkdir(distDir, { recursive: true });
  await cp(path.join(root, 'manifest.json'), path.join(distDir, 'manifest.json'));
  await cp(path.join(srcDir, 'devtools.html'), path.join(distDir, 'devtools.html'));
  await cp(path.join(srcDir, 'panel.html'), path.join(distDir, 'panel.html'));
  await cp(path.join(srcDir, 'panel.css'), path.join(distDir, 'panel.css'));
  await cp(path.join(srcDir, 'drawer.html'), path.join(distDir, 'drawer.html'));
  await cp(path.join(srcDir, 'drawer.css'), path.join(distDir, 'drawer.css'));
}

const buildOptions = {
  entryPoints,
  bundle: true,
  outdir: distDir,
  format: 'iife',
  target: ['chrome120'],
  platform: 'browser',
  sourcemap: watchMode ? 'inline' : false,
  minify: !watchMode,
  logLevel: 'info',
  loader: {
    '.css': 'text'
  }
};

const svelteExtensionResolve = {
  alias: {
    $lib: path.join(projectRoot, 'src/lib')
  }
};

const panelBuildOptions = {
  configFile: false,
  root: projectRoot,
  publicDir: false,
  logLevel: 'info',
  plugins: [
    tailwindcss(),
    svelte({
      preprocess: vitePreprocess()
    })
  ],
  resolve: svelteExtensionResolve,
  build: {
    emptyOutDir: false,
    outDir: distDir,
    sourcemap: watchMode ? 'inline' : false,
    minify: !watchMode,
    lib: {
      entry: path.join(srcDir, 'panel.ts'),
      formats: ['iife'],
      name: 'SemanticColorsPanel',
      fileName: () => 'panel.js',
      cssFileName: 'panel-ui'
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'panel-ui.css' || assetInfo.names?.includes('panel-ui.css')) {
            return 'panel-ui.css';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  }
};

const drawerPreviewBuildOptions = {
  configFile: false,
  root: projectRoot,
  publicDir: false,
  logLevel: 'info',
  plugins: [
    tailwindcss(),
    svelte({
      preprocess: vitePreprocess()
    })
  ],
  resolve: svelteExtensionResolve,
  build: {
    emptyOutDir: false,
    outDir: distDir,
    sourcemap: watchMode ? 'inline' : false,
    minify: !watchMode,
    lib: {
      entry: path.join(srcDir, 'drawer-preview.ts'),
      formats: ['iife'],
      name: 'SemanticColorsDrawerPreview',
      fileName: () => 'drawer-preview.js',
      cssFileName: 'drawer-preview'
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (
            assetInfo.name === 'drawer-preview.css' ||
            assetInfo.names?.includes('drawer-preview.css')
          ) {
            return 'drawer-preview.css';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  }
};

async function runBuild() {
  await rm(distDir, { recursive: true, force: true });
  await copyStatic();
  if (watchMode) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    await viteBuild({ ...panelBuildOptions, build: { ...panelBuildOptions.build, watch: {} } });
    await viteBuild({
      ...drawerPreviewBuildOptions,
      build: { ...drawerPreviewBuildOptions.build, watch: {} }
    });
    console.log('[extension] watching for changes...');
  } else {
    await build(buildOptions);
    await viteBuild(panelBuildOptions);
    await viteBuild(drawerPreviewBuildOptions);
    console.log('[extension] build complete:', path.relative(process.cwd(), distDir));
  }
}

runBuild().catch((error) => {
  console.error('[extension] build failed:', error);
  process.exit(1);
});
