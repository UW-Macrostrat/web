import { browserHistory } from "./map-interface/app-state";

export function onPageTransitionStart(ctx) {
  let location = {
    pathname: ctx.urlParsed.pathname,
    hash: ctx.urlParsed.hash,
  };
  // Try to preserve hash if we can
  if (location.hash == "") location.hash = browserHistory.location.hash;
  browserHistory.push(location);
}
