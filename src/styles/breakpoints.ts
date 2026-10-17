/** The width breakpoints of `_breakpoints.sass`, for layout a component takes
 * as props rather than CSS. Change the two together. */
import { useSyncExternalStore } from "react";
import { atom, type Atom } from "jotai";

export const breakpoints = {
  phone: 640,
  mapNarrow: 768,
  tablet: 1000,
};

type Breakpoint = keyof typeof breakpoints;

/** Whether the viewport is at or below a breakpoint. False on the server, so
 * the first render is the wide layout. */
export function useIsBelow(breakpoint: Breakpoint): boolean {
  const query = mediaQuery(breakpoint);
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** `useIsBelow` as an atom, for state derived from the viewport. False until
 * mounted, which only happens on the client. */
export function belowBreakpointAtom(breakpoint: Breakpoint): Atom<boolean> {
  const query = mediaQuery(breakpoint);
  const baseAtom = atom(false);
  baseAtom.onMount = (set) => {
    const update = () => set(window.matchMedia(query).matches);
    update();
    return subscribe(query, update);
  };
  return atom((get) => get(baseAtom));
}

function mediaQuery(breakpoint: Breakpoint) {
  return `screen and (max-width: ${breakpoints[breakpoint]}px)`;
}

function subscribe(query: string, onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
