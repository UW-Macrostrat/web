/** Shared "in process" filter for Macrostrat's column pages.
 *
 * Whether unfinished columns are in scope is a page-crossing choice, like the
 * age window and the project filter: the column list, a column's navigation
 * map and the correlation map should agree, and a link should carry the choice.
 * The filter is one boolean behind one URL key, `in_process=true`; unset means
 * off, so the default stays out of the URL.
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

/** The URL key the filter serializes to. */
export const IN_PROCESS_FILTER_KEY = "in_process";

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
