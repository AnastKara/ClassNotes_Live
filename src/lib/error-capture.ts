let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

// Suppress Chrome extension errors (e.g., "No Listener: tabs:outgoing.message.ready")
// These are typically from development tools like Lovable that inject code but don't have
// proper background script listeners configured.
function shouldSuppressError(error: unknown): boolean {
  const message = error?.toString() || "";
  return message.includes("No Listener: tabs:outgoing.message.ready");
}

function record(error: unknown) {
  if (shouldSuppressError(error)) return;
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => {
    if (shouldSuppressError((event as ErrorEvent).error ?? event)) {
      event.preventDefault();
    }
    record((event as ErrorEvent).error ?? event);
  });
  globalThis.addEventListener("unhandledrejection", (event) => {
    if (shouldSuppressError((event as PromiseRejectionEvent).reason)) {
      event.preventDefault();
    }
    record((event as PromiseRejectionEvent).reason);
  });
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
