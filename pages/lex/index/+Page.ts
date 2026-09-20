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

  return h("div.lex-index", [
    h("p.lead", [
      "The homepage of Macrostrat's geological lexicons, assembled from many ",
      "sources including Canada's ",
      h(
        "a",
        { href: "https://weblex.canada.ca/weblexnet4/weblex_e.aspx" },
        "WebLex"
      ),
      " and the USGS's ",
      h("a", { href: "https://ngmdb.usgs.gov/Geolex/search" }, "Geolex"),
      ". They are continually updated in partnership with researchers and data ",
      "providers.",
    ]),
    h("div.lex-stats", [
      h(Stat, { value: columns, label: "columns", href: "/columns" }),
      h(Stat, { value: packages, label: "packages" }),
      h(Stat, { value: units, label: "units" }),
      h(Stat, { value: measurements, label: "measurements" }),
    ]),
    h("div.lex-search", h(LexSearchPrompt)),
    h("section.dictionaries", [
      h("h2", "Dictionaries"),
      h(
        "div.dictionary-grid",
        dictionaries.map((item) =>
          h(
            LinkCard,
            {
              key: item.href,
              href: item.href,
              title: item.title,
              // Global (matched with `:global()` in the stylesheet): the card's
              // own class is hashed by the cards module, so the grid can only
              // reach it through a name it passes in itself.
              className: "dictionary-card",
            },
            item.text
          )
        )
      ),
    ]),
    h("p.lex-footnote", [
      h("a", { href: "https://macrostrat.org/sift/#", target: "_blank" }, "Sift"),
      ", Macrostrat's legacy lexicon app, is still available while it is ",
      "gradually brought into this framework.",
    ]),
    h(UpdatesExpandableDialog),
  ]);
}

/** The lexicon's dictionaries, as a list so the grid and the order live in one
 * place rather than in the markup. */
const dictionaries = [
  {
    href: "/lex/strat-names",
    title: "Geologic names",
    text: "Names of rock units, organized hierarchically, and the concepts that relate differently-named units to each other.",
  },
  {
    href: "/lex/lithologies",
    title: "Lithologies",
    text: "Names and hierarchies for geological materials.",
  },
  {
    href: "/lex/intervals",
    title: "Intervals",
    text: "Named spans of geologic time.",
  },
  {
    href: "/lex/timescales",
    title: "Timescales",
    text: "Groups of intervals used together to span time.",
  },
  {
    href: "/lex/lith-atts",
    title: "Lithology attributes",
    text: "Names and descriptions of lithology attributes.",
  },
  {
    href: "/lex/environments",
    title: "Environments",
    text: "Depositional environments and formation mechanisms.",
  },
  {
    href: "/lex/economics",
    title: "Economics",
    text: "Economic uses of geologic materials.",
  },
  {
    href: "/lex/minerals",
    title: "Minerals",
    text: "Mineral names and formulas.",
  },
  {
    href: "/lex/structures",
    title: "Structures",
    text: "Names and descriptions of geologic structures.",
  },
];

/** One figure in the row above the dictionaries. Linked when there is
 * somewhere to go. */
function Stat({ value, label, href = null }) {
  const body = [
    h("span.stat-value", formatNumber(value)),
    h("span.stat-label", label),
  ];
  if (href == null) {
    return h("div.stat", body);
  }
  return h("a.stat", { href }, body);
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
