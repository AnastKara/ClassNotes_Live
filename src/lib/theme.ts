export type ThemeMode = "light" | "dark";

const LS_KEY = "cn.theme";

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
  // Helps native controls (optional but harmless)
  document.documentElement.style.colorScheme = mode;
}

export function getStoredTheme(): ThemeMode | null {
  const v = localStorage.getItem(LS_KEY);
  if (v === "light" || v === "dark") return v;
  return null;
}

export function initTheme(): ThemeMode {
  const stored = getStoredTheme();
  const mode: ThemeMode =
    stored ??
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");

  applyTheme(mode);
  return mode;
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem(LS_KEY, mode);
  applyTheme(mode);
}
