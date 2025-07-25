import { LinkCard, PageHeader } from "~/components";
import { ContentPage } from "~/layouts";
import { PostgRESTInfiniteScrollView } from "@macrostrat/ui-components";
import h from "./+Page.module.sass";
import { useData } from "vike-react/useData";
import { Footer } from "~/components/general";
import { SearchBar } from "~/components/general";
import { useState } from "react";
import { ExpansionPanel } from "@macrostrat/map-interface";

export function Page() {
  const { res } = useData();
  const [showBody, setShowBody] = useState(true);

  const seen = new Set();
  const stats = res.filter((project) => {
    if (seen.has(project.project_id)) return false;
    seen.add(project.project_id);
    return true;
  });

  let columns = 0,
    packages = 0,
    units = 0,
    measurements = 0;

  stats.forEach((stat) => {
    columns += stat.columns || 0;
    packages += stat.packages || 0;
    units += stat.units || 0;
    measurements += stat.measurements || 0;
  });

  return h("div", [
    h(ContentPage, { className: "content-page" }, [
      h(PageHeader, { title: "Lexicon" }),
      h("p", [
        "This is the homepage of Macrostrat's geological lexicons, which are assembled from many data sources including Canada's ",
        h(
          "a",
          { href: "https://weblex.canada.ca/weblexnet4/weblex_e.aspx" },
          "WebLex"
        ),
        ", the USGS's ",
        h("a", { href: "https://ngmdb.usgs.gov/Geolex/search" }, "Geolex"),
        ", and other sources. The lexicon is continually updated in partnership with researchers and data providers.",
      ]),
      h("div.stats-table", [
        h("p.stat", `${formatNumber(columns)} columns`),
        h("p.stat", `${formatNumber(packages)} packages`),
        h("p.stat", `${formatNumber(units)} units`),
        h("p.stat", `${formatNumber(measurements)} measurements`),
      ]),

      h(SearchContainer, { setShowBody }),

      h.if(showBody)("div.body-content", [
        h("h2", "Dictionaries"),
        h(
          LinkCard,
          { href: "/lex/strat-names", title: "Stratigraphic names" },
          "Names of rock units, organized hierarchically and concepts that capture relationships between differently-named rock units"
        ),

        h(
          LinkCard,
          { href: "/lex/intervals", title: "Intervals" },
          "Time intervals"
        ),
        h(
          LinkCard,
          { href: "/lex/timescales", title: "Timescales" },
          "Continuous representations of relative geologic time"
        ),
        h(
          LinkCard,
          { href: "/lex/lithology", title: "Lithologies" },
          "Names of geologic materials"
        ),
        h(
          LinkCard,
          { href: "/lex/lith-atts", title: "Lithology attributes" },
          "Names and descriptions of lithology attributes"
        ),
        h(
          LinkCard,
          { href: "/lex/environments", title: "Environments" },
          "Depositional environments and formation mechanisms"
        ),
        h(
          LinkCard,
          { href: "/lex/economics", title: "Economics" },
          "Economic uses of geologic materials"
        ),
        h(
          LinkCard,
          { href: "/lex/minerals", title: "Minerals" },
          "Mineral names and formulas"
        ),
        h(
          LinkCard,
          { href: "/lex/structures", title: "Structures" },
          "Names and descriptions of geologic structures"
        ),

        h("p", [
          h("strong", h("a", { href: "/sift" }, "Sift")),
          ", Macrostrat's legacy lexicon app, is still available for use as it is gradually brought into this new framework.",
        ]),
      ]),
    ]),
    h(Footer),
  ]);
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function SearchContainer({ setShowBody }) {
  return h(PostgRESTInfiniteScrollView, {
    limit: 20,
    id_key: "id",
    filterable: true,
    ascending: true,
    route: "https://dev2.macrostrat.org/api/pg/autocomplete",
    delay: 100,
    searchColumns: [{ value: "name", label: "Name" }],
    group_key: "type",
    groups: [
      { value: "econs", label: "Economics" },
      { value: "maps", label: "Maps" },
      { value: "environments", label: "Environments" },
      { value: "groups", label: "Column groups" },
      { value: "columns", label: "Columns" },
      { value: "intervals", label: "Intervals" },
      { value: "lithologies", label: "Lithologies" },
      { value: "lithology_attributes", label: "Lithology attributes" },
      { value: "projects", label: "Projects" },
      { value: "strat_name_concepts", label: "Strat name concepts" },
      { value: "structures", label: "Structures" },
      { value: "minerals", label: "Minerals" },
    ],
    itemComponent: LexCard,
    SearchBarComponent: SearchBar,
    GroupingComponent: ExpansionPanel,
    filter_threshold: 2,
  })
}

function LexCard({data}) {
  const type = data.type || "other";
  const href = type === "column" ? 
    `/columns/${data.id}` :
    type === "project" ?
    `/lex/projects/${data.id}` :
    type === "map" ?
    `/lex/maps/${data.id}` :
    type === "environment" ?
    `/lex/environments/${data.id}` :
    type === "interval" ?
    `/lex/intervals/${data.id}` :
    type === "lithologies" ?
    `/lex/lithology/${data.id}` :
    type === "mineral" ?
    `/lex/minerals/${data.id}` :
    type === 'strat_name_concepts' ?
    `/lex/strat-concepts/${data.id}` :
    type === "lithology_attributes" ?
    `/lex/lith-atts/${data.id}` :
    type === "structure" ?
    `/lex/structures/${data.id}` :
    `/lex/${type}/${data.id}`;

  return h('div', h('a', { href }, data.name));
}