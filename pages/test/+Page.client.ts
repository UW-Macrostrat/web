import h from "@macrostrat/hyper";
import { ColumnsMap } from "../index";
import { SETTINGS } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";

export function Page() {
    const columns = useAPIResult(SETTINGS.apiV2Prefix + "/columns?all&response=long&format=geojson")?.success.data;
    return ColumnsMap(columns);
}