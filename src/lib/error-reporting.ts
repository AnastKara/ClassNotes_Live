type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

// Lovable-specific error reporting removed. Keep a harmless local logger.
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window !== "undefined") {
    console.error(error, context);
  }
}
