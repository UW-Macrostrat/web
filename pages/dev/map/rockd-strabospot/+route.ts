import { partRegex } from "part-regex";
import { redirect } from "vike/abort";

const prefix = "/dev/map/rockd-strabospot";

const lngLatRegex = /(-?\d+\.\d+)/;

const routeRegex = partRegex`/loc/${lngLatRegex}/${lngLatRegex}`;

export function route(pageContext) {
  const url = pageContext.urlPathname;

  if (!url.startsWith(prefix)) return false;

  const suffix = url.slice(prefix.length);

  if (suffix == "" || suffix == "/") {
    return {
      routeParams: {},
    };
  }

  if (suffix.match(routeRegex)) {
    const [_, lng, lat] = suffix.match(routeRegex);
    return {
      routeParams: {
        lng,
        lat,
      },
    };
  }

  // Redirect to the root of this route
  throw redirect(prefix);
}
