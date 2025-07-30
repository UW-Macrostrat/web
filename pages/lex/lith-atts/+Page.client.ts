import h from "@macrostrat/hyper";
import { LinkCard, PageBreadcrumbs, StickyHeader } from "~/components";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { useData } from "vike-react/useData";
import { SearchBar } from "~/components/general";

export function Page() {
  const [input, setInput] = useState("");
  const { res } = useData();

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  const filtered = res.filter((d) => {
    const name = d.name.toLowerCase();
    const type = d.type ? d.type.toLowerCase() : "";
    return name.includes(input) || type.includes(input);
  });

  const grouped = groupByType(filtered);

  return h(ContentPage, { className: "econ-list-page" }, [
    h(StickyHeader, [
      h(PageBreadcrumbs, { title: "Lithology Attributes" }),
      h(SearchBar, {
        placeHolder: "Search lithology attributes...",
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
            types?.map((d) =>
              h(
                LinkCard,
                { href: `/lex/lith-atts/${d.lith_att_id}` },
                UpperCase(d.name)
              )
            )
          ),
        ])
      )
    ),
  ]);
}

function groupByType(items) {
  return items.reduce((acc, item) => {
    const type = item.type.toLowerCase();
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {});
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
