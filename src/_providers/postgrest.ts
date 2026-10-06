import { PostgrestClient } from "@supabase/postgrest-js";
import { postgrestPrefix } from "@macrostrat-web/settings";

const postgrest = new PostgrestClient(absoluteURL(postgrestPrefix));

/** The client builds requests with `new URL`, which refuses the same-origin
 * `/api/pg` the dev server hands a browser on localhost. */
function absoluteURL(url: string): string {
  if (typeof window == "undefined") return url;
  return new URL(url, window.location.origin).href;
}

export { postgrest };
