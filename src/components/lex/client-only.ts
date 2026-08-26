import h from "@macrostrat/hyper";
import { lazy, Suspense, useEffect, useState } from "react";

/**
 * Hyperscript-friendly client-only loader. Renders `fallback` on the server and
 * until mounted, then lazy-loads the component on the client (via `React.lazy` +
 * `Suspense`). The dynamic `load` is never invoked on the server, so it's safe
 * for browser-only modules (mapbox, jotai atom reads, etc.).
 *
 * This replaces vike-react's `clientOnly()` helper, which we can't use here:
 *  - the `<ClientOnly>` *component* asserts `children === undefined` on the
 *    server (it relies on a JSX build-transform we don't get under hyperscript), and
 *  - importing `vike-react/clientOnly` (lowercase) collides with
 *    `vike-react/ClientOnly` (uppercase, used by `tag.ts`) in Vite's
 *    optimized-deps cache on case-insensitive filesystems (macOS).
 *
 * See [[Geologic lexicon pages]] (Layer B).
 */
/**
 * Has anything client-only mounted yet in this document? The mount round-trip
 * below exists only to keep the *first* render (hydration) identical to the
 * server's. Once we've mounted once, we're demonstrably in the browser past
 * hydration, so later mounts — every client-side navigation — can render their
 * content in the same commit as the page.
 *
 * That matters for more than a frame of flicker: the persistent lexicon map is
 * re-parented by a layout effect inside a client-only island, so an extra render
 * pass means a paint with no map in it. Effects never run on the server, so this
 * stays `false` there.
 */
let pastHydration = false;

export function clientOnly<T>(load: () => Promise<{ default: T } | T>) {
  const Lazy = lazy(async () => {
    const mod: any = await load();
    if (mod && typeof mod === "object" && "default" in mod) return mod;
    return { default: mod };
  });

  return function ClientOnlyLoader({ fallback = null, ...props }: any) {
    const [mounted, setMounted] = useState(pastHydration);
    useEffect(() => {
      pastHydration = true;
      setMounted(true);
    }, []);

    if (!mounted) return fallback;
    // Once `load`'s promise has resolved, `lazy` renders synchronously — so a
    // subsequent mount of an already-loaded island costs no extra commit.
    return h(Suspense, { fallback }, h(Lazy as any, props));
  };
}
