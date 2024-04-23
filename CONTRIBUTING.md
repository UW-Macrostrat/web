# Code style

- Prefer Hyperscript (using the `@macrostrat/hyper` package) over JSX.
- Prefer functional components over class components.
- Prefer named exports over default exports (default exports make it more difficult to track names through the codebase).
- Prefer relative imports (e.g., `import { fetchHelper } from '../helpers'`) over absolute imports (e.g., `import { fetchHelper } from '~/pages/page1/helpers'`).
- Extract logic into hooks or utility functions to keep components straightforward.
- Generally, try to make sure folders have an `index.ts` file that exports all the files that might be used from the outside.

# Styling and interface design

- Prefer CSS modules where possible, but don't be afraid to use semantically named global classes for straightforward cases.
- Use sentence case for headings, button text, and other UI elements

# Dumb things to avoid

This codebase has been modernized and kept maintainable
by avoiding (or belatedly correcting) many anti-patterns:

- Hard-coding specific colors
- Creating URLs by concatenating strings
- Deeply nested code blocks (often with confusing [control flow](https://en.wikipedia.org/wiki/Control_flow) or [side effects](https://en.wikipedia.org/wiki/Side_effect_(computer_science) instead of unambiguous returns)
- Duplicated code of more than a few lines