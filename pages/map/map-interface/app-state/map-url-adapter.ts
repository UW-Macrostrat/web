import type { AppState } from "./types";
import type { URLStateAdapter } from "~/_utils/url-state";
import {
  buildPathName,
  mayHaveHashChange,
  mayHavePathNameChange,
} from "./pathname";
import { buildHashString } from "./hash-string";
import { updateStateFromLocation } from "./navigation";

/**
 * The `/map` page's implementation of the generic URL⇄state contract. This is
 * the *only* page-specific part of the history machinery; everything else lives
 * in `~/components/map-url-state`.
 *
 * `toURL` encodes the view-state hierarchy (location > cross-section > menu-page
 * > plain map) via `buildPathName`/`buildHashString`, gated by the same
 * change-detectors the old `historyManager` used — pathname is only rebuilt on a
 * meaningful change (not on a zoom that merely reformats a `/loc` path), and the
 * hash is frozen while the map is mid-gesture.
 *
 * `fromURL` delegates to `updateStateFromLocation`, which reconstructs the full
 * app state from a URL (total, not incremental).
 */
export const mapURLAdapter: URLStateAdapter<AppState> = {
  toURL(prev, next, current) {
    let pathname = current.pathname;
    if (prev == null || mayHavePathNameChange(prev, next)) {
      pathname = buildPathName(next) ?? current.pathname;
    }

    let hash = current.hash;
    if ((prev == null || mayHaveHashChange(prev, next)) && !next.mapIsMoving) {
      hash = buildHashString(next);
    }

    return { pathname, hash };
  },

  fromURL(base, location) {
    return updateStateFromLocation(base, location);
  },
};
