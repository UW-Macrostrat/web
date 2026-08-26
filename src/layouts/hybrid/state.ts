/** Layout state for the hybrid content/map page frame.
 *
 * Two axes, both URL-synced, both restrictable per page:
 *
 *   `presentation`  content | fullscreen
 *       How the page is *framed*. `content` mimics a closed-form content page
 *       — app content width, normal document scroll, the real site footer at
 *       the bottom, no hard divisions. `fullscreen` is the viewport-locked
 *       app frame, where the footer arrives as a dismissable bottom panel.
 *
 *   `layoutMode`    content-only | content-primary | map-primary | map-only
 *       How content and map share the space. Everything else is *derived*
 *       from it rather than independently toggled — the assistant's placement,
 *       whether top chrome reserves space, and (see `resolvePresentation`)
 *       whether a map-dominant mode forces the fullscreen frame.
 */

import { atom } from "jotai";
import { atomWithSearchParam } from "~/_utils/url-atoms";

export type Presentation = "content" | "fullscreen";

export type LayoutMode =
  | "content-only"
  | "content-primary"
  | "map-primary"
  | "map-only";

/** Where the assistant renders in the fullscreen frame. One component,
 * several placements. (In the content frame it always joins the sidebar.) */
export type AssistantPlacement = "column" | "embed" | "float" | "hidden";

/** Whether the top toolbar takes its own layout space, or collapses to a
 * floating bar so the content can bleed to the frame edges. */
export type ChromeMode = "reserved" | "collapsed";

export const allPresentations: Presentation[] = ["content", "fullscreen"];

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

const presentationLabels: Record<Presentation, string> = {
  content: "Page",
  fullscreen: "Fullscreen",
};

export function layoutModeLabel(mode: LayoutMode): string {
  return layoutModeLabels[mode];
}

export function presentationLabel(presentation: Presentation): string {
  return presentationLabels[presentation];
}

export function isMapDominant(mode: LayoutMode): boolean {
  return mode === "map-primary" || mode === "map-only";
}

export function hasMapPane(mode: LayoutMode): boolean {
  return mode !== "content-only";
}

export function hasContentPane(mode: LayoutMode): boolean {
  return mode !== "map-only";
}

/** Default derivation: the assistant is relocated, never removed, as the map
 * takes over. Its own column when there's no map, tucked under the map when
 * the map is secondary, floating over it when the map dominates. */
export function defaultAssistantPlacement(
  mode: LayoutMode
): AssistantPlacement {
  if (mode === "content-only") return "column";
  if (mode === "content-primary") return "embed";
  return "float";
}

/** Default derivation: only a full-bleed map is worth giving up the toolbar's
 * own row for. Other modes still have a content pane whose header sits below
 * the toolbar, so collapsing it there buys little and costs orientation. */
export function defaultChromeMode(mode: LayoutMode): ChromeMode {
  if (mode === "map-only") return "collapsed";
  return "reserved";
}

/** A map-dominant layout has no sensible reading in a scrolling document, so
 * choosing one implies the fullscreen frame. The *chosen* presentation is left
 * untouched, so stepping back to a content-dominant mode restores it. */
export function resolvePresentation(
  chosen: Presentation,
  mode: LayoutMode,
  available: Presentation[]
): Presentation {
  if (isMapDominant(mode) && available.includes("fullscreen")) {
    return "fullscreen";
  }
  return chosen;
}

export interface LayoutCapabilities {
  /** Modes this page offers. Order is the order shown in the switcher. */
  modes: LayoutMode[];
  /** Mode used when the URL doesn't specify one. Kept out of the URL. */
  defaultMode: LayoutMode;
  /** Presentations this page offers. A single entry hides the control. */
  presentations: Presentation[];
  defaultPresentation: Presentation;
  /** Whether the page has assistant content at all. */
  hasAssistant: boolean;
  assistantPlacement: (mode: LayoutMode) => AssistantPlacement;
  chromeMode: (mode: LayoutMode) => ChromeMode;
}

export const defaultCapabilities: LayoutCapabilities = {
  modes: allLayoutModes,
  defaultMode: "content-primary",
  presentations: allPresentations,
  defaultPresentation: "content",
  hasAssistant: true,
  assistantPlacement: defaultAssistantPlacement,
  chromeMode: defaultChromeMode,
};

export function buildCapabilities(
  overrides: Partial<LayoutCapabilities> = {}
): LayoutCapabilities {
  const merged = { ...defaultCapabilities, ...overrides };

  const modes = merged.modes.length > 0 ? merged.modes : allLayoutModes;
  const presentations =
    merged.presentations.length > 0 ? merged.presentations : allPresentations;

  let defaultMode = merged.defaultMode;
  if (!modes.includes(defaultMode)) {
    defaultMode = modes[0];
  }

  let defaultPresentation = merged.defaultPresentation;
  if (!presentations.includes(defaultPresentation)) {
    defaultPresentation = presentations[0];
  }

  return { ...merged, modes, presentations, defaultMode, defaultPresentation };
}

/** Hydrated per page by `HybridLayoutProvider`. */
export const capabilitiesAtom = atom<LayoutCapabilities>(defaultCapabilities);

function atomForParam<T extends string>(
  key: string,
  read: (caps: LayoutCapabilities) => { allowed: T[]; fallback: T }
) {
  const param = atomWithSearchParam(key);
  return atom(
    (get): T => {
      const { allowed, fallback } = read(get(capabilitiesAtom));
      const raw = get(param) as T | null;
      if (raw != null && allowed.includes(raw)) return raw;
      return fallback;
    },
    (get, set, value: T) => {
      const { allowed, fallback } = read(get(capabilitiesAtom));
      if (!allowed.includes(value)) return;
      let next: string | null = value;
      if (value === fallback) {
        next = null;
      }
      set(param, next);
    }
  );
}

/** The layout axis everything else derives from. Synced to `?layout=`, with
 * the page's default kept out of the URL (repo convention). */
export const layoutModeAtom = atomForParam<LayoutMode>("layout", (caps) => ({
  allowed: caps.modes,
  fallback: caps.defaultMode,
}));

/** The framing axis, synced to `?view=`. This is what the user *chose*; see
 * `resolvedPresentationAtom` for what actually renders. */
export const presentationAtom = atomForParam<Presentation>("view", (caps) => ({
  allowed: caps.presentations,
  fallback: caps.defaultPresentation,
}));

export const resolvedPresentationAtom = atom<Presentation>((get) => {
  const caps = get(capabilitiesAtom);
  return resolvePresentation(
    get(presentationAtom),
    get(layoutModeAtom),
    caps.presentations
  );
});

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
  // Only the fullscreen frame has collapsible chrome; the content frame's
  // breadcrumbs scroll away on their own.
  if (get(resolvedPresentationAtom) === "content") return "reserved";
  const caps = get(capabilitiesAtom);
  return caps.chromeMode(get(layoutModeAtom));
});

/** Open state of the site-links footer popover. Shared between its two
 * anchors (the toolbar button and the content frame's overlay pill) so a
 * scroll-gated wrapper can keep its trigger visible while it's up. Ephemeral,
 * so it stays out of the URL. */
export const footerLinksOpenAtom = atom(false);
