import { LinkCard, PageHeader } from "~/components";
import { ContentPage } from "~/layouts";
import { apiDomain } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import h from "./+Page.module.sass";
import { useData } from "vike-react/useData";
import { Footer } from "~/components/general";
import { SearchBar } from "~/components/general";
import { useState } from "react";

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
  const [input, setInput] = useState("");
  const url = apiDomain + `/api/pg/autocomplete?name=ilike.*${input}*`;
  const data = useAPIResult(url) || [];

  if (data && input.length > 0) {
    setShowBody(false);
  } else {
    setShowBody(true);
  }

  return h("div.search-container", [
    h(SearchBar, {
      placeholder: "Search the geologic lexicon...",
      onChange: (e) => setInput(e),
    }),
    h(SearchResults, { data }),
  ]);
}

function SearchResults({ data }) {
  const categories = [
    "columns",
    "econs",
    "maps",
    "environments",
    "groups",
    "intervals",
    "lithologies",
    "lith_attributes",
    "projects",
    "strat_name_concepts",
    "structures",
    "minerals",
  ];

  console.log("Search results data:", data);

  const grouped = data?.reduce((acc, item) => {
    const category = item.type || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  console.log("Grouped data:", grouped);

  return h.if(Object.keys(grouped).length > 0)("div.search-results", [
    categories?.map((category) => {
      const items = grouped?.[category];
      if (!items || items?.length === 0) return;

      const link =
        category === "econs"
          ? "economics"
          : category === "lithologies"
          ? "lithology"
          : category === "strat_name_concepts"
          ? "strat-name-concepts"
          : category === "lith_att"
          ? "lith-atts"
          : category === "environ"
          ? "environments"
          : category === "intervals"
          ? "intervals"
          : category === "minerals"
          ? "minerals"
          : category === "structures"
          ? "structures"
          : category === "maps"
          ? "maps"
          : category === "projects"
          ? "projects"
          : category === "column"
          ? "columns"
          : category === "project"
          ? "projects"
          : category;

      return h("div.search-category", [
        h(
          "h3.category",
          (category.charAt(0).toUpperCase() + category.slice(1)).replace(
            /_/g,
            " "
          )
        ),
        h(
          "div.items",
          items?.map((item) => {
            const { name } = item;
            const href =
              category === "columns" ||
              category === "projects" ||
              category === "maps"
                ? `/${link}/${item.id}`
                : `/lex/${link}/${item.id}`;

                return h(
              "a.item",
              { href },
              name.charAt(0).toUpperCase() + name.slice(1)
            );
          })
        ),
      ]);
    }),
  ]);
}
