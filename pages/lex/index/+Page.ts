import { LinkCard, StickyHeader } from "~/components";
import h from "./+Page.module.sass";
import { useData } from "vike-react/useData";
import { useState } from "react";
import { Tag, Dialog, Icon } from "@blueprintjs/core";
import { LexSearchPrompt } from "~/components/lex/search-omnibar";

export function Page() {
  const { res } = useData();

  // Not sure why this is needed, but I digress...
  if (res == null) return null;

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
      h(
        "a",
        { href: "/columns" },
        h("p.stat", `${formatNumber(columns)} columns`)
      ),
      h("p.stat", `${formatNumber(packages)} packages`),
      h("p.stat", `${formatNumber(units)} units`),
      h("p.stat", `${formatNumber(measurements)} measurements`),
    ]),
    h(LexSearchPrompt),
    h("div.body-content", [
      h("h2", "Dictionaries"),
      h(
        LinkCard,
        { href: "/lex/strat-names", title: "Geologic names" },
        "Names of rock units, organized hierarchically and concepts that capture relationships between differently-named rock units"
      ),
      h(
        LinkCard,
        { href: "/lex/lithologies", title: "Lithologies" },
        "Names and hierarchies for geological materials"
      ),

      h(
        LinkCard,
        { href: "/lex/intervals", title: "Intervals" },
        "Time intervals"
      ),
      h(
        LinkCard,
        { href: "/lex/timescales", title: "Timescales" },
        "Groups of intervals used together to span intervals of time"
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
        h(
          "strong",
          h(
            "a",
            { href: "https://macrostrat.org/sift/#", target: "_blank" },
            "Sift"
          )
        ),
        ", Macrostrat's legacy lexicon app, is still available for use as it is gradually brought into this new framework.",
      ]),
      h(UpdatesExpandableDialog),
    ]),
  ]);
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function UpdatesExpandableDialog() {
  const [updateOpen, setUpdateOpen] = useState(false);

  return h("div.header", [
    h(
      Tag,
      {
        intent: "PRIMARY",
        active: updateOpen,
        onClick: () => setUpdateOpen(true),
      },
      "Updates"
    ),
    h(
      Dialog,
      {
        isOpen: updateOpen,
      },
      h(Updates, { setUpdateOpen })
    ),
  ]);
}

function Updates({ setUpdateOpen }) {
  const updates = [
    {
      title: "Added dictionaries",
      description:
        "Added new lexicon dictionaries for lithology attributes, environments, economic uses, minerals, and structures.",
      slug: "version-4.1.0/save-location",
      version: "2.0.0",
    },
  ];

  return h("div.update-container", [
    h(
      StickyHeader,
      h("div.update-title", [
        h("h2", "Recent Updates"),
        h(Icon, {
          className: "close-btn",
          icon: "cross",
          onClick: () => setUpdateOpen(false),
        }),
      ])
    ),
    h("div.update-list", [
      updates.map((update) =>
        h("div.update", [
          h("div.update-title", [
            h("h3.title", update.title),
            h(Tag, { intent: "success" }, `v${update.version}`),
          ]),
          // h("div.description", [
          //   h(DocsVideo, { slug: update.slug }),
          //   h("p", update.description),
          // ]),
        ])
      ),
    ]),
  ]);
}
