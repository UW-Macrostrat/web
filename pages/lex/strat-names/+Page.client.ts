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
  const [showConcepts, setShowConcepts] = useState(show ?? false);
  const [lastID, setLastID] = useState(startingID);
  const [data, setData] = useState(res);
  const pageSize = 20;

  const strat_name_vars = {
    title: "Strat Names",
    item_route: "/strat-names/",
  };

  const concept_vars = {
    title: "Strat Name Concepts",
    item_route: "/strat-name-concepts/",
  };

  const vars = showConcepts ? concept_vars : strat_name_vars;

  const { title, item_route} = vars;

  const result = useStratData(lastID, input, pageSize, showConcepts);

  console.log(lastID);
  console.log("data", data);

  const prevInputRef = useRef(input);
  const prevShowConceptsRef = useRef(showConcepts);

  useEffect(() => {
    // Only reset if input or showConcepts actually changed from previous render
    if (
      prevInputRef.current !== input ||
      prevShowConceptsRef.current !== showConcepts
    ) {
      // Reset data and lastID to starting ID for current mode
      setData([]);
      setLastID(0);

      prevInputRef.current = input;
      prevShowConceptsRef.current = showConcepts;
    }
  }, [input, showConcepts]);

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
      h(PageBreadcrumbs, { title }),
      h("div.header-description", [
        h('div.card-container', [
          h('div', { className: "status " + (!showConcepts ? "active" : "inactive") }),
          h(
            Card,
            {
              className: !showConcepts ? "selected" : "unselected",
              onClick: () => {
                if (showConcepts) {
                  setShowConcepts(false);
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
              className: showConcepts ? "selected" : "unselected",
              onClick: () => {
                if (!showConcepts) {
                  setShowConcepts(true);
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
            setLastID(0);
            setData([]);
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
  const { name, concept_id, strat_name, id } = data;

  const isConcept = item_route === "/strat-name-concepts/";

  return h(
    LinkCard,
    { href: `/lex/${item_route}/` + (concept_id ?? id) },
    isConcept ? ConceptBody({ data }) : StratBody({ data })
  );
}

function StratBody({ data }) {
  const { strat_name, concept_id, concept_name } = data;

  return h("div.strat-body", [
    h("strong", strat_name),
    h.if(concept_id)('div.concept-container', [
      h("span", "Concept: "),
      h(Link, { className: "concept-tag", href: `/lex/strat-name-concepts/${concept_id}` }, concept_name)
    ]),
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
          { key: id, href: `/lex/strat-names/${id}` },
          names[index]
        )
      ),
    ]),
  ]);
}

function useStratData(lastID, input, pageSize, showConcepts) {
  const url1 = `${apiDomain}/api/pg/strat_names_test?limit=${pageSize}&id=gt.${lastID}&order=id.asc&strat_name=like.*${input}*`;
  const url2 = `${apiDomain}/api/pg/strat_concepts_test?limit=${pageSize}&concept_id=gt.${lastID}&order=concept_id.asc&name=like.*${input}*`;
  const url = showConcepts ? url2 : url1;

  const result = useAPIResult(url);
  console.log(url)
  console.log("result", result);

  return result;
}

function LoadMoreTrigger({ data, setLastID, pageSize, result, showConcepts }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (data.length > 0) {
          const id1 = data[data.length - 1]?.concept_id;
          const id2 = data[data.length - 1]?.id;

          setLastID(showConcepts ? id1 : id2);
        }
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [data, setLastID]);

  return h.if(result?.length == pageSize)("div.load-more", { ref }, h(Spinner));
}
