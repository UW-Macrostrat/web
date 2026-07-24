import type { History, Location, To } from "history";

/**
 * Framework-agnostic core for two-way syncing between a page's view state and
 * the **URL** (pathname + hash), on top of a `history` instance. Independent of
 * React, Mapbox, and any specific state shape, so it can be promoted to a shared
 * package (`@macrostrat/ui-components`) and reused by any map/hierarchical page.
 *
 * A page supplies a {@link URLStateAdapter} — the *only* page-specific part. The
 * generic machinery owns the things that are easy to get subtly wrong:
 * push-vs-replace policy, the self-echo guard, and back/forward reconstruction.
 *
 * ## When NOT to use this
 * This module is specifically about **URL/history** state — its value is the
 * push/replace-by-part policy and back/forward handling, which only make sense
 * against a history stack. Simpler needs are better served off-the-shelf:
 *  - **URL query/hash param sync** → `jotai-location` (`atomWithLocation` /
 *    `atomWithHash`), the repo convention (see AGENTS.md).
 *  - **Persist view state without touching the URL** (e.g. a standalone dev page,
 *    or a "last-viewed-location" that shouldn't create history) → jotai's
 *    `atomWithStorage` (localStorage/sessionStorage). No history semantics.
 *  - **Map position ⇄ serialized form**, regardless of sink → the canonical
 *    `applyMapPositionToHash` / `getMapPositionForHash` from
 *    `@macrostrat/map-interface`. They operate on a params *object*, so the same
 *    serialization backs a hash, localStorage, or a cookie.
 */

/** The URL-managed slice of a location. */
export interface URLState {
  pathname: string;
  hash: string;
}

/**
 * A two-way, total mapping between a page's state `S` and its URL.
 *
 * Implementations own the page's view-state hierarchy (e.g. for `/map`:
 * location > cross-section > menu-page > plain map, each with its own path and
 * hash). Everything else is handled generically.
 */
export interface URLStateAdapter<S> {
  /**
   * state → URL. Given the previous and next state plus the current URL, return
   * the target pathname + hash.
   *
   * - `prev` is provided because URL *granularity* is often a function of what
   *   changed, not just the current value. (e.g. `/map` must not rebuild a
   *   zoom-dependent `/loc/lng/lat` path on a pure zoom, or it would push a new
   *   history entry on every zoom step while a marker is open.)
   * - `current` lets the adapter preserve URL parts it doesn't manage, or hold a
   *   value steady on purpose (e.g. freeze the hash while the map is mid-gesture).
   */
  toURL(prev: S | null, next: S, current: URLState): URLState;

  /**
   * URL → state. TOTAL reconstruction: given the page's base/default state and a
   * location, return fully-reconciled state. Every managed field must be
   * resolved — set *or* cleared — so back/forward navigation can never leave
   * stale state behind. (Incremental, match-only reconstruction is exactly what
   * produced the "Back is a no-op" / "panel comes back empty" class of bug.)
   */
  fromURL(base: S, location: URLState): S;
}

/** History-entry state marker for changes the app drove itself. */
export const MANAGED_STATE = { managed: true } as const;

/** True for history changes the app pushed/replaced itself (vs. external ones). */
export function isManagedLocation(location: Location): boolean {
  return (location.state as { managed?: boolean } | null)?.managed === true;
}

export function locationToURLState(location: Location): URLState {
  return { pathname: location.pathname, hash: location.hash };
}

/**
 * Should we react to a history event by reconstructing state from the URL?
 *
 * - Back/forward (`POP`) is always external — respond.
 * - Our own managed push/replace — ignore (would be a feedback loop).
 * - Any other unmanaged programmatic change — respond.
 */
export function isExternalHistoryChange(
  action: string,
  location: Location
): boolean {
  if (action === "POP") return true;
  return !isManagedLocation(location);
}

/**
 * Apply a state transition to the URL, choosing push vs. replace by comparing
 * the adapter's target URL to the current one:
 *
 * - pathname changed → **push** (a new, back-able view)
 * - hash-only change → **replace** (continuous view state; must not flood history)
 * - no change → nothing
 */
export function syncStateToURL<S>(
  history: History,
  adapter: URLStateAdapter<S>,
  prevState: S | null | undefined,
  nextState: S
): void {
  // Don't touch history on the very first state (there is no transition yet).
  if (prevState == null) return;

  const current: URLState = {
    pathname: history.location.pathname,
    hash: history.location.hash,
  };
  const target = adapter.toURL(prevState, nextState, current);
  const to: To = { pathname: target.pathname, hash: target.hash };

  if (target.pathname !== current.pathname) {
    history.push(to, MANAGED_STATE);
  } else if (target.hash !== current.hash) {
    history.replace(to, MANAGED_STATE);
  }
}
