# Code style

- Prefer Hyperscript (using the `@macrostrat/hyper` package) over JSX.
- Prefer functional components over class components.
- Prefer named exports over default exports (default exports make it more difficult to track names through the codebase).
- Prefer relative imports (e.g., `import { fetchHelper } from '../helpers'`) over absolute imports (e.g., `import { fetchHelper } from '~/pages/page1/helpers'`).
- Extract logic into hooks or utility functions to keep components straightforward.
- Generally, try to make sure folders have an `index.ts` file that exports all the files that might be used from the outside.
- Prefer CSS modules where possible, but don't be afraid to use semantically named global classes for straightforward cases.
