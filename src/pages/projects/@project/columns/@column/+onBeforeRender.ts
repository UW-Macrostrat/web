import { apiV2Prefix } from "@macrostrat-web/settings";
import { preprocessUnits } from "@macrostrat/column-views/src/helpers";
import fetch from "node-fetch";
import { ColumnSummary } from "~/pages/map/map-interface/app-state/handlers/columns";

async function getAndUnwrap<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const res1 = await res.json();
  return res1.success.data;
}

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const col_id = pageContext.routeParams.column;
  const project_id = pageContext.routeParams.project;

  // https://v2.macrostrat.org/api/v2/columns?col_id=3&response=long

  const baseRoute = project_id == null ? "/columns" : `/defs/columns`;
  const linkPrefix = project_id == null ? "/" : `/projects/${project_id}/`;

  const responses = await Promise.all([
    getAndUnwrap(
      apiV2Prefix +
        baseRoute +
        "?format=geojson&response=long&in_process=true&col_id=" +
        col_id
    ),
    getAndUnwrap(
      apiV2Prefix + "/units?response=long&in_process=true&col_id=" + col_id
    ),
  ]);

  const [column, unitsLong]: [any, any] = responses;

  const col = column?.features[0];

  const columnInfo: ColumnSummary = {
    ...col.properties,
    geometry: col.geometry,
    units: preprocessUnits(unitsLong),
  };

  return {
    pageContext: {
      pageProps: {
        columnInfo,
        linkPrefix,
      },
    },
  };
}
