/** Layout state for the hybrid content/map page frame.
 *
 * The whole layout is driven by a single scalar — `layoutMode` — from which
 * every other placement decision is *derived* rather than independently
 * toggled. Three derivations, all pure functions of the mode:
 *
 *   - the composer's track ratios (in CSS, keyed by a mode class)
 *   - where the assistant content goes (`assistantPlacement`)
 *   - whether app chrome reserves space or collapses (`chromeMode`)
 *
 * Pages restrict and re-point those derivations through `LayoutCapabilities`
 * (e.g. the column page can't allow a full-bleed map), so the frame never
 * offers a mode a page can't honor.
 */

import { atom } from "jotai";
import { atomWithSearchParam } from "~/_utils/url-atoms";

export type LayoutMode =
  | "content-only"
  | "content-primary"
  | "map-primary"
  | "map-only";

/** Where the assistant slot renders. One component, four placements. */
export type AssistantPlacement = "column" | "embed" | "float" | "hidden";

/** Whether app-level chrome (brand/nav header, footer) takes its own layout
 * space, or collapses so the content can bleed to the frame edges. */
export type ChromeMode = "reserved" | "collapsed";

export const allLayoutModes: LayoutMode[] = [
  "content-only",
  "content-primary",
  "map-primary",
  "map-only",
];

const layoutModeLabels: Record<LayoutMode, string> = {
  "content-only": "Content",
  "content-primary": "Content first",
  "map-primary": "Map first",
  "map-only": "Map",
};

export function layoutModeLabel(mode: LayoutMode): string {
  return layoutModeLabels[mode];
}

/** Default derivation: the assistant is relocated, never removed, as the map
 * takes over. A column of its own when there's no map, tucked under the map
 * when the map is secondary, floating over it when the map dominates. */
export function defaultAssistantPlacement(
  mode: LayoutMode
): AssistantPlacement {
  if (mode === "content-only") return "column";
  if (mode === "content-primary") return "embed";
  return "float";
}

/** Default derivation: map-dominant modes want the vertical space that the
 * app header and footer would otherwise reserve. */
export function defaultChromeMode(mode: LayoutMode): ChromeMode {
  if (mode === "map-primary" || mode === "map-only") return "collapsed";
  return "reserved";
}

export interface LayoutCapabilities {
  /** Modes this page offers. Order is the order shown in the switcher. */
  modes: LayoutMode[];
  /** Mode used when the URL doesn't specify one. Kept out of the URL. */
  defaultMode: LayoutMode;
  /** Whether the page has assistant content at all. */
  hasAssistant: boolean;
  assistantPlacement: (mode: LayoutMode) => AssistantPlacement;
  chromeMode: (mode: LayoutMode) => ChromeMode;
}

export const defaultCapabilities: LayoutCapabilities = {
  modes: allLayoutModes,
  defaultMode: "content-primary",
  hasAssistant: true,
  assistantPlacement: defaultAssistantPlacement,
  chromeMode: defaultChromeMode,
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

/** The one piece of state everything else derives from. Synced to `?layout=`,
 * with the page's default mode kept out of the URL (repo convention). */
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

export const assistantPlacementAtom = atom<AssistantPlacement>((get) => {
  if (!get(showAssistantAtom)) return "hidden";
  const caps = get(capabilitiesAtom);
  return caps.assistantPlacement(get(layoutModeAtom));
});

export const chromeModeAtom = atom<ChromeMode>((get) => {
  const caps = get(capabilitiesAtom);
  return caps.chromeMode(get(layoutModeAtom));
});

/** Open state of the footer sheet. Ephemeral, so it stays out of the URL. */
export const footerSheetOpenAtom = atom(false);
