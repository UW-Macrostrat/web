import h from "./main.module.scss";
import { LinkCard } from "~/components";
import { LexListPage } from "~/components/lex";
import { useState } from "react";
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
    const className = d.class.toLowerCase();
    const type = d.type ? d.type.toLowerCase() : "";
    return (
      name.includes(input) || className.includes(input) || type.includes(input)
    );
  });

  const grouped = groupByClass(filtered);

  const search = h(SearchBar, {
    placeHolder: "Search structures...",
    onChange: handleChange,
  });

  return h(LexListPage, { className: "econ-list-page", controls: search }, [
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
                { href: `/lex/structures/${d.structure_id}` },
                UpperCase(d.name)
              )
            )
          ),
        ])
      )
    ),
  ]);
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
