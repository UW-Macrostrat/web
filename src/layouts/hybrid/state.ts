/** Layout state for the hybrid content/map page frame.
 *
 * One axis. `layoutMode` slides between two already-evolved endmembers, which
 * the frame renders as two different *shells* over the same slot contract:
 *
 *   content-only     ┐ the content shell — a scrolling content page, close to
 *   content-primary  ┘ `InfiniteScrollPage`: sticky header, panel, real footer.
 *                      The map and assistant ride in a right-hand sidebar.
 *
 *   map-primary      ┐ the map shell — `MapAreaContainer` from
 *   map-only         ┘ `@macrostrat/map-interface`, whose `contextPanel` /
 *                      `detailPanel` slots take the list and the assistant.
 *                      `map-only` simply closes the context panel.
 *
 * So the intermediate modes aren't a third layout: each belongs to one shell,
 * and the mode picks the shell plus how open its panels are. An earlier
 * `presentation` axis (content | fullscreen) turned out to be exactly this
 * distinction, and was folded in.
 */

import { atom } from "jotai";
import { atomWithSearchParam } from "~/_utils/url-atoms";

export type LayoutMode =
  | "content-only"
  | "content-primary"
  | "map-primary"
  | "map-only";

/** Which endmember shell a mode renders in. */
export type LayoutShell = "content" | "map";

/** Where the assistant renders inside the content shell. (In the map shell it
 * is always `MapAreaContainer`'s detail panel.) */
export type AssistantPlacement = "sidebar" | "hidden";

export const allLayoutModes: LayoutMode[] = [
  "content-only",
  "content-primary",
  "map-primary",
  "map-only",
];

const layoutModeLabels: Record<LayoutMode, string> = {
  "content-only": "List",
  "content-primary": "List and map",
  "map-primary": "Map and list",
  "map-only": "Map",
};

export function layoutModeLabel(mode: LayoutMode): string {
  return layoutModeLabels[mode];
}

export function shellForMode(mode: LayoutMode): LayoutShell {
  if (mode === "map-primary" || mode === "map-only") return "map";
  return "content";
}

/** Whether the list is on screen. In the map shell this is the context panel's
 * open state, which `MapAreaContainer` animates for us. */
export function hasContentPane(mode: LayoutMode): boolean {
  return mode !== "map-only";
}

export function hasMapPane(mode: LayoutMode): boolean {
  return mode !== "content-only";
}

export interface LayoutCapabilities {
  /** Modes this page offers. Order is the order shown in the switcher. */
  modes: LayoutMode[];
  /** Mode used when the URL doesn't specify one. Kept out of the URL. */
  defaultMode: LayoutMode;
  /** Whether the page has assistant content at all. */
  hasAssistant: boolean;
}

export const defaultCapabilities: LayoutCapabilities = {
  modes: allLayoutModes,
  defaultMode: "content-primary",
  hasAssistant: true,
};

export function buildCapabilities(
  overrides: Partial<LayoutCapabilities> = {}
): LayoutCapabilities {
  const merged = { ...defaultCapabilities, ...overrides };
  const modes = merged.modes.length > 0 ? merged.modes : allLayoutModes;

  let defaultMode = merged.defaultMode;
  if (!modes.includes(defaultMode)) {
    defaultMode = modes[0];
  }

  return { ...merged, modes, defaultMode };
}

/** Hydrated per page by `HybridLayoutProvider`. */
export const capabilitiesAtom = atom<LayoutCapabilities>(defaultCapabilities);

const layoutModeParam = atomWithSearchParam("layout");

/** The one piece of layout state. Synced to `?layout=`, with the page's default
 * kept out of the URL (repo convention). */
export const layoutModeAtom = atom(
  (get): LayoutMode => {
    const caps = get(capabilitiesAtom);
    const raw = get(layoutModeParam) as LayoutMode | null;
    if (raw != null && caps.modes.includes(raw)) return raw;
    return caps.defaultMode;
  },
  (get, set, mode: LayoutMode) => {
    const caps = get(capabilitiesAtom);
    if (!caps.modes.includes(mode)) return;
    let value: string | null = mode;
    if (mode === caps.defaultMode) {
      value = null;
    }
    set(layoutModeParam, value);
  }
);

export const layoutShellAtom = atom<LayoutShell>((get) =>
  shellForMode(get(layoutModeAtom))
);

const assistantParam = atomWithSearchParam("assistant");

export const showAssistantAtom = atom(
  (get): boolean => {
    if (!get(capabilitiesAtom).hasAssistant) return false;
    return get(assistantParam) !== "hidden";
  },
  (get, set, show: boolean) => {
    if (!get(capabilitiesAtom).hasAssistant) return;
    let value: string | null = null;
    if (!show) {
      value = "hidden";
    }
    set(assistantParam, value);
  }
);

/** Open state of the site-links footer popover. Ephemeral, so it stays out of
 * the URL. */
export const footerLinksOpenAtom = atom(false);
