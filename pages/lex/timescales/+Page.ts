import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, AssistantLinks, Link } from "~/components";
import { Card, Icon, Popover, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";

export function Page() {
    const [input, setInput] = useState("");
    const [age, setAge] = useState([0, 4600]);
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/timescales?all")?.success.data;

    if (res == null) return h("div", "Loading...");

    const min_age_arr = res.map((d) => d.min_age);
    const min_age = Math.min(...min_age_arr);
    const max_age_arr = res.map((d) => d.max_age);
    const max_age = Math.max(...max_age_arr);

    const handleChange = (event) => { 
        setInput(event.target.value.toLowerCase());
    }

    const filtered = res.filter((d) => {
        const name = d.timescale?.toLowerCase() || "";
        const max_age = d.max_age ? parseInt(d.max_age, 10) : 0;
        const min_age = d.min_age ? parseInt(d.min_age, 10) : 4600; 
        
        const matchesName = name.includes(input);
        const matchesAgeRange =
            (!isNaN(max_age) && max_age <= age[1]) &&
            (!isNaN(min_age) && min_age >= age[0]);

        return matchesName && matchesAgeRange;
    });

    return h('div.int-list-page', [
    h(AssistantLinks, [
      h(Card, [
        h('p', "Filter by name, type, or abbreviation"),
        h('div.search-bar', [
          h(Icon, { icon: "search" }),
          h('input', {
            type: "text",
            placeholder: "Search...",
            onChange: handleChange,
          }),
        ])
      ]),     
      h(Card, [
        h('p', "Filter by ages"),
        h(RangeSlider, {
          min: min_age,
          max: max_age,
          stepSize: 10,
          labelStepSize: 1000,
          value: [age[0], age[1]],
          onChange: (value) => {
            setAge(value);
          },
        }),
      ]), 
    ]),
    h(ContentPage, [
      h(PageHeader, { title: "Timescales" }),
      h('div.timescale-list', filtered.map((data) => TimescaleItem({ data }))),
    ])
  ]);
}

function TimescaleItem({ data }) {

  const { timescale, min_age, max_age, n_intervals } = data;

  return h(Popover, {
    className: "timescale-item-popover",
    content: h('div.timescale-tooltip')
    }, 
    h(Card, { className: 'timescale-item' }, [
      h('h1.timescale-name', titleCase(timescale)),
      h('p', `Intervals: ${n_intervals}`),
      h('div.timescale-age', [
        h('span', `Min Age: ${min_age}`),
        h('span', `Max Age: ${max_age}`),
      ])
    ])
  )
}


function titleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}