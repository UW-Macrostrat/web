/** `/maps/diff` and `/maps/diff/{left}...{right}`, GitHub's compare notation.
 * Positive precedence so `/maps/@id` never takes `diff` as a map slug. */
export function route(pageContext) {
  const match = pageContext.urlPathname.match(/^\/maps\/diff(?:\/([^/]+))?\/?$/);
  if (match == null) return false;
  return {
    routeParams: { compare: match[1] ?? "" },
    precedence: 1,
  };
}
