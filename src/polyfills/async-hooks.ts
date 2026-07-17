// Browser polyfill for Node.js async_hooks module
// This is used to prevent errors when server code is bundled for client

// AsyncLocalStorage is not available in browsers, so we provide a no-op implementation
class AsyncLocalStorage {
  constructor() {
    // No-op for browser
  }

  disable() {
    return this;
  }

  getStore() {
    return undefined;
  }

  enterWith() {
    return this;
  }

  run() {
    return this;
  }

  exit() {
    return this;
  }
}

export { AsyncLocalStorage };
export default { AsyncLocalStorage };
