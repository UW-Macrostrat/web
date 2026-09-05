// https://vike.dev/onBeforeRender

import { apiV2Prefix } from "@macrostrat-web/settings";
import {
  assembleColumnSummary,
  ColumnSummary,
} from "#/map/map-interface/app-state/columns/utils";
import { fetchProjectData, getAndUnwrap } from "~/_utils";
import { render } from "vike/abort";

export async function data(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const col_id = pageContext.routeParams.column;
  // In cases where we are in a project context, we need to fetch the project data
  const project_id = pageContext.routeParams.project;

  // Check whether a map ID is structurally valid (a number).
  if (isNaN(parseInt(col_id))) {
    throw render(404, "Map IDs must be numbers.");
  }

  // https://v2.macrostrat.org/api/v2/columns?col_id=3&response=long
  const linkPrefix = project_id == null ? "/" : `/projects/${project_id}/`;

  let projectID = null;
  if (project_id != null) {
    projectID = parseInt(project_id);
    if (isNaN(projectID)) {
      throw render(404, "Project IDs must be numbers.");
    }
  }

  /** This is a hack to make sure that all requisite data is on the table. */
  const responses = await Promise.all([
    fetchProjectData(projectID ?? 14), // Default to project 14 if no project_id is provided
    fetchAllProjects(),
    getData(
      "columns",
      { col_id, project_id: projectID, format: "json", response: "long" },
      (res) => res
    ),
    getData(
      "units",
      {
        project_id,
        col_id,
        show_position: true,
        response: "long",
      },
      (res) => res
    ),
  ]);

  const [project, allProjects, columns, units]: [any, any, any, any] =
    responses;

  const columnInfo: ColumnSummary = assembleColumnSummary(columns[0], units);
  return {
    project,
    columnInfo,
    // The column's own project plus any composite project that includes it
    columnProjects: projectsForColumn(allProjects, columnInfo.project_id),
    linkPrefix,
    projectID,
  };
}

/** Every project definition, composites included (`members` lists the projects
 * a composite is built from). */
async function fetchAllProjects(): Promise<any[]> {
  const res = await getAndUnwrap(`${apiV2Prefix}/defs/projects?all=true`);
  return res ?? [];
}

export interface ColumnProject {
  project_id: number;
  project: string;
  /** True for a composite project the column belongs to through one of its
   * member projects (e.g. "Core columns" for a North America column). */
  composite: boolean;
}

/** A column belongs to its own project and to every composite project whose
 * members include that project. Own project first. */
function projectsForColumn(
  projects: any[],
  projectID: number
): ColumnProject[] {
  const out: ColumnProject[] = [];
  for (const p of projects) {
    if (p.project_id === projectID) {
      out.unshift({ project_id: p.project_id, project: p.project, composite: false });
      continue;
    }
    const members: any[] = p.members ?? [];
    if (members.some((m) => m?.id === projectID)) {
      out.push({ project_id: p.project_id, project: p.project, composite: true });
    }
  }
  return out;
}

async function getData(
  entity: string,
  args: { col_id: number; project_id: number },
  unwrapResponse: (res: any) => any[]
) {
  /** Fetch column data without knowing if it is an 'in process' column, a priori. This
   * gets around the current limitation that there's no way to request any column data
   * without knowing the status_code.
   */
  const url = assembleURL(entity, {
    ...args,
    status_code: "active,in process",
  });

  const res = await getAndUnwrap(url);
  return unwrapResponse(res);
}

function assembleURL(
  entity,
  {
    col_id,
    project_id,
    status_code = "active",
    ...rest
  }: {
    col_id: number;
    project_id: number;
    status_code?: string;
    [key: string]: string | number;
  }
) {
  const base = apiV2Prefix + "/" + entity;
  let params = new URLSearchParams({
    col_id: col_id.toString(),
    response: "long",
    status_code,
    ...rest,
  });
  if (project_id != null) {
    params.set("project_id", project_id.toString());
  }

  return `${base}?${params}`;
}
