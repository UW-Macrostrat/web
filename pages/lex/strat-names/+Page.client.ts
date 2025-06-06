import h from "./main.module.sass";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiV2Prefix, apiDomain } from "@macrostrat-web/settings";
import { StickyHeader, LinkCard, PageBreadcrumbs, Link } from "~/components";
import { Card, Switch, Spinner } from "@blueprintjs/core";
import { useState, useEffect, useRef } from "react";
import { ContentPage } from "~/layouts";
import { Loading, SearchBar } from "../../index";
import { useData } from "vike-react/useData";

export function Page() {
  return StratPage({ show: false });
}

export function StratPage({ show }) {
  const { res } = useData();
  console.log("res", res);
  const startingID = show
    ? res[res?.length - 1]?.concept_id
    : res[res?.length - 1]?.id;

  const [input, setInput] = useState("");
  const [showConcepts, setShowConcepts] = useState(show);
  const [showNames, setShowNames] = useState(!show);
  const [lastID, setLastID] = useState(startingID);
  const [data, setData] = useState(res);
  const showBoth = showConcepts && showNames;
  const pageSize = 20;

  const result = useStratData(lastID, input, pageSize, showBoth, showNames);
  const prevInputRef = useRef(input);
  const prevShowConceptsRef = useRef(showConcepts);
  const prevShowNamesRef = useRef(showNames);
  console.log("lastID", lastID);  

  useEffect(() => {
    if (
      prevInputRef.current !== input ||
      prevShowConceptsRef.current !== showConcepts ||
      prevShowNamesRef.current !== showNames
    ) {
      setData([]);
      setLastID(0);

      prevInputRef.current = input;
      prevShowConceptsRef.current = showConcepts;
      prevShowNamesRef.current = showNames;
    }
  }, [input, showConcepts, showNames]);

  useEffect(() => {
    if (
      result &&
      data[data.length - 1]?.[showConcepts ? "concept_id" : "id"] !==
        result[result.length - 1]?.[
          showConcepts ? "concept_id" : "id"
        ]
    ) {
      setData((prevData) => {
        return [...prevData, ...result];
      });
    }
  }, [result]);

  if (data == null) return h(Loading);

  const handleChange = (event) => {
    setInput(event.toLowerCase());
  };

  return h(ContentPage, [
    h(StickyHeader, { className: "header" }, [
      h(PageBreadcrumbs, { title: showNames && showConcepts ? "Strat Names & Concepts" : showNames ? "Strat Names" : "Strat Concepts" }),
      h("div.header-description", [
        h('div.card-container', [
          h('div', { className: "status " + (showNames ? "active" : "inactive") }),
          h(
            Card,
            {
              className: "strat-name-card " + (!showNames || showConcepts ? "clickable" : ""),
              onClick: () => {
                if (!showNames || showConcepts) {
                  setShowNames(!showNames);
                  setLastID(0);
                  setData([]);
                }
              },
            },
            [
              h("strong", "Strat Names: "),
              h("span", "names of rock units, organized hierarchically"),
            ]
          ),
        ]),
        h('div.card-container', [
          h('div', { className: "status " + (showConcepts ? "active" : "inactive") }),
          h(
            Card,
            {
              className: "strat-concept-card " + (showNames || !showConcepts ? "clickable" : ""),
              onClick: () => {
                if (showNames || !showConcepts) {
                  setShowConcepts(!showConcepts);
                  setLastID(0);
                  setData([]);
                }
              },
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
    LoadMoreTrigger({ data, setLastID, pageSize, result, showBoth, showNames }),
  ]);
}

function StratItem({ data }) {
  const { concept_id, id } = data;
  const isConcept = !id;

  return h(
    LinkCard,
    { href: `/lex/${isConcept ? "strat-name-concepts/" + concept_id : "strat-names/" + id}`, className: isConcept ? "strat-concept-card" : "strat-name-card" },
    isConcept ? ConceptBody({ data }) : StratBody({ data })
  );
}

function StratBody({ data }) {
  const { name, concept_id, concept_name } = data;

  return h("div.strat-body", [
    h("strong", name),
    h.if(concept_id)(Link, { className: "concept-tag", href: `/lex/strat-name-concepts/${concept_id}` }, concept_name),
  ]);
}

function ConceptBody({ data }) {
  const { name, strat_ids, strat_names } = data;

  const ids = strat_ids?.split(",");
  const names = strat_names?.split(",");

  return h("div.concept-body", [
    h("strong", name),
    h("div.concept-strats", [
      ids?.map((id, index) =>
        h(
          Link,
          { className: "strat-tag", href: `/lex/strat-names/${id}` },
          names[index]
        )
      ),
    ]),
  ]);
}

function useStratData(lastID, input, pageSize, showBoth, showNames) {
  const url1 = `${apiDomain}/api/pg/strat_names_test?limit=${pageSize}&id=gt.${lastID}&order=id.asc&name=ilike.*${input}*`;
  const url2 = `${apiDomain}/api/pg/strat_concepts_test?limit=${pageSize}&concept_id=gt.${lastID}&order=concept_id.asc&name=ilike.*${input}*`;
  const url3 = `${apiDomain}/api/pg/strat_combined_test?limit=${pageSize}&combined_id=gt.${lastID}&order=combined_id.asc&name=ilike.*${input}*`;
  const url = showBoth ? url3 : showNames ? url1 :  url2;

  const result = useAPIResult(url);

  return result;
}

function LoadMoreTrigger({ data, setLastID, pageSize, result, showBoth, showNames }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          const id1 = data[data.length - 1]?.concept_id;
          const id2 = data[data.length - 1]?.id;
          const id3 = data[data.length - 1]?.combined_id;

          setLastID(showBoth ? id3 : showNames ? id2 : id1);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}
