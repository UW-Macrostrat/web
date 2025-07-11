import h from "./main.module.sass";
import { PostgRESTInfiniteScrollView } from "@macrostrat/ui-components";
import { apiDomain } from "@macrostrat-web/settings";
import { StickyHeader, LinkCard, PageBreadcrumbs, Link } from "~/components";
import { Card } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { SearchBar, StratTag } from "~/components/general";
import { useData } from "vike-react/useData";
import { MultiSelect } from "@blueprintjs/select";

const PAGE_SIZE = 20;

export function Page() {
  const { res } = useData();

  return h(ContentPage, [
    h(StickyHeader, { className: "header" }, [
      h(PageBreadcrumbs, {
        title: "Minerals",
      }),
      
    ]),
    h(PostgRESTInfiniteScrollView, {
      route: `${apiDomain}/api/pg/strat_combined`,
      initialItems: res,
      itemComponent: StratItem,
      id_key: "combined_id",
      limit: PAGE_SIZE,
      filterable: true,
      SearchBarComponent: SearchBar,
      MultiSelectComponent: MultiSelect,
      searchColumns: [
        { label: "Name", value: "all_names" },
      ],
      toggles: h("div.header-description", [
        h(
          Card,
          {
            className: "strat-name-card",
          },
          [
            h("strong", "Strat Names: "),
            h("span", "names of rock units, organized hierarchically"),
          ]
        ),
        h(
          Card,
          {
            className: "strat-concept-card",
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
    })
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

  return h("div.strat-name", [
    h("strong", `${name} ${rank} (#${id})`),
    h(StratTag, { isConcept: false }),
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
  if (strats?.some((s) => s.name.toLowerCase().includes(input?.toLowerCase()))) {
    console.log("Filtering strats", strats, input);
    strats = strats.filter((s) =>
      s.name.toLowerCase().includes(input?.toLowerCase())
    );
  }

  return h("div.concept-body", [
    h("div.concept", [
      h("strong", `${name} (#${concept_id})`),
      h(StratTag, { isConcept: true }),
    ]),
    h("ul.concept-strats", [
      strats?.map(({ id, name, rank }) =>
        h("li.strat-name", [
          h(
            Link,
            { href: `/lex/strat-names/${id}` },
            `${name} ${rank} (#${id})`
          ),
          h(StratTag, { isConcept: false }),
        ])
      ),
    ]),
  ]);
}