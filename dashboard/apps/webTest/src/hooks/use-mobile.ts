import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function subscribeToMediaQueryChange(mql: MediaQueryList, onChange: () => void) {
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }

  if (typeof mql.addListener === "function") {
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }

  return () => undefined;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    const unsubscribe = subscribeToMediaQueryChange(mql, onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return unsubscribe;
  }, []);

  return !!isMobile;
}
