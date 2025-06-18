import h from "./main.module.scss";
import { Spinner } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import {
  PageHeader,
  DevLinkButton,
  AssistantLinks,
  LinkCard,
  StickyHeader,
} from "~/components";
import { useState, useRef, useEffect } from "react";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiDomain } from "@macrostrat-web/settings";
import { SearchBar } from "~/components/general";
import { useData } from "vike-react/useData";
import { PageBreadcrumbs } from "~/components";

export function Page() {
  const { sources } = useData();
  const startingID = sources[sources.length - 1].source_id;

  const [input, setInput] = useState("");
  const [lastID, setLastID] = useState(startingID);
  const [data, setData] = useState(sources);
  const pageSize = 20;

  const result = useSourceData(lastID, input, pageSize);
  const prevInputRef = useRef(input);

  console.log("result", result);

  useEffect(() => {
    if (prevInputRef.current !== input) {
      setData([]);
      setLastID(0);

      prevInputRef.current = input;
    }
  }, [input]);

  useEffect(() => {
    if (
      result &&
      data[data.length - 1]?.source_id !==
        result[result.length - 1]?.source_id
    ) {
      setData((prevData) => {
        return [...prevData, ...result];
      });
    }
  }, [result]);

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  return h(ContentPage, [
    h(StickyHeader, { className: "header" }, [
      h(PageBreadcrumbs, {
        title: "Maps",
      }),
      h(SearchBar, {
        placeholder: "Filter by name...",
        onChange: handleChange,
      }),
    ]),
    h(
      "div.strat-list",
      h(
        "div.strat-items",
        data.map((data) => h(SourceItem, { data }))
      )
    ),
    LoadMoreTrigger({ data, setLastID, pageSize, result }),
  ]);
}

function useSourceData(lastID, input, pageSize) {
  const url = `${apiDomain}/api/pg/sources_metadata?limit=${pageSize}&source_id=gt.${lastID}&order=source_id.asc&name=ilike.*${input}*&is_finalized=eq.true&status_code=eq.active`;

  const result = useAPIResult(url);

  return result;
}

function LoadMoreTrigger({ data, setLastID, pageSize, result }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          const id = data[data.length - 1].source_id;

          setLastID(id);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}

function SourceItem({ data }) {
  const { source_id, name, ref_title, url, scale } = data;
  const href = `/maps/${source_id}`;

  return h(
    LinkCard,
    {
      href,
      title: h("div.title", [
        h("h1", name),
        h("div", { className: "size " + scale }, scale),
      ]),
    },
    [h("a", { href: url, target: "_blank" }, ref_title)]
  );
}