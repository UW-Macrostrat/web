import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { LinkCard, PageBreadcrumbs, StickyHeader } from "~/components";
import { Card, Icon, Spinner } from "@blueprintjs/core";
import { useState, useEffect, useRef } from "react";
import { ContentPage } from "~/layouts";
import { Loading, SearchBar } from "../../index";

export function Page() {
  const [input, setInput] = useState("");
  const [lastID, setLastID] = useState(0);
  const [data, setData] = useState([]);
  const pageSize = 20;
  const result = useStratData(lastID, input, pageSize);


  useEffect(() => {
    if (result) {
      setData((prevData) => [...prevData, ...result]);
    }
  }, [result]);

  useEffect(() => {
    // Example: Reset data if lastID changes
    setData([]);
  }, [input]);

  if (data == null) return h(Loading);

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  return h(ContentPage, [
    h(StickyHeader, [
      h("div.header", [
        h(PageBreadcrumbs, { title: "Strat Names" }),
        h("div.sift-link", [
          h("p", "This page is is in development."),
          h(
            "a",
            { href: "/sift/definitions/strat_names", target: "_blank" },
            "View in Sift"
          ),
        ]),
      ]),
      h(SearchBar, {
        placeholder: "Filter by name...",
        onChange: handleChange,
      }),
    ]),
    h(
      "div.strat-list",
      h(
        "div.strat-items",
        data.map((data) => h(StratItem, { data }))
      )
    ),
    LoadMoreTrigger({ data, setLastID, pageSize, result }),
  ]);
}

function StratItem({ data }) {
  const { strat_name, strat_name_id } = data;

  return h(LinkCard, { href: "/lex/strat-names/" + strat_name_id }, strat_name);
}

function useStratData(lastID, input, pageSize) {
  const result = useAPIResult(
    `${SETTINGS.apiV2Prefix}/defs/strat_names?page_size=${pageSize}&last_id=${lastID}&strat_name_like=${input}`
  );
  console.log("API result:", `${SETTINGS.apiV2Prefix}/defs/strat_names?page_size=${pageSize}&last_id=${lastID}&strat_name_like=${input}`);
  return result?.success?.data;
}

function LoadMoreTrigger({ data, setLastID, pageSize, result }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          setLastID(data[data.length - 1].strat_name_id);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}
