import h from "./main.module.scss";
import { LinkCard, PageBreadcrumbs, StickyHeader } from "~/components";
import { Popover } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { asChromaColor } from "@macrostrat/color-utils";
import { useData } from "vike-react/useData";
import { Loading, SearchBar } from "~/components/general";

export function Page() {
  const [input, setInput] = useState("");
  const { res } = useData();

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

  const grouped = groupByClass(filtered);

  return h(ContentPage, { className: "econ-list-page" }, [
    h(StickyHeader, [
      h(PageBreadcrumbs, { title: "Structures" }),
      h(SearchBar, {
        placeHolder: "Search structures...",
        onChange: handleChange,
      }),
    ]),
    h(
      "div.econ-list",
      Object.entries(grouped).map(([className, types]) => 
        h("div.econ-class-group", [
          h("h2", UpperCase(className)),
          h(
            "div.econ-items",
            types?.map((d) => h(LinkCard, { href: `/lex/structures/${d.structure_id}` }, UpperCase(d.name)))
          ),
        ])
      )
    ),
  ])
}

function groupByClass(items) {
  return items.reduce((acc, item) => {
    const className = item.class.toLowerCase();
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(item);
    return acc;
  }, {});
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
