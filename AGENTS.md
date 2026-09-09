# AGENTS

Development conventions for the Macrostrat web interface. This is a living document — add to it over time.

The site is built with **Vike + React + Mapbox GL**. Pages live under `pages/`; shared code under `src/`. The import alias `~/*` maps to `src/*` (see `tsconfig.json`).

## Workflow

- Assume the user is already viewing the hot-reloading dev UI. Unless explicitly asked, don't start a dev server or offer to verify changes in the browser — the user will interject if the functionality isn't working.
- **Where it's served.** Usually `https://dev.macrostrat.local`, when the local container stack is up — that's the address to reach for first. The Vike dev server is also directly available at `http://localhost:3000` (**http**, not https).
- If you do need to check a server-side failure (an SSR 500, a module-resolution error), curl the running server rather than starting your own — `yarn dev` will just fail with `EADDRINUSE` against the one the user already has open.

## UI authoring

- **Use hyperscript instead of JSX.** Import the `h` factory from `@macrostrat/hyper` (e.g. `import h from "@macrostrat/hyper";`) and build elements with `h(...)` calls rather than JSX syntax. Components are `.ts` files, not `.tsx`. Use `hyper.styled(styles)` to bind a scoped SCSS module.
- **Prefer `@macrostrat`-scoped UI modules** (`@macrostrat/ui-components`, `@macrostrat/map-interface`, etc.) and **`@blueprintjs` components** (`@blueprintjs/core`, `@blueprintjs/select`, `@blueprintjs/table`) before reaching for third-party or hand-rolled UI.
- **Reuse shared in-repo components** from `~/components` (barrel at `src/components/index.ts`) rather than re-implementing. If you find a duplicated local copy of a shared component, consolidate onto the shared one (e.g. `BaseLayerSelector`, `Basemap`, `basemapStyle` in `src/components/map-controls.ts`).
- Use BlueprintJS (`@blueprintjs/core` etc.) for user-interface elements. Avoid hand-rolled UI unless it's a very specific, non-generic component (e.g., a custom map control).
- Use `@macrostrat/style-system` and `--pz-`-prefixed CSS variables where possible.

## State management

- **Use `jotai`'s atomic approach for state management.** The `jotai`, `jotai-location`, `jotai-zustand`, and `jotai-devtools` packages are available for atoms, URL-synced state, and stores.
- Context-local store and `jotai` helpers are available in `@macrostrat/scoped-store`.
- View state that should be shareable/bookmarkable is synced to the URL query string (`atomWithLocation` plus a small `atomWithSearchParam` read/write helper). Keep default values OUT of the URL — write `null` to drop the param.

## Data fetching

- **Don't unwrap `success.data` twice.** `MacrostratDataProvider` (`@macrostrat/data-provider`) mounts an `APIProvider` configured with `unwrapResponse: (res) => res.success.data`, so under it `useAPIResult` already returns the bare payload. Reaching for `res.success.data` again yields `undefined`, which typically reads as "still loading" and renders a spinner forever. Raw `fetch`/axios calls are *not* wrapped and do still need the unwrap.
- **Round coordinates before putting them in a request URL.** Map clicks carry full float precision; 5 decimal places (~1 m at the equator) is past the resolution of any Macrostrat dataset. Rounding also stabilizes the URL, so a numerically unchanged geometry doesn't refetch when it's used as a query/cache key.

## Maps & tiles

- Map overlays are Mapbox GL style objects; vector tiles come from the tileserver (e.g., `tiles.macrostrat.local` for local development).
- A Mapbox layer's `"source-layer"` must equal the MVT layer name the tileserver SQL emits via `ST_AsMVT(..., '<name>', ...)`. This name is a cross-repo contract: changing a tile route or layer name requires a matching change in the tileserver (and vice versa).

## Code style

- **Avoid inline conditionals.** Don't render `cond ? h(...) : null` or select values with inline ternaries; hoist the result to a named `let` resolved with `if`/`else` before the return. Null-safety operators (`?.`, `??`) are fine — the rule targets conditional *selection* of a value or component.
- **Avoid deep nesting.** Keep components and functions flat. Extract data-fetching, imperative map actions, and multi-step async logic into named custom hooks (`useThing`) or helpers rather than inlining large `useEffect`/`useCallback` bodies in a component. Prefer early returns over nested `if`/`else`, and lift derived values out of the render body. A component's top level should read as a short list of named pieces.

## Stylesheets

Use SASS modules (`.module.sass`) for component-specific styles. Prefer sass to scss. Attempt to reuse existing shared styles and css variables where possible.

## Typechecking

- Typechecks can be run with `yarn tsc --noEmit -p tsconfig.json`. Note that the codebase carries pre-existing type errors in unrelated files, so filter the output to the files you touched.
- Type errors are generally considered unimportant. Don't churn on satisfying the type checker — only act on errors that reveal major, obvious broken JavaScript (e.g. a real undefined reference or a malformed call), not incidental type-shape mismatches.

## Build tooling & gotchas

- **Yarn only, and this is a Yarn PnP repo.** Use `yarn ...` for everything (`yarn tsc`, `yarn add`); `npx tsc` resolves a decoy package. There is **no `node_modules`** — dependencies are zips under `.yarn/cache/`. To inspect a dependency's built source, `unzip -p .yarn/cache/<pkg>-*.zip <path/inside>` (paths are `node_modules/<pkg>/dist/...` inside the zip); `ls node_modules/...` will look empty.
- **`@macrostrat/*` packages resolve to their published dist**, NOT the sibling source in `Software/web-components`. Editing web-components source has **no effect** on this app's dev server until that package is released and the version bumped here. `vite.config.ts` marks these `noExternal` + `dedupe`, so they're bundled from the cached dist. Work within the installed package's current API; land library changes as a separate release.
- **CSS-module class names become JS bindings.** Vite emits a named export per class in a `.module.sass`, so a class named after a reserved/global identifier — notably `.name` — throws `TypeError: "name" is read-only` when the compiled style module loads. Avoid `.name` (use e.g. `.col-name`); the same caution applies to other global-ish identifiers.
- **Don't introduce `zustand-computed`.** Its 2.1.1 release mutates the store's state object in place inside `setState`, so zustand's `Object.is` guard never fires listeners and components stop re-rendering on store updates. The library dropped it (map-views ≥ 1.1 derives values with jotai atoms over the zustand store); if a dependency pulls it back in, pin `2.1.0` via `resolutions` until that dependency is fixed.
- **Source-map attribution to a `.module.sass` is misleading.** Since `hyper.styled(styles)` binds the style module, a runtime error whose stack points at `*.module.sass?t=...` usually originates in *some component that imports that shared `h`*, not the stylesheet itself — check all consumers of that `h`.
- **Blueprint is several copies on the server.** Blueprint stays external in SSR and its packages ship CommonJS + ESM builds without an `exports` map; under Yarn PnP each library that depends on it (`@macrostrat/ui-components`, `map-views`, …) resolves its own virtual copy of `@blueprintjs/core` and `@blueprintjs/icons`. Module-level state — the icon registry, provider contexts — is therefore per copy. `pages/+onBeforeRenderHtml.ts` fills every icon registry Node has loaded for that reason; don't assume `import … from "@blueprintjs/icons"` reaches the copy a library's component reads. Adding Blueprint to `ssr.noExternal` does not work as-is (`@popperjs/core` CommonJS named exports fail under Vite's module runner).
- **Theme classes are set before first paint by `pages/+bodyHtmlBegin.ts`.** It mirrors `DarkModeProvider` (storage key, JSON shape, class names, and the layout's `followSystem` setting). Change them together.
