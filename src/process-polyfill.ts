// Minimal browser polyfill for Node's `process`.
// Some bundled code expects `process.env`.

if (!globalThis.process) {
  (globalThis as any).process = { env: {} };
}


