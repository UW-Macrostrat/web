import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageBreadcrumbs, LinkCard, StickyHeader } from "~/components";
import { Card, Icon, Popover, RangeSlider, Divider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { Timescale } from "@macrostrat/timescale";
import { titleCase } from "../../../src/components/lex/index";
import { useEffect } from "react";
import { Loading, SearchBar } from "~/components/general";

export function Page() {
  const [input, setInput] = useState("");
  const [age, setAge] = useState([0, 4000]);
  const [clickedInterval, setClickedInterval] = useState(null);
  const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/timescales?all")
    ?.success.data;

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

  if (res == null) return h(Loading);

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  const filtered = res.filter((d) => {
    const name = d.timescale?.toLowerCase() || "";
    const max_age = d.max_age ? parseInt(d.max_age, 10) : 4000;
    const min_age = d.min_age ? parseInt(d.min_age, 10) : 0;

    const matchesName = name.includes(input);
    const matchesAgeRange = max_age >= age[0] && min_age <= age[1];

    return matchesName && matchesAgeRange;
  });

  const width = window.screen.width;
  const timescaleWidth = width * 0.6 - 40;
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

  return h(ContentPage, { className: "timescale-list-page" }, [
    h(StickyHeader, [h(PageBreadcrumbs, { title: "Timescales" })]),
    h(Card, { className: "filters" }, [
      h(SearchBar, {
        placeholder: "Filter by name...",
        onChange: handleChange,
      }),
      h("div.age-filter", [
        h("p", "Filter by ages"),
        h(RangeSlider, {
          min: 0,
          max: 4000,
          stepSize: 10,
          labelStepSize: 1000,
          value: [age[0], age[1]],
          onChange: (value) => {
            setAge(value);
          },
        }),
      ]),
      h(
        "div.timescale",
        h(Timescale, {
          length: timescaleWidth,
          levels: [1, 5],
          ageRange: [age[0], age[1]],
          absoluteAgeScale: true,
          onClick: handleClick,
        })
      ),
    ]),
    h(Divider),
    h(
      "div.timescale-list",
      filtered.map((data) => TimescaleItem({ data }))
    ),
  ]);
}

function TimescaleItem({ data }) {
  const { timescale, min_age, max_age, n_intervals, timescale_id } = data;

  return h(
    Popover,
    {
      className: "timescale-item-popover",
      content: h("div.timescale-tooltip"),
    },
    h(
      LinkCard,
      { className: "timescale-item", href: "/lex/timescales/" + timescale_id },
      [
        h("h1.timescale-name", titleCase(timescale)),
        h("h3", `${max_age} - ${min_age} Ma`),
        h("p", `Intervals: ${n_intervals}`),
      ]
    )
  );
}
