/** Shared "in process" filter for Macrostrat's column pages.
 *
 * Whether unfinished columns are in scope is a page-crossing choice, like the
 * age window and the project filter: the column list, a column's navigation
 * map and the correlation map should agree, and a link should carry the choice.
 *
 * It is one boolean, but it serializes as the API's own argument —
 * `?status_code=active,in process` — rather than a private `in_process=true`
 * flag, so the URL and the request that follows from it read the same. `active`
 * alone is the default and stays out of the URL entirely. Only the two states
 * the toggle can produce are written; a `status_code` naming anything else is
 * read for whether it includes `in process` and otherwise left alone.
 *
 * As with `~/components/project-filter`, storage is the page's choice: it
 * supplies the atom through `InProcessFilterProvider`, and everything here only
 * ever talks to that atom.
 *
 * The one place this filter is *not* purely a user choice is a link straight to
 * an in-process column. Landing there with the filter off would show a page
 * whose own column is missing from its map, so `useRevealInProcess` turns it on
 * for that case. See [[Columns API response structure]].
 */
import { atom, useAtom, useAtomValue, useSetAtom, WritableAtom } from "jotai";
import h from "@macrostrat/hyper";
import { createContext, ReactNode, useContext, useEffect, useMemo } from "react";
import type { ColumnStatusCode } from "@macrostrat/api-types";

export type InProcessFilterAtom = WritableAtom<boolean, [boolean], void>;

/** The URL key the filter serializes to — the API's own argument name. */
export const COLUMN_STATUS_FILTER_KEY = "status_code";

/** The in-process status, spelled as the API spells it. */
export const IN_PROCESS_STATUS = "in process";

/** In-memory fallback when a page hasn't decided where the filter lives. */
const memoryInProcessAtom: InProcessFilterAtom = atom(false);

const InProcessFilterContext = createContext<InProcessFilterAtom>(
  memoryInProcessAtom
);

export function InProcessFilterProvider({
  atom: filterAtom,
  children,
}: {
  atom: InProcessFilterAtom;
  children?: ReactNode;
}) {
  return h(InProcessFilterContext.Provider, { value: filterAtom }, children);
}

export function useInProcessFilterAtom(): InProcessFilterAtom {
  return useContext(InProcessFilterContext);
}

/** Whether in-process columns are in scope. */
export function useShowInProcess(): boolean {
  return useAtomValue(useInProcessFilterAtom());
}

export function useSetShowInProcess(): (value: boolean) => void {
  return useSetAtom(useInProcessFilterAtom());
}

export function useInProcessFilter(): [boolean, (value: boolean) => void] {
  return useAtom(useInProcessFilterAtom());
}

/** The filter as the API's `status_code` argument. */
export function useColumnStatusCodes(): ColumnStatusCode[] {
  const showInProcess = useShowInProcess();
  return useMemo(() => statusCodesFor(showInProcess), [showInProcess]);
}

export function statusCodesFor(showInProcess: boolean): ColumnStatusCode[] {
  if (showInProcess) return ["active", "in process"];
  return ["active"];
}

/** Serialized for a request: `"active"` or `"active,in process"`. */
export function statusCodeParam(showInProcess: boolean): string {
  return statusCodesFor(showInProcess).join(",");
}

/** The URL value for the filter, or `null` when it is the default (`active`
 * alone) and so belongs out of the URL. */
export function statusCodeURLValue(showInProcess: boolean): string | null {
  if (!showInProcess) return null;
  return statusCodeParam(true);
}

/** Read the filter back out of a `status_code` parameter. Anything listing
 * `in process` turns it on; absent, empty or `active`-only leaves it off. */
export function parseStatusCodeParam(
  raw: string | null | undefined
): boolean {
  if (raw == null) return false;
  return raw
    .split(",")
    .map((part) => part.trim())
    .includes(IN_PROCESS_STATUS);
}

/** Turn the filter on when the column being viewed is itself in process.
 *
 * A link to an in-process column is an implicit request to see in-process
 * columns — without this, the page's own column is missing from its navigation
 * map, which reads as the map being broken. Only ever switches the filter *on*:
 * turning it back off when navigating to an active column would fight the
 * user's own choice.
 *
 * `status` is `undefined` while the column is still loading, and absent
 * entirely on API deployments older than v2 2.3.10 — both are no-ops. */
export function useRevealInProcess(status: string | undefined | null) {
  const [showInProcess, setShowInProcess] = useInProcessFilter();
  useEffect(() => {
    if (status !== "in process") return;
    if (showInProcess) return;
    setShowInProcess(true);
  }, [status, showInProcess, setShowInProcess]);
}
