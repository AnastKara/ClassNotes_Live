// Temporary App component - includes TokenLogger for debugging
// This file can be removed/modified when TokenLogger is no longer needed
import React from "react";
import { RouterProvider } from "@tanstack/react-router";
import { TokenLogger } from "./TokenLogger";
import { getRouter } from "./router";

export function App() {
  const router = getRouter();
  return (
    <>
      {/* Temporary: Logs Firebase ID token to console on auth state change */}
      <TokenLogger />
      <RouterProvider router={router} />
    </>
  );
}
