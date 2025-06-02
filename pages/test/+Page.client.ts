import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";

export function Page() {
    const result = useAPIResult("https://dev.macrostrat.org/api/pg/intervals?order=interval_type.asc");

    console.log("result", result);
    if (result == null) return h("div", "Loading...");
    return h("div", { className: "item-list" }, result.map(item => h(Item, { key: item.concept_id, data: item })));
}