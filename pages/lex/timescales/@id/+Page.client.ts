import "./main.scss";
import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton, PageBreadcrumbs } from "~/components";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';
import { Timescale } from "@macrostrat/timescale";
import { titleCase } from "../../index";
import { useState, useEffect } from "react";


export function Page() {
    const pageContext = usePageContext();
    const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/timescales?all")?.success.data;
    const [clickedInterval, setClickedInterval] = useState(null);

    if (res == null) return h("div", "Loading...");

    // temporary till api is fixed
    const timeRes = res.find((d) => d.timescale_id === id); 

    if (timeRes == null) return h("div", "Timescale not found");

    const { min_age, max_age, timescale } = timeRes;

    const handleClick = (timescale) => {
        console.log("Clicked timescale:", timescale);
        /*
        const parent = timescale.target.parentElement;
        let selected;

        // container clicked
        const containerClickedData = parent.className.split(" ")[1];

        if(containerClickedData === "interval-label") {
          const labelClickedData = parent.parentElement.parentElement.className.split(" ")[1];
          selected = labelClickedData
        } else {
          selected = containerClickedData
        }

        setClickedInterval(selected);
        */
    }

    return h(ContentPage, [
        h(PageBreadcrumbs, { title: "#" + id }),
        h('div.timescale-content', [
            h('h1', titleCase(timescale)),
            h('h3', max_age + " - " +  min_age + " Ma"),
            h('div.timescale', h(Timescale, { levels: [0,5], ageRange: [min_age, max_age], orientation: "vertical"})),
        ])
    ]);
}