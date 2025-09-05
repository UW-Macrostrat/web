import h from "./main.module.scss";
import { PageBreadcrumbs, StickyHeader } from "~/components";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { useData } from "vike-react/useData";
import { SearchBar } from "~/components/general";
import { LexHierarchy } from "@macrostrat-web/lithology-hierarchy";
import { navigate } from "vike/client/router";

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

  return h(ContentPage, { className: "econ-list-page" }, [
    h(StickyHeader, [
      h(PageBreadcrumbs, { title }),
      h(SearchBar, {
        placeHolder: "Search economics...",
        onChange: handleChange,
      }),
    ]),
    h(LexHierarchy, { data: filtered, onClick: (e, item) => navigate(`/lex/${route}/${item[id]}`) }),
  ]);
}