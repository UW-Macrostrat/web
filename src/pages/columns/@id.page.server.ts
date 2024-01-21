import { preprocessUnits } from "@macrostrat/column-views/src/helpers";
import fetch from "node-fetch";
import { ColumnSummary } from "~/pages/map/map-interface/app-state/handlers/columns";
import { apiV2Prefix } from "~/settings";

async function getAndUnwrap<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const res1 = await res.json();
  return res1.success.data;
}

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const col_id = pageContext.routeParams.id;

  // https://v2.macrostrat.org/api/v2/columns?col_id=3&response=long

  const responses = await Promise.all([
    getAndUnwrap(
      apiV2Prefix + "/columns?format=geojson&response=long&col_id=" + col_id
    ),
    getAndUnwrap(apiV2Prefix + "/units?response=long&col_id=" + col_id),
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
      },
    },
  };
}
