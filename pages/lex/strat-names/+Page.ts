import h from "./main.module.sass";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiDomain } from "@macrostrat-web/settings";
import { StickyHeader, LinkCard, PageBreadcrumbs, Link } from "~/components";
import { Card, Spinner } from "@blueprintjs/core";
import { useState, useEffect, useRef } from "react";
import { ContentPage } from "~/layouts";
import { SearchBar } from "~/components/general";
import { useData } from "vike-react/useData";

export function Page() {
  const { res } = useData();
  const startingID = res[res.length - 1].combined_id

  const [input, setInput] = useState("");
  const [lastID, setLastID] = useState(startingID);
  const [data, setData] = useState(res);
  const pageSize = 20;

  const result = useStratData(lastID, input, pageSize);
  const prevInputRef = useRef(input);

  useEffect(() => {
    if (
      prevInputRef.current !== input
    ) {
      setData([]);
      setLastID(0);

      prevInputRef.current = input;
    }
  }, [input]);

  useEffect(() => {
    if (
      result &&
      data[data.length - 1]?.combined_id !==
        result[result.length - 1]?.combined_id
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
        title: "Strat Names"
      }),
      h("div.header-description", [
        h(
          Card,
          {
            className: "strat-name-card"
          },
          [
            h("strong", "Strat Names: "),
            h("span", "names of rock units, organized hierarchically"),
          ]
        ),
        h(
          Card,
          {
            className: "strat-concept-card"
          },
          [
            h("strong", "Strat Concepts: "),
            h(
              "span",
              "capture relationships between differently-named rock units"
            ),
          ]
        ),
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
        data.map((data) => h(StratItem, { data, input }))
      )
    ),
    LoadMoreTrigger({ data, setLastID, pageSize, result }),
  ]);
}

function StratItem({ data, input }) {
  const { concept_id, id } = data;
  const isConcept = !id;

  return h(
    LinkCard,
    {
      href: `/lex/${
        isConcept ? "strat-name-concepts/" + concept_id : "strat-names/" + id
      }`,
      className: isConcept ? "strat-concept-card" : "strat-name-card",
    },
    isConcept ? ConceptBody({ data, input }) : StratBody({ data })
  );
}

function StratBody({ data }) {
  const { name, id, rank } = data;

  return h('div.strat-name', [
    h("strong",`${name} ${rank} (#${id})`),
    h('div.strat-tag', "Name")
  ]);
}

function ConceptBody({ data, input }) {
  const { name, strat_ids, strat_names, concept_id, strat_ranks } = data;

  const ids = strat_ids?.split(",");
  const names = strat_names?.split(",");
  const ranks = strat_ranks?.split(",");
  let strats = ids?.map((id, index) => ({
    id,
    name: names[index],
    rank: ranks[index],
  }));

  // only show strats that match the input
  if (strats?.some((s) => (s.name.toLowerCase()).includes(input.toLowerCase()))) {
    strats = strats.filter((s) => (s.name.toLowerCase()).includes(input.toLowerCase()));
  }

  return h("div.concept-body", [
    h('div.concept', [
      h("strong",`${name} (#${concept_id})`),
      h('div.concept-tag', "Concept")
    ]),
    h("ul.concept-strats", [
      strats?.map(({ id, name, rank }) =>
        h('li.strat-name', [
          h(
            Link,
            { href: `/lex/strat-names/${id}` },
            `${name} ${rank} (#${id})`
          ),
          h('div.strat-tag', "Name")
        ]
        )
      ),
    ]),
  ]);
}

function useStratData(lastID, input, pageSize) {
  const url = `${apiDomain}/api/pg/strat_combined?limit=${pageSize}&combined_id=gt.${lastID}&order=combined_id.asc&all_names=ilike.*${input}*`;

  const result = useAPIResult(url);

  return result;
}

function LoadMoreTrigger({
  data,
  setLastID,
  pageSize,
  result,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          const id = data[data.length - 1].combined_id;

          setLastID(id);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}
