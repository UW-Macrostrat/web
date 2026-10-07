import { mapPagePrefix } from "@macrostrat-web/settings";
import { browserHistory } from "./map-interface/app-state";

export function onPageTransitionStart(ctx) {
  const { pathname } = ctx.urlParsed;
  // Vike runs the *previous* page's hook, so this also fires when leaving the
  // map; the destination's URL must not become map state or a history entry.
  if (pathname != mapPagePrefix && !pathname.startsWith(mapPagePrefix + "/")) {
    return;
  }
  let location = { pathname, hash: ctx.urlParsed.hash };
  // Try to preserve hash if we can
  if (location.hash == "") location.hash = browserHistory.location.hash;
  browserHistory.push(location);
}
