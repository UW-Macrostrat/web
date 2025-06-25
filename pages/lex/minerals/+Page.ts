import h from "./main.module.sass";
import { useAPIResult, InfiniteScrollView } from "@macrostrat/ui-components";
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
    h(InfiniteScrollView, {
      params: {
        order: "id.asc",
        mineral: `ilike.*${input}*`,
        id: `gt.${lastID}`,
        limit: pageSize,
      },
      route: `${apiDomain}/api/pg/minerals`,
      getNextParams,
      initialData: res,
      itemComponent: MineralItem,
    })
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

  return result;
}

function getNextParams(response, params) {
  console.log("getNextParams", response, params, "gt." + response[response.length - 1].id);
  return {
    ...params,
    id: "gt." + response[response.length - 1].id,
  };
}