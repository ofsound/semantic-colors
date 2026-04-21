#!/usr/bin/env node
import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');
const watchMode = process.argv.includes('--watch');

const entryPoints = {
  background: path.join(srcDir, 'background.ts'),
  devtools: path.join(srcDir, 'devtools.ts'),
  panel: path.join(srcDir, 'panel.ts'),
  'content-bridge': path.join(srcDir, 'content-bridge.ts')
};

async function copyStatic() {
  await mkdir(distDir, { recursive: true });
  await cp(path.join(root, 'manifest.json'), path.join(distDir, 'manifest.json'));
  await cp(path.join(srcDir, 'devtools.html'), path.join(distDir, 'devtools.html'));
  await cp(path.join(srcDir, 'panel.html'), path.join(distDir, 'panel.html'));
  await cp(path.join(srcDir, 'panel.css'), path.join(distDir, 'panel.css'));
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

async function runBuild() {
  await rm(distDir, { recursive: true, force: true });
  await copyStatic();
  if (watchMode) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log('[extension] watching for changes...');
  } else {
    await build(buildOptions);
    console.log('[extension] build complete:', path.relative(process.cwd(), distDir));
  }
}

runBuild().catch((error) => {
  console.error('[extension] build failed:', error);
  process.exit(1);
});
