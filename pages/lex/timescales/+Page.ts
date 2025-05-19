import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageBreadcrumbs, LinkCard } from "~/components";
import { Card, Icon, Popover, RangeSlider, Divider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { Timescale } from "@macrostrat/timescale";

export function Page() {
    const [input, setInput] = useState("");
    const [age, setAge] = useState([0, 4600]);
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/timescales?all")?.success.data;

    if (res == null) return h("div", "Loading...");

    console.log(res);

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

    const width = window.screen.width;
    const timescaleWidth = width * .6 - 40;

    return h(ContentPage, { className: "timescale-list-page"}, [
      h(PageBreadcrumbs, { title: "Timescales" }),
      h(Card, { className: "filters" }, [
        h('h2', "Filters"),
        h('div.name-filter', [
          h('div.search-bar', [
            h(Icon, { icon: "search" }),
            h('input', {
              type: "text",
              placeholder: "Filter by name...",
              onChange: handleChange,
            }),
          ])
        ]),     
        h('div.age-filter', [
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
        h(Timescale, { length: timescaleWidth, levels: [1,5], ageRange: [age[0], age[1]], absoluteAgeScale: true })
      ]),
      h(Divider),
      h('div.timescale-list', filtered.map((data) => TimescaleItem({ data }))),
    ])
}

function TimescaleItem({ data }) {

  const { timescale, min_age, max_age, n_intervals, timescale_id } = data;

  return h(Popover, {
    className: "timescale-item-popover",
    content: h('div.timescale-tooltip')
    }, 
    h(LinkCard, { className: 'timescale-item', href: "/lex/timescales/" + timescale_id }, [
      h('h1.timescale-name', titleCase(timescale)),
      h('h3', `${max_age} - ${min_age} Ma`),
      h('p', `Intervals: ${n_intervals}`),
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