import { LinkCard, PageHeader } from "~/components";
import { ContentPage } from "~/layouts";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import h from "./+Page.module.sass";
import { Loading, Footer } from "~/components/general";

export function Page() {
  const res = useAPIResult(apiV2Prefix + "/stats?all")?.success?.data;

  if (!res) return h(ContentPage, Loading);

  const seen = new Set();
  const stats = res.filter((project) => {
    if (seen.has(project.project_id)) return false;
    seen.add(project.project_id);
    return true;
  });

  console.log("Lexicon stats", stats);

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

  return h('div', [
    h(ContentPage, [
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
        { href: "/lex/environments", title: "Environments" },
        "Depositional environments and formation mechanisms"
      ),
      h(
        LinkCard,
        { href: "/lex/economics", title: "Economics" },
        "Economic uses of geologic materials"
      ),

      h("p", [
        h("strong", h("a", { href: "/sift" }, "Sift")),
        ", Macrostrat's legacy lexicon app, is still available for use as it is gradually brought into this new framework.",
      ]),
    ]),
    h(Footer)
  ]);
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
