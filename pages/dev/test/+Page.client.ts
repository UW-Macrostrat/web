import h from "@macrostrat/hyper";
import { IntervalTag } from "@macrostrat/column-views";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { LithologyTag } from "@macrostrat/data-components";
import { data } from "#/+data";

export function Page() {
    return h(LithologyTag, {
        data: {
            id: 1,
            name: "Sandstone",
            lith_id: 1,
            color: "#d2b48c",   // Example color        
        },
        onClick: (e, d) => {
            console.log("Clicked item", d);
        }
    })
}