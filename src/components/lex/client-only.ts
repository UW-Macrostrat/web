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
export function clientOnly<T>(load: () => Promise<{ default: T } | T>) {
  const Lazy = lazy(async () => {
    const mod: any = await load();
    if (mod && typeof mod === "object" && "default" in mod) return mod;
    return { default: mod };
  });

  return function ClientOnlyLoader({ fallback = null, ...props }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) return fallback;
    return h(Suspense, { fallback }, h(Lazy as any, props));
  };
}
