/** Shared project filter for Macrostrat's column pages.
 *
 * Which projects' columns are shown is a page-crossing choice, like the age
 * window: the column list, a column's navigation map and the correlation map
 * should agree. The filter is one URL key, `project_id`, holding one or more
 * projects **by slug** (`project_id=north-america,caribbean`) — the
 * forward-looking form; numeric ids are accepted too. Unset means the API's
 * default, the "Core columns" composite, which is left implicit.
 *
 * The API itself still takes numeric ids only, so slugs are resolved against
 * the project definitions before any request (`resolveProjectIDs`,
 * `useProjectIDs`). As with `~/components/time-filter`, storage is the page's
 * choice: it supplies the atom through `ProjectFilterProvider`.
 */
import { atom, useAtom, WritableAtom } from "jotai";
import h from "@macrostrat/hyper";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";

import {
  normalizeProjectFilter,
  resolveProjectIDs,
  type ProjectDef,
  type ProjectFilterValue,
} from "./model";

export * from "./model";

export type ProjectFilterAtom = WritableAtom<
  ProjectFilterValue,
  [ProjectFilterValue],
  void
>;

/** In-memory fallback when a page hasn't decided where the filter lives. */
const memoryProjectFilterAtom: ProjectFilterAtom = atom<ProjectFilterValue>(
  null
);

interface ProjectFilterContextValue {
  atom: ProjectFilterAtom;
  /** Project definitions the page already loaded (e.g. server-side); saves
   * the components a fetch. */
  projects?: ProjectDef[] | null;
}

const ProjectFilterContext = createContext<ProjectFilterContextValue>({
  atom: memoryProjectFilterAtom,
});

export function ProjectFilterProvider({
  atom: filterAtom,
  projects,
  children,
}: ProjectFilterContextValue & { children?: ReactNode }) {
  const value = useMemo(
    () => ({ atom: filterAtom, projects }),
    [filterAtom, projects]
  );
  return h(ProjectFilterContext.Provider, { value }, children);
}

export function useProjectFilterAtom(): ProjectFilterAtom {
  return useContext(ProjectFilterContext).atom;
}

export interface ProjectFilterActions {
  /** Selected projects (slugs); empty when the default applies. */
  projects: string[];
  setProjects(projects: ProjectFilterValue): void;
  toggleProject(slug: string): void;
  removeProject(slug: string): void;
  clear(): void;
}

export function useProjectFilter(): ProjectFilterActions {
  const [value, setRaw] = useAtom(useProjectFilterAtom());
  const projects = value ?? [];

  const setProjects = useCallback(
    (next: ProjectFilterValue) => setRaw(normalizeProjectFilter(next)),
    [setRaw]
  );
  // Plain values, not updater functions: the page's atom is a derived
  // writable atom, and jotai hands its write function whatever is passed —
  // a function would arrive as the new value.
  const projectsKey = projects.join(",");
  const toggleProject = useCallback(
    (slug: string) => {
      if (projects.includes(slug)) {
        setRaw(normalizeProjectFilter(projects.filter((d) => d !== slug)));
      } else {
        setRaw([...projects, slug]);
      }
    },
    [setRaw, projectsKey]
  );
  const removeProject = useCallback(
    (slug: string) => {
      setRaw(normalizeProjectFilter(projects.filter((d) => d !== slug)));
    },
    [setRaw, projectsKey]
  );
  const clear = useCallback(() => setRaw(null), [setRaw]);

  return { projects, setProjects, toggleProject, removeProject, clear };
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

/** All project definitions: the ones the page's provider supplied, else one
 * fetch from the site's v2 API. `null` while loading. */
export function useProjectDefs(): ProjectDef[] | null {
  const provided = useContext(ProjectFilterContext).projects ?? null;
  const [fetched, setFetched] = useState<ProjectDef[] | null>(null);
  useEffect(() => {
    if (provided != null) return;
    let cancelled = false;
    fetchProjectDefs(apiV2Prefix).then((data) => {
      if (!cancelled) setFetched(data);
    });
    return () => {
      cancelled = true;
    };
  }, [provided]);
  return provided ?? fetched;
}

/** The filter resolved to numeric ids for API calls. `undefined` while the
 * definitions are still loading and slugs can't be resolved yet; `null` for
 * the default (no filter). */
export function useProjectIDs(): number[] | null | undefined {
  const { projects } = useProjectFilter();
  const defs = useProjectDefs();
  return useMemo(() => {
    if (projects.length === 0) return null;
    const ids = resolveProjectIDs(defs, projects);
    if (ids == null && defs == null) return undefined;
    return ids;
  }, [projects.join(","), defs]);
}
