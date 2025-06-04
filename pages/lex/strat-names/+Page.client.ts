import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { StickyHeader, LinkCard, PageBreadcrumbs } from "~/components";
import { Card, Switch, Spinner } from "@blueprintjs/core";
import { useState, useEffect, useRef } from "react";
import { ContentPage } from "~/layouts";
import { Loading, SearchBar } from "../../index";

export function Page() {
  return StratPage({ show: false });
}

export function StratPage({ show }) {
  const [input, setInput] = useState("");
  const [showConcepts, setShowConcepts] = useState(show ?? false);
  const [lastID, setLastID] = useState(0);
  const [data, setData] = useState([]);
  const pageSize = 20;

  const strat_name_vars = {
    title: "Strat Names",
    item_route: "/strat-names/",
    data_route: "strat_names",
    like: "strat_name_like",
  };

  const concept_vars = {
    title: "Strat Name Concepts",
    item_route: "/strat-name-concepts/",
    data_route: "strat_name_concepts",
    like: "concept_like",
  };

  const vars = showConcepts ? concept_vars : strat_name_vars;

  const { title, item_route, data_route, like } = vars;

  const result = useStratData(lastID, input, pageSize, data_route, like);

  useEffect(() => {
    if (result) {
      setData((prevData) => [...prevData, ...result]);
    }
  }, [result]);

  useEffect(() => {
    setData([]);
    setLastID(0);
  }, [input, showConcepts]);

  if (data == null) return h(Loading);

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  return h(ContentPage, [
    h(StickyHeader, { className: "header" }, [
      h(PageBreadcrumbs, { title }),
      h("div.header-description", [
        h("p", [
          h("strong", "Strat Names: "),
          h("span", "names of rock units, organized hierarchically"),
        ]),
        h("p", [
          h("strong", "Strat Concepts: "),
          h(
            "span",
            "capture relationships between differently-named rock units"
          ),
        ]),
      ]),
      h(Card, { className: "filter" }, [
        h(SearchBar, {
          placeholder: "Filter by name...",
          onChange: handleChange,
        }),
        h(Switch, {
          label: "Include concepts",
          checked: showConcepts,
          onChange: (e) => {
            setShowConcepts(e.target.checked);
          },
        }),
      ]),
    ]),
    h(
      "div.strat-list",
      h(
        "div.strat-items",
        data.map((data) => h(StratItem, { data, item_route }))
      )
    ),
    LoadMoreTrigger({ data, setLastID, pageSize, result, showConcepts }),
  ]);
}

function StratItem({ data, item_route }) {
  const { name, concept_id, strat_name, strat_name_id } = data;

  return h(
    LinkCard,
    { href: `/lex/${item_route}/` + (concept_id ?? strat_name_id) },
    name ?? strat_name ?? "Unnamed"
  );
}

function useStratData(lastID, input, pageSize, data_route, like) {
  const url = `${SETTINGS.apiV2Prefix}/defs/${data_route}?page_size=${pageSize}&last_id=${lastID}&${like}=${input}`;

  const result = useAPIResult(url);
  return result?.success?.data;
}

function LoadMoreTrigger({ data, setLastID, pageSize, result, showConcepts }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          const id1 = data[data.length - 1]?.concept_id;
          const id2 = data[data.length - 1]?.strat_name_id;

          setLastID(showConcepts ? id1 : id2);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}
