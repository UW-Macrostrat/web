/** The width breakpoints of `_breakpoints.sass`, for layout a component takes
 * as props rather than CSS. Change the two together. */
import { useSyncExternalStore } from "react";

export const breakpoints = {
  smallPhone: 440,
  phone: 640,
  mapNarrow: 768,
  tablet: 1000,
};

type Breakpoint = keyof typeof breakpoints;

/** Whether the viewport is at or below a breakpoint. False on the server, so
 * the first render is the wide layout. */
export function useIsBelow(breakpoint: Breakpoint): boolean {
  const query = `screen and (max-width: ${breakpoints[breakpoint]}px)`;
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => false
  );
}

function subscribe(query: string, onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
