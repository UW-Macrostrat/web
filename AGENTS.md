# AGENTS

Development conventions for the Macrostrat web interface. This is a living document — add to it over time.

The site is built with **Vike + React + Mapbox GL**. Pages live under `pages/`; shared code under `src/`. The import alias `~/*` maps to `src/*` (see `tsconfig.json`).

## Workflow

- Assume the user is already viewing the hot-reloading dev UI. Unless explicitly asked, don't start a dev server or offer to verify changes in the browser — the user will interject if the functionality isn't working.

## UI authoring

- **Use hyperscript instead of JSX.** Import the `h` factory from `@macrostrat/hyper` (e.g. `import h from "@macrostrat/hyper";`) and build elements with `h(...)` calls rather than JSX syntax. Components are `.ts` files, not `.tsx`. Use `hyper.styled(styles)` to bind a scoped SCSS module.
- **Prefer `@macrostrat`-scoped UI modules** (`@macrostrat/ui-components`, `@macrostrat/map-interface`, etc.) and **`@blueprintjs` components** (`@blueprintjs/core`, `@blueprintjs/select`, `@blueprintjs/table`) before reaching for third-party or hand-rolled UI.
- **Reuse shared in-repo components** from `~/components` (barrel at `src/components/index.ts`) rather than re-implementing. If you find a duplicated local copy of a shared component, consolidate onto the shared one (e.g. `BaseLayerSelector`, `Basemap`, `basemapStyle` in `src/components/map-controls.ts`).
- **Blueprint is on v6**, but the codebase uses the classic prop names — `minimal`, `small`, `rightIcon`, `alignText` (not `variant` / `size` / `endIcon`). Match the surrounding code. SCSS overrides target the `:global(.bp6-*)` classes.

## State management

- **Use `jotai` for state management.** The `jotai`, `jotai-location`, `jotai-zustand`, and `jotai-devtools` packages are available for atoms, URL-synced state, and stores.
- View state that should be shareable/bookmarkable is synced to the URL query string (`atomWithLocation` plus a small `atomWithSearchParam` read/write helper). Keep default values OUT of the URL — write `null` to drop the param.

## Maps & tiles

- Map overlays are Mapbox GL style objects; vector tiles come from the tileserver (`burwellTileDomain` / `tiles.macrostrat.local`).
- A Mapbox layer's `"source-layer"` must equal the MVT layer name the tileserver SQL emits via `ST_AsMVT(..., '<name>', ...)`. This name is a cross-repo contract: changing a tile route or layer name requires a matching change in the tileserver (and vice versa).

## Code style

- **Avoid inline conditionals.** Don't render `cond ? h(...) : null` or select values with inline ternaries; hoist the result to a named `let` resolved with `if`/`else` before the return. Null-safety operators (`?.`, `??`) are fine — the rule targets conditional *selection* of a value or component.

## Typechecking

- Typechecks can be run with `yarn tsc --noEmit -p tsconfig.json`. Note that the codebase carries pre-existing type errors in unrelated files, so filter the output to the files you touched.
- Type errors at the boundary of newly added functionality are generally considered unimportant. Don't churn on satisfying the type checker — only act on errors that reveal major, obvious broken JavaScript (e.g. a real undefined reference or a malformed call), not incidental type-shape mismatches.
