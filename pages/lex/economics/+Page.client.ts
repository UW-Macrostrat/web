import h from "./main.module.scss";
import { useState } from "react";
import { LexListPage } from "~/components/lex";
import { useData } from "vike-react/useData";
import { SearchBar } from "~/components/general";
import { LexHierarchy } from "@macrostrat-web/lithology-hierarchy";
import { navigate } from "vike/client/router";

export function Page() {
  const { res } = useData();
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

  const search = h(SearchBar, {
    placeHolder: "Search economics...",
    onChange: handleChange,
  });

  return h(LexListPage, { className: "econ-list-page", controls: search }, [
    h(LexHierarchy, {
      data: filtered,
      onClick: (e, item) => navigate(`/lex/economics/${item.econ_id}`),
    }),
  ]);
}
