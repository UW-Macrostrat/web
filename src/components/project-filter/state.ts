/** Shared project filter for Macrostrat's column pages.
 *
 * Which projects' columns are shown is a page-crossing choice, like the age
 * window: the column list, a column's navigation map and the correlation map
 * should agree. The filter is one URL key, `project_id` (unset = every active
 * column), and — as with `~/components/time-filter` — storage is the page's
 * choice: it supplies the atom through `ProjectFilterProvider`, and the hooks
 * and components here only ever talk to that atom.
 */
import { atom, useAtom, WritableAtom } from "jotai";
import h from "@macrostrat/hyper";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useMacrostratBaseURL } from "@macrostrat/data-provider";

export const PROJECT_FILTER_KEY = "project_id";

export type ProjectFilterAtom = WritableAtom<
  number | null,
  [number | null],
  void
>;

/** In-memory fallback when a page hasn't decided where the filter lives. */
const memoryProjectFilterAtom: ProjectFilterAtom = atom<number | null>(null);

const ProjectFilterContext = createContext<ProjectFilterAtom>(
  memoryProjectFilterAtom
);

export function ProjectFilterProvider({
  atom: filterAtom,
  children,
}: {
  atom: ProjectFilterAtom;
  children?: ReactNode;
}) {
  return h(ProjectFilterContext.Provider, { value: filterAtom }, children);
}

export function useProjectFilterAtom(): ProjectFilterAtom {
  return useContext(ProjectFilterContext);
}

export interface ProjectFilterActions {
  /** The selected project, or `null` for every project. */
  projectID: number | null;
  setProjectID(projectID: number | null): void;
  clear(): void;
}

export function useProjectFilter(): ProjectFilterActions {
  const [projectID, setRaw] = useAtom(useProjectFilterAtom());
  const setProjectID = useCallback(
    (value: number | null) => {
      setRaw(parseProjectID(value));
    },
    [setRaw]
  );
  const clear = useCallback(() => setRaw(null), [setRaw]);
  return { projectID, setProjectID, clear };
}

/** A project id from a URL value (or anything else); `null` when not a
 * positive integer. */
export function parseProjectID(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.trunc(num);
}

/* --------------------------------------------------- project definitions */

export interface ProjectDef {
  project_id: number;
  project: string;
  descrip?: string;
  /** For a composite project, the projects it is built from. */
  members?: { id: number; name: string; slug?: string }[] | null;
  t_cols?: number;
}

/** One fetch of the project definitions per API base, for the page's life. */
const projectDefsCache = new Map<string, Promise<ProjectDef[]>>();

function fetchProjectDefs(baseURL: string): Promise<ProjectDef[]> {
  let pending = projectDefsCache.get(baseURL);
  if (pending == null) {
    pending = fetch(`${baseURL}/defs/projects?all=true`)
      .then((res) => res.json())
      .then((body) => body?.success?.data ?? [])
      .catch((err) => {
        console.error(err);
        projectDefsCache.delete(baseURL);
        return [];
      });
    projectDefsCache.set(baseURL, pending);
  }
  return pending;
}

/** All project definitions, from the ambient `MacrostratDataProvider`'s API.
 * `null` while loading. */
export function useProjectDefs(): ProjectDef[] | null {
  const baseURL = useMacrostratBaseURL();
  const [defs, setDefs] = useState<ProjectDef[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchProjectDefs(baseURL).then((data) => {
      if (!cancelled) setDefs(data);
    });
    return () => {
      cancelled = true;
    };
  }, [baseURL]);
  return defs;
}

export function useProjectDef(projectID: number | null): ProjectDef | null {
  const defs = useProjectDefs();
  if (projectID == null || defs == null) return null;
  return defs.find((d) => d.project_id === projectID) ?? null;
}
