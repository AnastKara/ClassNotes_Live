import React from "react";
import ReactDOM from "react-dom/client";

import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

function App() {
  const router = getRouter();
  return React.createElement(RouterProvider, { router });
}


const el = document.getElementById("root");
if (!el) throw new Error("Missing #root element");

ReactDOM.createRoot(el).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(App, null),
  ),
);


