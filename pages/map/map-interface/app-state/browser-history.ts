import { createBrowserHistory } from "history";

/**
 * The app's browser history singleton, isolated in a leaf module.
 *
 * `store.ts`, `navigation.ts`, and `reducer.ts` form an import cycle, and
 * `store.ts` builds the zustand store eagerly at module load (which reads
 * `browserHistory` via `createInitialState`). When `navigation.ts` was the
 * const's home, entering the cycle through `navigation.ts` could run that eager
 * read before the `const` initialized — a temporal-dead-zone crash
 * ("can't access lexical declaration 'browserHistory' before initialization").
 *
 * A leaf module with no cyclic imports always finishes initializing before any
 * of those modules read it, so the access order no longer matters.
 */
export const browserHistory = createBrowserHistory();
