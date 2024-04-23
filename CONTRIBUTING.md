# Code style

- Prefer Hyperscript (using the `@macrostrat/hyper` package) over JSX.
- Prefer functional components over class components.
- Prefer named exports over default exports (default exports make it more difficult to track names through the codebase).
- Prefer relative imports (e.g., `import { fetchHelper } from '../helpers'`) over absolute imports (e.g., `import { fetchHelper } from '~/pages/page1/helpers'`).
- When possible, extract logic into hooks or utility functions to keep components straightforward.
