import { build } from 'esbuild'

await build({
  entryPoints: ['src/client/index.js'],
  outfile: 'client/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  external: ['react', '@deepseek-ai/dsh-client-ui-primitives'],
  banner: {
    js: 'window.__ModuleLoader__.load({ id: "dsh-interview", factory: (require) => { var module = { exports: {} }; var exports = module.exports;',
  },
  footer: {
    js: 'return module.exports; }});',
  },
  logLevel: 'info',
})
