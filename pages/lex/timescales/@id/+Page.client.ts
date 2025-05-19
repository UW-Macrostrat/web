import "./main.scss";
import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, PageBreadcrumbs } from "~/components";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';
import { Timescale } from "@macrostrat/timescale";
import { titleCase } from "../../index";


export function Page() {
    const pageContext = usePageContext();
    const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/timescales?all")?.success.data;

    if (res == null) return h("div", "Loading...");

    // temporary till api is fixed
    const timeRes = res.find((d) => d.timescale_id === id); 

    if (timeRes == null) return h("div", "Timescale not found");

    const { min_age, max_age, timescale } = timeRes;
    const width = window.screen.width;
    const timescaleWidth = width * .6;

    return h(ContentPage, [
        h(PageBreadcrumbs, { title: "#" + id }),
        h('div.timescale-content', [
            h('h1', titleCase(timescale)),
            h('h3', max_age + " - " +  min_age + " Ma"),
            h(Timescale, { levels: [0,5], ageRange: [min_age, max_age], orientation: "vertical" }),
        ])
    ]);
}