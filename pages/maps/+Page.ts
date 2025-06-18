import h from "./main.module.scss";
import { Spinner, Switch, AnchorButton } from "@blueprintjs/core";
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

  const [input, setInput] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  console.log("activeOnly", activeOnly);

  const startingID = sources[sources.length - 1].source_id;
  const [lastID, setLastID] = useState(startingID);
  const [data, setData] = useState(sources);
  const pageSize = 20;

  const result = useSourceData(lastID, input, pageSize, activeOnly);
  const prevInputRef = useRef(input);
  const prevActiveOnlyRef = useRef(activeOnly);

  useEffect(() => {
    if (prevInputRef.current !== input || prevActiveOnlyRef.current !== activeOnly) {
      setData([]);
      setLastID(0);

      prevInputRef.current = input;
      prevActiveOnlyRef.current = activeOnly;
    }
  }, [input, activeOnly]);

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

  return h('div.maps-page', [
    h(AssistantLinks, { className: "assistant-links" }, [
      h(
        AnchorButton,
        { icon: "flows", href: "/maps/ingestion" },
        "Ingestion system"
      ),
      h(AnchorButton, { icon: "map", href: "/map/sources" }, "Show on map"),
      h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
    ]),
    h(ContentPage, [
      h(StickyHeader, {className: "header"}, [
        h(PageBreadcrumbs, {
          title: "Maps",
        }),
        h(SearchBar, {
          placeholder: "Filter by name...",
          onChange: handleChange,
        }),
        h(Switch, {
          label: "Active only",
          checked: activeOnly,
          onChange: () => setActiveOnly(!activeOnly),
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
    ]),

  ]);
}

function useSourceData(lastID, input, pageSize, activeOnly) {
  const url = `${apiDomain}/api/pg/sources_metadata`;

  const result = useAPIResult(url, {
      is_finalized: activeOnly ? "eq.true" : undefined,
      status_code: activeOnly ? "eq.active" : undefined,
      source_id: `gt.${lastID}`,
      name: `ilike.%${input}%`,
      limit: pageSize,
      order: "source_id.asc",
  });
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
    },
    [
      h("div.title", [
        h("h2", { className: "name" }, name + ` (#${source_id})`),
        h("div", { className: "size " + scale },scale),
      ]),
      h("a", { href: url, target: "_blank" }, ref_title)
    ]
  );
}