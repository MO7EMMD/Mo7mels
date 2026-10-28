import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { builtinModules } from 'node:module';
import { build } from 'esbuild';

function run(script, args) {
  const result = spawnSync(process.execPath, [resolve(script), ...args], { stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) process.exit(result.status || 1);
}
// Retain the old deployment as a rollback while DNS caches expire.
if (process.env.RENDER === 'true') {
  run('node_modules/vite/bin/vite.js', ['build']);
  process.exit(0);
}
run('node_modules/vite/bin/vite.js', ['build', '--outDir', 'dist/client']);
await mkdir('dist/server', { recursive: true });
// The Worker supplies Node APIs. Browser resolution strips iconv-lite's Node
// helpers even though process.versions.node is available at runtime.
await build({
  entryPoints: ['worker/index.js'],
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  mainFields: ['module', 'main'],
  conditions: ['workerd', 'node'],
  target: 'es2022',
  external: ['cloudflare:*', 'node:*', ...builtinModules],
  banner: { js: "import { createRequire as __workerCreateRequire } from 'node:module';\nconst require = __workerCreateRequire('/worker/index.js');" },
  legalComments: 'eof',
  logLevel: 'info',
});
const bundle = await readFile('dist/server/index.js', 'utf8');
if (/\(disabled\):[^\n]*iconv-lite/.test(bundle)) throw new Error('Worker build disabled required iconv-lite Node helpers.');
const config = JSON.parse(await readFile('wrangler.json', 'utf8'));
config.main = 'index.js';
config.no_bundle = true;
config.assets.directory = '../client';
await writeFile('dist/server/wrangler.json', JSON.stringify(config, null, 2) + '\n');
await mkdir('dist/.openai', { recursive: true });
await writeFile('dist/.openai/hosting.json', await readFile('.openai/hosting.json'));
