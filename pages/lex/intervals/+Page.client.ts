import h from "./main.module.scss";
import { PageBreadcrumbs, StickyHeader, Link } from "~/components";
import { Card, Popover, RangeSlider } from "@blueprintjs/core";
import { useState, memo } from "react";
import { ContentPage } from "~/layouts";
import { asChromaColor } from "@macrostrat/color-utils";
import { SearchBar } from "~/components/general";
import { LithologyTag } from "@macrostrat/data-components";
import { useData } from "vike-react/useData";

export function Page() {
  const [input, setInput] = useState("");
  const [age, setAge] = useState([0, 4600]);
  const { res } = useData();

  const handleChange = (e) => {
    setInput(e.toLowerCase());
  };

  const filtered = input.length < 3 ? res : res.filter((d) => {
    const name = d.name?.toLowerCase() || "";
    const intType = d.int_type?.toLowerCase() || "";
    const abbrev = d.abbrev?.toLowerCase() || "";
    const b_age = d.b_age ? parseInt(d.b_age, 10) : 0;
    const t_age = d.t_age ? parseInt(d.t_age, 10) : 4600;

    const matchesName = name.includes(input);
    const matchesType = intType.includes(input);
    const matchesAbbrev = abbrev.includes(input);
    const matchesAgeRange =
      !isNaN(b_age) && b_age >= age[0] && !isNaN(t_age) && t_age <= age[1];

    return (matchesName || matchesType || matchesAbbrev) && matchesAgeRange;
  });

  const grouped = groupByIntType(filtered);

  return h("div.int-list-page", [
    h(ContentPage, [
      h(StickyHeader, [
        h(PageBreadcrumbs, { title: "Intervals" }),
        h(Card, { className: "filters" }, [
          h(SearchBar, {
            placeholder: "Filter by name, type, or abbreviation...",
            onChange: handleChange,
          }),
          h("div.age-filter", [
            h("p", "Filter by ages"),
            h(RangeSlider, {
              min: 0,
              max: 4600,
              stepSize: 10,
              labelStepSize: 1000,
              value: [age[0], age[1]],
              onChange: (value) => {
                setAge(value);
              },
            }),
          ]),
        ]),
      ]),
      h(
        "div.int-list",
        Object.entries(grouped).map(([intType, group]) =>
          h("div.int-group", [
            h("h2", UpperCase(intType)),
            h(
              "div.int-items",
              group.map((d) => h(MemoLithologyTag, {
                  data: {
                    id: d.int_id,
                    name: d.name,
                    color: d.color || "#000000",
                  },
                  onClick: (e, d) => {
                      window.open(`/lex/intervals/${d.id}`, "_blank");
                  },
              })),
            ),
          ])
        )
      ),
    ]),
  ]);
}

function groupByIntType(items) {
  return items.reduce((acc, item) => {
    const intType = item.int_type?.trim?.();
    if (!intType) return acc; 

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


const MemoLithologyTag = memo(
  function MemoLithologyTag({ data, onClick }) {
    return h(LithologyTag, { data, onClick });
  },
  (prevProps, nextProps) => {
    return (
      prevProps.data.name === nextProps.data.name
    );
  }
);