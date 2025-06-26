import h from "@macrostrat/hyper";
import { ColumnNavigationMap } from "@macrostrat/column-views";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";

export function Page() {
    let columns = useAPIResult('https://dev.macrostrat.org/api/columns', {
        col_id: 2,
        format: 'geojson'
    })?.success.data.features;

    if(!columns) {
        return h("div", { className: "error" }, "Error loading columns data.");
    }

    console.log("ColumnsMapInner", columns);

    return h(ColumnNavigationMap, { 
        style: { height: "100vh" },
        columns: [],
        accessToken: mapboxAccessToken ,
    });
}