/**
 * The column scope — which projects, and whether unfinished columns count —
 * carried from one `/columns` page to the next.
 *
 * Both pages keep this in their own URL (`?project_id=` on the list, which is
 * server-rendered; `#project_id=` on a column, whose whole view state is in the
 * hash), and both read it once at load. That makes each page linkable, but it
 * means a link that omits the scope silently resets it — so opening a column
 * from a filtered list, or breadcrumbing back, dropped the filter and the
 * navigation map changed underneath you.
 *
 * Rather than thread the parameters through every link — there are several on
 * the list alone, plus the shared breadcrumbs — the last scope set anywhere in
 * the subtree is remembered here, and a page with nothing in its own URL adopts
 * it. The URL still wins whenever it says something, so deep links and shared
 * links are unaffected, and each page writes its own URL as usual, so the
 * address bar stays truthful.
 *
 * **Client only.** This is module state, and on the server a module is shared
 * by every request — remembering one visitor's filter there would hand it to
 * the next. Every accessor below returns `null` / does nothing outside the
 * browser, so a server render always uses the URL alone.
 */
import { useEffect, useRef } from "react";

import { serializeProjectFilter, type ProjectFilterValue } from "./project-filter";

export interface ColumnScope {
  /** Selected projects, as slugs; `null` for the default set. */
  projectSlugs: ProjectFilterValue;
  /** Whether in-process columns are in scope. */
  inProcess: boolean;
}

let carried: ColumnScope | null = null;

function inBrowser(): boolean {
  return typeof window !== "undefined";
}

/** The scope carried from the page you came from, or `null` — on a cold load,
 * and always on the server. */
export function carriedColumnScope(): ColumnScope | null {
  if (!inBrowser()) return null;
  return carried;
}

/** Remember this page's scope for the next one. Called whenever it changes, so
 * what's remembered is always the last state a page actually had — turning a
 * filter *off* is carried just as faithfully as turning it on. */
export function publishColumnScope(scope: ColumnScope): void {
  if (!inBrowser()) return;
  carried = scope;
}

/** Keep the carried scope in step with this page's own.
 *
 * `enabled` exists because a page that *adopts* the carried scope must not
 * publish over it first. Adoption is an effect, so the page's filters are still
 * empty on the render that schedules it; publishing from that same render
 * replaced the scope being adopted with nothing. A page holds publication off
 * until it has adopted, and from then on reports every change. */
export function usePublishColumnScope(
  projectSlugs: ProjectFilterValue,
  inProcess: boolean,
  { enabled = true }: { enabled?: boolean } = {}
): void {
  // Keyed on the contents: the slug array is rebuilt on every render.
  const slugKey = projectSlugs?.join(",") ?? "";
  useEffect(() => {
    if (!enabled) return;
    publishColumnScope({ projectSlugs, inProcess });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see slugKey
  }, [enabled, slugKey, inProcess]);
}

/** The carried scope as it stood when this page first rendered.
 *
 * Read during render, not in an effect: by the time effects run the page may
 * already have published its own (empty) scope over it. */
export function useCarriedScopeAtMount(): ColumnScope | null {
  const captured = useRef<ColumnScope | null | undefined>(undefined);
  if (captured.current === undefined) {
    captured.current = carriedColumnScope();
  }
  return captured.current;
}

/** The scope as a URL hash for a column page (`#project_id=…`), or `""` when it
 * is the default.
 *
 * Links out of the list carry this. The column page could adopt the carried
 * scope on arrival instead, and does as a fallback — but writing the hash from
 * the page's own effect loses a race with vike's client router, which replaces
 * the history entry for the navigation it is finishing and drops the hash we
 * just added. A hash that is part of the URL being navigated to has nothing to
 * race with.
 *
 * The in-process filter is deliberately *not* here: on a column page it only
 * decides which neighbours the inset map draws, so it travels in memory rather
 * than in the link. */
export function columnScopeHash(scope: ColumnScope): string {
  const slugs = serializeProjectFilter(scope.projectSlugs);
  if (slugs == null) return "";
  const params = new URLSearchParams();
  params.set("project_id", slugs);
  return `#${params.toString()}`;
}
