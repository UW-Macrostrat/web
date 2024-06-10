import { apiV2Prefix } from "@macrostrat-web/settings";
import { preprocessUnits } from "@macrostrat/column-views/src/helpers";
import fetch from "node-fetch";

import { ColumnSummary } from "~/pages/map/map-interface/app-state/handlers/columns";
import { fetchAPIData } from "~/pages/columns/utils";

function assembleColumnURL({
  col_id,
  project_id,
}: {
  col_id: number;
  project_id: number;
}) {
  const base = apiV2Prefix + "/columns";
  const params = new URLSearchParams({
    col_id: col_id.toString(),
    project_id: project_id.toString(),
    response: "long",
    format: "geojson",
    in_process: "true",
  });
  return `${base}?${params}`;
}

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const col_id = pageContext.routeParams.column;

  // In cases where we are in a project context, we need to fetch the project data
  const project_id = pageContext.routeParams.project;

  // https://v2.macrostrat.org/api/v2/columns?col_id=3&response=long

  const linkPrefix = project_id == null ? "/" : `/projects/${project_id}/`;
  const columnURL = assembleColumnURL({ col_id, project_id });
  console.log(columnURL);

  /** This is a hack to make sure that all requisite data is on the table. */
  const responses = await Promise.all([
    project_id == null
      ? Promise.resolve(null)
      : getAndUnwrap(apiV2Prefix + `/defs/projects?project_id=${project_id}`),
    getAndUnwrap(columnURL),
    fetchAPIData(`/units`, {
      response: "long",
      col_id,
    }),
  ]);

  const [projectData, column, unitsLong]: [any, any, any] = responses;

  const col = column?.features?.[0];

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
    },
  };
}

async function getAndUnwrap<T>(url: string): Promise<T> {
  console.log(url);
  const res = await fetch(url);
  const res1 = await res.json();
  return res1.success.data;
}
