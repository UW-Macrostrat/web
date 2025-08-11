import h from "@macrostrat/hyper"
import { navigate } from "vike/client/router";
import { LexHierarchy } from "@macrostrat-web/lithology-hierarchy";
import { useAPIResult, ErrorCallout } from "@macrostrat/ui-components";
import { useState } from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { Spinner } from "@blueprintjs/core";
import { Footer, PageBreadcrumbs } from "~/components";


export function Page() {
    const [error, setError] = useState(null);
    const res = useAPIResult(
        `${apiV2Prefix}/defs/measurements`,
        {
        all: true,
        },
        { onError: setError }
    );

    if (error != null) {
        return h(ErrorCallout, { error });
    }
    if (res == null) {
        return h(Spinner);
    }
    const data = res.success.data;

    return h('div.page', [
        h(PageBreadcrumbs, { title: "Filters" }),
        h(LexHierarchy, { data, onClick: (e, item) => navigate(`/lex/measurements?id=${item.measure_id}`) }),
        h(Footer)
    ]);
}
