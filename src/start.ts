import React from "react";
import ReactDOM from "react-dom/client";

import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { TokenLogger } from "./TokenLogger";


// Suppress Chrome extension errors (e.g., "No Listener: tabs:outgoing.message.ready")
// These are typically from development tools like Lovable that inject code but don't have
// proper background script listeners configured.
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || "";
    if (message.includes("No Listener: tabs:outgoing.message.ready")) {
      return; // Suppress this specific error
    }
    originalConsoleError.apply(console, args);
  };

  // Also suppress unhandled promise rejections from Chrome extensions
  window.addEventListener("unhandledrejection", (event) => {
    const message = event.reason?.toString() || "";
    if (message.includes("No Listener: tabs:outgoing.message.ready")) {
      event.preventDefault();
    }
  });

  // Also suppress window errors from Chrome extensions
  window.addEventListener("error", (event) => {
    if (
      event.message?.includes("No Listener: tabs:outgoing.message.ready") ||
      (event.error && event.error.toString().includes("No Listener: tabs:outgoing.message.ready"))
    ) {
      event.preventDefault();
    }
  });
}

function App() {
  const router = getRouter();
  return React.createElement(RouterProvider, { router });
}

// Initialize theme before React paints.
// Note: top-level import() must run before render; we call it synchronously via dynamic import + await.
(async () => {
  try {
    const { initTheme } = await import("./lib/theme");
    initTheme();
  } catch {
    // ignore
  }
})();

// Wrap the entire app in a try-catch to handle any errors

try {
  const el = document.getElementById("root");
  if (!el) throw new Error("Missing #root element");

  ReactDOM.createRoot(el).render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(TokenLogger, null),
      React.createElement(App, null),
    ),
  );

} catch (error) {
  // Ignore Chrome extension errors
  if (
    error instanceof Error &&
    error.message.includes("No Listener: tabs:outgoing.message.ready")
  ) {
    // Silently ignore
  } else {
    throw error;
  }
}
