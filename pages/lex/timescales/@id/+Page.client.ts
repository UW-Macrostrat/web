import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";
import {
  PageHeader,
  Link,
  AssistantLinks,
  DevLinkButton,
  PageBreadcrumbs,
} from "~/components";
import { ContentPage } from "~/layouts";
import { usePageContext } from "vike-react/usePageContext";
import { Timescale } from "@macrostrat/timescale";
import { titleCase } from "~/components/lex";
import { useState, useEffect } from "react";
import { Footer, Loading } from "~/components/general";
import { asChromaColor } from "@macrostrat/color-utils";
import { Popover } from "@blueprintjs/core";
export function Page() {
  const pageContext = usePageContext();
  const id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);
  const res = useAPIResult(apiV2Prefix + "/defs/timescales?all")
    ?.success.data;
  const intervals = useAPIResult(
    SETTINGS.apiV2Prefix + "/defs/intervals?timescale_id=" + id
  )?.success.data;
  const [clickedInterval, setClickedInterval] = useState(null);

  useEffect(() => {
    if (!clickedInterval) return;

    const fetchInterval = async () => {
      try {
        const res = await fetch(
          `https://macrostrat.org/api/defs/intervals?name=${clickedInterval}`
        );
        const data = await res.json();
        const clickedData = data?.success?.data?.[0];
        if (clickedData) {
          const url = "/lex/intervals/" + clickedData.int_id;
          window.open(url, "_blank");
        }
      } catch (error) {
        console.error("Error fetching interval data:", error);
      }
    };

    fetchInterval();
  }, [clickedInterval]);

  if (!res || !intervals) return h(Loading);

  // temporary till api is fixed
  const timeRes = res.find((d) => d.timescale_id === id);
  const grouped = groupByIntType(intervals);

  if (timeRes == null) return h("div", "Timescale not found");

  const { min_age, max_age, timescale } = timeRes;

  const handleClick = (timescale) => {
    const parent = timescale.target.parentElement;
    let selected;

    // container clicked
    const containerClickedData = parent.className.split(" ")[1];

    if (containerClickedData === "interval-label") {
      const labelClickedData =
        parent.parentElement.parentElement.className.split(" ")[1];
      selected = labelClickedData;
    } else {
      selected = containerClickedData;
    }

    setClickedInterval(selected);
  };

  return h("div", [
    h(ContentPage, [
      h(PageBreadcrumbs, { title: "#" + id }),
      h("div.timescale-content", [
        h("h1", titleCase(timescale)),
        h("h3", max_age + " - " + min_age + " Ma"),
        h(Timescale, {
          length: 970,
          levels: [0, 5],
          ageRange: [min_age, max_age],
          orientation: "horizontal",
          absoluteAgeScale: true,
          onClick: handleClick,
        }),
        h(
          "div.int-list",
          Object.entries(grouped).map(([intType, group]) =>
            h("div.int-group", [
              h("h2", UpperCase(intType)),
              h(
                "div.int-items",
                group.map((d) => h(EconItem, { data: d, key: d.environ_id }))
              ),
            ])
          )
        ),
      ]),
    ]),
    h(Footer),
  ]);
}

function groupByIntType(items) {
  return items.reduce((acc, item) => {
    const intType = item.int_type?.trim?.();
    if (!intType) return acc; // Skip items with no int_type

    if (!acc[intType]) {
      acc[intType] = [];
    }

    acc[intType].push(item);
    return acc;
  }, {});
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function EconItem({ data }) {
  const { name, color, abbrev, b_age, int_id, t_age, timescales } = data;
  const chromaColor = color ? asChromaColor(color) : null;
  const luminance = 0.9;
  data.id = int_id;

  // return IntervalTag({ showAgeRange: true, interval: data });

  return h(
    Popover,
    {
      className: "int-item-popover",
      content: h("div.int-tooltip", [
        h("div.int-tooltip-id", "ID: #" + int_id),
        h("div.int-tooltip-ages", b_age + " - " + t_age + " Ma"),
        abbrev ? h("div.int-tooltip-abbrev", "Abbreviation - " + abbrev) : null,
        h(Link, { href: "/lex/intervals/" + int_id }, "View details"),
      ]),
    },
    h("div.int-item", [
      h(
        "div.int-name",
        {
          style: {
            backgroundColor: chromaColor?.luminance(1 - luminance).hex(),
            color: chromaColor?.luminance(luminance).hex(),
          },
        },
        name
      ),
    ])
  );
}
