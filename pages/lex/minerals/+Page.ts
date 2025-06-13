import h from "./main.module.sass";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiDomain } from "@macrostrat-web/settings";
import { StickyHeader, LinkCard, PageBreadcrumbs, Link } from "~/components";
import { Spinner } from "@blueprintjs/core";
import { useState, useEffect, useRef } from "react";
import { ContentPage } from "~/layouts";
import { SearchBar } from "~/components/general";
import { useData } from "vike-react/useData";

export function Page() {
  const { res } = useData();
  const startingID = res[res.length - 1].id;

  const [input, setInput] = useState("");
  const [lastID, setLastID] = useState(startingID);
  const [data, setData] = useState(res);
  const pageSize = 20;

  const result = useMineralData(lastID, input, pageSize);
  const prevInputRef = useRef(input);

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
      data[data.length - 1]?.id !==
        result[result.length - 1]?.id
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
        title: "Minerals",
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
        data.map((data) => h(MineralItem, { data }))
      )
    ),
    LoadMoreTrigger({ data, setLastID, pageSize, result }),
  ]);
}

function MineralItem({ data }) {
  const { id, mineral } = data;

  return h(
    LinkCard,
    {
      href: `/lex/minerals/${id}`,
      className: "mineral-item",
      title: mineral,
    },
  );
}

function useMineralData(lastID, input, pageSize) {
  const url = `${apiDomain}/api/pg/minerals?limit=${pageSize}&id=gt.${lastID}&order=id.asc&mineral=ilike.*${input}*`;

  const result = useAPIResult(url);

  console.log("Mineral data fetched:", result);

  return result;
}

function LoadMoreTrigger({ data, setLastID, pageSize, result }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          const id = data[data.length - 1].id;

          setLastID(id);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}
