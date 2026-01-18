import type { PageContext } from "vike/types";

export function route(ctx: PageContext) {
  if (!ctx.urlPathname.startsWith("/dev/map/layers/tables")) return false;
  return {
    precedence: 10,
  };
}
