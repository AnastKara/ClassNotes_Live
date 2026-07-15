import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Mobile = width < 768px
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Defensive: support any accidental SSR usage.
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const sync = () => {
      setIsMobile(mql.matches);
    };

    // Initialize immediately.
    sync();

    // Keep in sync on resize.
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
