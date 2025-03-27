// https://vike.dev/onBeforeRender

import { apiV2Prefix } from "@macrostrat-web/settings";
import { preprocessUnits } from "@macrostrat/column-views";
import fetch from "node-fetch";

import { ColumnSummary } from "#/map/map-interface/app-state/handlers/columns";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const col_id = pageContext.routeParams.column;

  // In cases where we are in a project context, we need to fetch the project data
  const project_id = pageContext.routeParams.project;

  // https://v2.macrostrat.org/api/v2/columns?col_id=3&response=long

  const linkPrefix = project_id == null ? "/" : `/projects/${project_id}/`;

  console.log(linkPrefix);

  /** This is a hack to make sure that all requisite data is on the table. */
  const responses = await Promise.all([
    project_id == null
      ? Promise.resolve(null)
      : getAndUnwrap(apiV2Prefix + `/defs/projects?project_id=${project_id}`),
    getData(
      "columns",
      { col_id, project_id, format: "geojson" },
      (res) => res?.features
    ),
    getData(
      `units`,
      {
        project_id,
        col_id,
      },
      (res) => res
    ),
  ]);

  const [projectData, columns, unitsLong]: [any, any, any] = responses;

  const col = columns?.[0];

  const columnInfo: ColumnSummary = {
    ...col.properties,
    geometry: col.geometry,
    units: preprocessUnits(unitsLong),
  };

  return {
    pageContext: {
      exports: {
        ...pageContext.exports,
        title: columnInfo.col_name,
      },
      pageProps: {
        columnInfo,
        linkPrefix,
        project: projectData?.[0],
      },
      documentProps: {
        // The page's <title>
        title: columnInfo.col_name,
      },
    },
  };
}

async function getAndUnwrap<T>(url: string): Promise<T> {
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
  let res = await getAndUnwrap(
    assembleURL(entity, { ...args, status_code: "active" })
  );
  let data = unwrapResponse(res);

  if (data.length > 0) {
    return data;
  }

  let res2 = await getAndUnwrap(
    assembleURL(entity, { ...args, status_code: "in process" })
  );
  return unwrapResponse(res2);
}

function assembleURL(
  entity,
  {
    col_id,
    project_id = 1,
    status_code = "active",
    ...rest
  }: {
    col_id: number;
    project_id: number;
    status_code?: "active" | "in process";
    [key: string]: string | number;
  }
) {
  const base = apiV2Prefix + "/" + entity;
  let params = new URLSearchParams({
    col_id: col_id.toString(),
    project_id: project_id.toString(),
    response: "long",
    status_code,
    ...rest,
  });
  return `${base}?${params}`;
}
