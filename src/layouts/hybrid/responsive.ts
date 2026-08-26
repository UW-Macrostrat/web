/** Responsive resolution for the hybrid frame.
 *
 * The *chosen* layout mode stays in the URL untouched — narrowing the window
 * shouldn't rewrite the user's shareable view state. Instead we resolve an
 * *effective* mode and assistant placement for rendering, so a wide-viewport
 * link still opens wide when reopened on a wide screen.
 */

import { useEffect, useState } from "react";

import type { AssistantPlacement, LayoutMode } from "./state";

/** Below this, a two- or three-track grid stops being usable. Keep in sync
 * with the `max-width: 700px` block in `page.module.sass`. */
const NARROW_QUERY = "(max-width: 700px)";

export function useMediaQuery(query: string): boolean {
  // Starts false so SSR and the first client render agree; the effect
  // corrects it on mount.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia == null) return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (evt: MediaQueryListEvent) => setMatches(evt.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsNarrowViewport(): boolean {
  return useMediaQuery(NARROW_QUERY);
}

/** On a narrow viewport, split modes collapse to whichever pane they favor,
 * and the assistant is always the floating panel. */
export function resolveForViewport(
  mode: LayoutMode,
  placement: AssistantPlacement,
  narrow: boolean
): { mode: LayoutMode; placement: AssistantPlacement } {
  if (!narrow) return { mode, placement };

  let resolvedMode = mode;
  if (mode === "content-primary") {
    resolvedMode = "content-only";
  } else if (mode === "map-primary") {
    resolvedMode = "map-only";
  }

  let resolvedPlacement = placement;
  if (placement === "column" || placement === "embed") {
    resolvedPlacement = "float";
  }

  return { mode: resolvedMode, placement: resolvedPlacement };
}
