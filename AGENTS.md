# AGENTS

Development conventions for the Macrostrat web interface. This is a living document — add to it over time.

## Workflow

- Assume the user is already viewing the hot-reloading dev UI. Unless explicitly asked, don't start a dev server or offer to verify changes in the browser — the user will interject if the functionality isn't working.

## UI authoring

- **Use hyperscript instead of JSX.** Import the `h` factory from `@macrostrat/hyper` (e.g. `import h from "@macrostrat/hyper";`) and build elements with `h(...)` calls rather than JSX syntax. Components are `.ts` files, not `.tsx`.
- **Prefer `@macrostrat`-scoped UI modules** (`@macrostrat/ui-components`, `@macrostrat/map-interface`, etc.) and **`@blueprintjs` components** (`@blueprintjs/core`, `@blueprintjs/select`, `@blueprintjs/table`) before reaching for third-party or hand-rolled UI.

## State management

- **Use `jotai` for state management.** The `jotai`, `jotai-location`, `jotai-zustand`, and `jotai-devtools` packages are available for atoms, URL-synced state, and stores.

## Typechecking

- Typechecks can be run with `yarn tsc --noEmit -p tsconfig.json`. Note that the codebase carries pre-existing type errors in unrelated files, so filter the output to the files you touched.
- Type errors at the boundary of newly added functionality are generally considered unimportant. Don't churn on satisfying the type checker — only act on errors that reveal major, obvious broken JavaScript (e.g. a real undefined reference or a malformed call), not incidental type-shape mismatches.
