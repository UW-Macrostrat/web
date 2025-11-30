// https://vike.dev/onBeforeRender

import { apiV2Prefix } from "@macrostrat-web/settings";
import fetch from "cross-fetch";

import { ColumnSummary } from "#/map/map-interface/app-state/handlers/columns";

export async function data(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const col_id = pageContext.routeParams.column;

  // In cases where we are in a project context, we need to fetch the project data
  const project_id = pageContext.routeParams.project;

  // https://v2.macrostrat.org/api/v2/columns?col_id=3&response=long

  const linkPrefix = project_id == null ? "/" : `/projects/${project_id}/`;

  let projectID = null;
  if (project_id != null) {
    projectID = parseInt(project_id);
  }

  /** This is a hack to make sure that all requisite data is on the table. */
  const responses = await Promise.all([
    getData(
      "columns",
      { col_id, project_id: projectID, format: "geojson" },
      (res) => res?.features
    ),
    getData(
      `units`,
      {
        project_id,
        col_id,
        show_position: true,
        response: "long",
      },
      (res) => res
    ),
  ]);

  const [columns, units]: [any, any] = responses;

  const col = columns?.[0] ?? {};

  if (!columns?.[0]?.properties) {
    console.warn("Column has no properties:", columns);
  }

  const columnInfo: ColumnSummary = {
    ...(col.properties ?? {}),
    geometry: col.geometry ?? null,
    units: units ?? [],
  };
  return {
    columnInfo,
    linkPrefix,
    projectID,
  };
}

async function getAndUnwrap<T>(url: string): Promise<T> {
  console.log("Fetching", url);
  const res = await fetch(url);
  const res1 = await res.json();
  return res1.success.data;
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
