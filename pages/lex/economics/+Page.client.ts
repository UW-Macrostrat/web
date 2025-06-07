import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageBreadcrumbs, StickyHeader } from "~/components";
import { Card, Popover } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { asChromaColor } from "@macrostrat/color-utils";
import { Loading, SearchBar } from "~/components/general";

export function Page() {
  const [input, setInput] = useState("");
  const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/econs?all")?.success
    .data;

  if (res == null) return h(Loading);

  console.log(res);

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  const filtered = res.filter((d) => {
    const name = d.name.toLowerCase();
    const className = d.class.toLowerCase();
    const type = d.type ? d.type.toLowerCase() : "";
    return (
      name.includes(input) || className.includes(input) || type.includes(input)
    );
  });

  const grouped = groupByClassThenType(filtered);

  return h(ContentPage, { className: "econ-list-page" }, [
    h(StickyHeader, [
      h(PageBreadcrumbs, { title: "Economics" }),
      h(SearchBar, {
        placeHolder: "Search economics...",
        onChange: handleChange,
      }),
    ]),
    h(
      "div.econ-list",
      Object.entries(grouped).map(([className, types]) =>
        h("div.econ-class-group", [
          h("h2", UpperCase(className)),
          ...Object.entries(types).map(([type, group]) =>
            h("div.econ-group", [
              h("h3", UpperCase(type)),
              h(
                "div.econ-items",
                group.map((d) => h(EconItem, { data: d, key: d.environ_id }))
              ),
            ])
          ),
        ])
      )
    ),
  ]);
}

function EconItem({ data }) {
  const { name, color, econ_id, t_units } = data;
  const luminance = 0.9;
  const chromaColor = asChromaColor(color);

  return h(
    Popover,
    {
      className: "econ-item-popover",
      content: h("div.econ-tooltip", [
        h("div.econ-tooltip-id", "ID - #" + econ_id),
        h("div.econ-tooltip-t-unit", "Time Units - " + t_units),
        h(
          "a",
          { href: `/lex/economics/${econ_id}`, className: "econ-tooltip-link" },
          "View details"
        ),
      ]),
    },
    h("div.econ-item", [
      h(
        "div.econ-name",
        {
          style: {
            color: chromaColor?.luminance(luminance).hex(),
            backgroundColor: chromaColor?.luminance(1 - luminance).hex(),
          },
        },
        name
      ),
    ])
  );
}

function groupByClassThenType(items) {
  return items.reduce((acc, item) => {
    const { class: className, type } = item;

    // Only include items with a valid type (not null, undefined, or empty string)
    if (!type || type.trim() === "") {
      return acc; // Skip this item if it has no valid type
    }

    if (!acc[className]) {
      acc[className] = {};
    }
    if (!acc[className][type]) {
      acc[className][type] = [];
    }

    acc[className][type].push(item);
    return acc;
  }, {});
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
