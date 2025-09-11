import h from "./main.module.scss";
import { PageBreadcrumbs, StickyHeader } from "~/components";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { useData } from "vike-react/useData";
import { SearchBar } from "~/components/general";
import { LithologyTag } from "~/components/lex/tag";

export function Page() {
  const { res } = useData();  
  return h(LexListPage, { res, title: "Economics", route: "economics", id: "econ_id" });
}

export function LexListPage({ res, title, route, id }) {
  const [input, setInput] = useState("");

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
      h(PageBreadcrumbs, { title }),
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
                group.map((d) => h(LithologyTag, { data: d, href: `/lex/${route}/${d[id]}` }))
              ),
            ])
          ),
        ])
      )
    ),
  ]);
}

function groupByClassThenType(items) {
  return items.reduce((acc, item) => {
    const { class: className, type } = item;

    if (!type || type.trim() === "") {
      return acc; 
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
