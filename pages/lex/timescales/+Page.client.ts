import h from "./main.module.scss";
import { PageBreadcrumbs, LinkCard, StickyHeader } from "~/components";
import { Card, Popover, RangeSlider, Divider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { Timescale } from "@macrostrat/timescale";
import { titleCase } from "~/components/lex/index";
import { useEffect } from "react";
import { SearchBar } from "~/components/general";
import { useData } from "vike-react/useData";

export function Page() {
  const [input, setInput] = useState("");
  const [age, setAge] = useState([0, 4000]);
  const { res } = useData();

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
          length: 970 - 40,
          levels: [1, 5],
          ageRange: [age[0], age[1]],
          absoluteAgeScale: true,
          onClick: (e, d) => window.open("/lex/interval/" + d.int_id, "_self"),
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
      { className: "timescale-item", href: "/lex/timescale/" + timescale_id },
      [
        h("h1.timescale-name", titleCase(timescale)),
        h("h3", `${max_age} - ${min_age} Ma`),
        h("p", `Intervals: ${n_intervals}`),
      ]
    )
  );
}
