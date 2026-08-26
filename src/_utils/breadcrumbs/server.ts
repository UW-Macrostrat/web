import { resolveRoute } from "vike/routing";
import type { PageContextServer } from "vike/types";

type Match = {
  pageId: string;
  routeType: "STRING" | "FILESYSTEM" | "FUNCTION";
  routeString?: string;
  routeParams: Record<string, string>;
  precedence: number | null;
};

// Vike's own definition: a route is static iff matching it against itself yields no params.
const isStatic = (route: string) =>
  Object.keys(resolveRoute(route, route).routeParams).length === 0;

function analyze(route: string) {
  const parts = route.split("/").filter(Boolean);
  const isParam = (s: string) => s.startsWith("@") || s.startsWith(":");
  const isGlob = (s: string) => s === "*";
  let beginning = 0;
  for (const p of parts) {
    if (isParam(p) || isGlob(p)) break;
    beginning++;
  }
  return {
    beginning,
    staticParts: parts.filter((p) => !isParam(p) && !isGlob(p)).length,
    globs: parts.filter(isGlob).length,
    params: parts.filter(isParam).length,
  };
}

function tier(m: Match): number {
  if (m.routeType === "FUNCTION") {
    if (m.precedence != null && m.precedence > 0) return 6;
    if (m.precedence != null && m.precedence < 0) return 1;
    return 3;
  }
  if (m.routeType === "FILESYSTEM") return 5;
  return isStatic(m.routeString!) ? 4 : 2; // STRING
}

function compare(a: Match, b: Match): number {
  if (tier(a) !== tier(b)) return tier(b) - tier(a);
  if ((a.precedence ?? 0) !== (b.precedence ?? 0))
    return (b.precedence ?? 0) - (a.precedence ?? 0);
  if (!a.routeString || !b.routeString) return 0;
  const x = analyze(a.routeString),
    y = analyze(b.routeString);
  return (
    y.beginning - x.beginning ||
    y.staticParts - x.staticParts ||
    x.globs - y.globs ||
    y.params - x.params
  );
}

async function matchBestPage(
  pageContext: PageContextServer,
  urlPathname: string
) {
  const { _pageRoutes } = pageContext.globalContext.dangerouslyUseInternals;

  const matches: Match[] = [];
  for (const r of _pageRoutes) {
    if (r.routeType === "STRING" || r.routeType === "FILESYSTEM") {
      const { match, routeParams } = resolveRoute(r.routeString, urlPathname);
      if (match)
        matches.push({
          pageId: r.pageId,
          routeType: r.routeType,
          routeString: r.routeString,
          routeParams,
          precedence: null,
        });
    } else {
      // FUNCTION: run it against a clone with the ancestor URL swapped in
      const clone = {
        ...pageContext,
        urlOriginal: urlPathname,
        urlPathname,
        urlParsed: { ...pageContext.urlParsed, pathname: urlPathname },
      };
      const raw = await (r.routeFunction as (pc: unknown) => any)(clone);
      if (raw === false) continue;
      const result = raw === true ? {} : raw;
      matches.push({
        pageId: r.pageId,
        routeType: "FUNCTION",
        routeParams: result.routeParams ?? {},
        precedence:
          typeof result.precedence === "number" ? result.precedence : null,
      });
    }
  }

  return matches.sort(compare)[0] ?? null;
}

export async function getBreadcrumbs(pageContext: PageContextServer) {
  const { urlPathname, globalContext } = pageContext;
  const segs = urlPathname.split("/").filter(Boolean);
  const paths = [
    "/",
    ...segs.map((_, i) => "/" + segs.slice(0, i + 1).join("/")),
  ];

  const crumbs = [];
  for (const path of paths) {
    const hit = await matchBestPage(pageContext, path);
    if (!hit) continue;
    const cfg = globalContext.pages[hit.pageId]?.config ?? {};
    crumbs.push({
      url: path,
      pageId: hit.pageId,
      routeParams: hit.routeParams,
      slug: lastPathComponent(path),
      //label: cfg.breadcrumb ?? cfg.title ?? hit.pageId,
    });
  }
  return crumbs;
}

function lastPathComponent(path: string) {
  return path.substr(path.lastIndexOf("/") + 1);
}
