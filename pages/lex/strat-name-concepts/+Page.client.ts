import h from "./main.module.scss";
import {
  useAPIResult,
} from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import {
  StickyHeader,
  LinkCard,
  PageBreadcrumbs,
} from "~/components";
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
    setData([]);
  }, [input]);

  if (data == null) return h(Loading);

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  return h(ContentPage, [
    h(StickyHeader, [
      h(PageBreadcrumbs, { title: "Strat Name Concepts" }),
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
  const { name, concept_id } = data;

  return h(LinkCard, { href: "/lex/strat-name-concepts/" + concept_id }, name);
}

function useStratData(lastID, input, pageSize) {
  const result = useAPIResult(
    `${SETTINGS.apiV2Prefix}/defs/strat_name_concepts?page_size=${pageSize}&last_id=${lastID}&concept_like=${input}`
  );
  return result?.success?.data;
}

function LoadMoreTrigger({ data, setLastID, pageSize, result }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          setLastID(data[data.length - 1].concept_id);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}
