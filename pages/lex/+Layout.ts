import hyper from "@macrostrat/hyper";
import styles from "./layout.module.sass";
import { ReactNode } from "react";
import { LexSearchHost } from "~/components/lex/search-omnibar";
import { clientOnly } from "~/components/lex/client-only";

const h = hyper.styled(styles);

/** The single Mapbox instance for the whole `/lex` subtree. Client-only (it
 * reaches mapbox-gl) and mounted *here* rather than in a page, so it survives
 * client-side navigation between lexicon items — pages move it into their
 * `LexMapSlot` and re-target it. See `~/components/lex/map-target`. */
const LexPersistentMap = clientOnly(() =>
  import("~/components/lex/persistent-map").then((m) => m.LexPersistentMap)
);

/**
 * Shared frame for every `/lex` page. Vike keeps a nested layout mounted across
 * client-side navigation within the subtree, so this is the home for state that
 * should persist between lexicon pages — the search omnibar and the one map
 * instance.
 *
 * Page chrome above this (header, footer) still comes from the `pageStyle`
 * layout. The search *control* (⌘K) sits in that header's actions, declared in
 * `+headerActions.ts`, so it travels with the sticky header bar.
 */
export default function LexLayout({ children }: { children: ReactNode }) {
  return h("div.lex-layout", [
    children,
    // The single omnibar instance — opened from here, the homepage prompt, or ⌘K.
    h(LexSearchHost),
    // Renders nothing until a page asks for a map, then stays mounted.
    h(LexPersistentMap),
  ]);
}
