import hyper from "@macrostrat/hyper";
import styles from "./layout.module.sass";
import { ReactNode } from "react";
import {
  LexSearchControl,
  LexSearchHost,
} from "~/components/lex/search-omnibar";

const h = hyper.styled(styles);

/**
 * Shared frame for every `/lex` page. Vike keeps a nested layout mounted across
 * client-side navigation within the subtree, so this is the home for chrome that
 * should persist between lexicon pages — currently the cross-lexicon search
 * control (top-right, ⌘K), and eventually the single persistent map instance.
 *
 * Page chrome above this (breadcrumbs, title, footer) still comes from the
 * `pageStyle` layout; this renders inside the content region and pins the
 * toolbar into the top-right corner of the content frame.
 */
export default function LexLayout({ children }: { children: ReactNode }) {
  return h("div.lex-layout", [
    h("div.lex-toolbar", h(LexSearchControl)),
    children,
    // The single omnibar instance — opened from here, the homepage prompt, or ⌘K.
    h(LexSearchHost),
  ]);
}
