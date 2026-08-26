import h from "@macrostrat/hyper";
import { clientOnly } from "./client-only";

/**
 * Client-only island for `LexItemBody`, so the loadable-atom reads stay out of
 * SSR: the page's core (name via breadcrumbs, references) renders on the server,
 * and this hydrates + loads the heavy/derived data in the browser.
 *
 * Uses vike-react's `clientOnly()` helper (not the `<ClientOnly>` component):
 * with hyperscript there's no JSX build-transform to tree-shake children, so the
 * `<ClientOnly>` component's server-side `assert(children === undefined)` would
 * fire ("You stumbled upon a vike-react bug"). `clientOnly()` instead renders
 * `fallback` on the server and lazy-loads on the client. See [[Geologic lexicon pages]].
 */

const LexItemBodyLazy = clientOnly(() =>
  import("~/components/lex/item-body.ts").then((mod) => ({
    default: mod.LexItemBody,
  }))
);

export function LexItemBodyClient(props: any) {
  return h(LexItemBodyLazy, { ...props, fallback: h("div.lex-body-loading") });
}
