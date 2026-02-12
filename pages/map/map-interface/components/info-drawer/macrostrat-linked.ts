import { AgeChip } from "../info-blocks";
import {
  ExpandableDetailsPanel,
  ExpansionBody,
  ExpansionPanel,
} from "@macrostrat/map-interface";
import {
  DataField,
  EnvironmentsList,
  LithologyList,
  Parenthetical,
  Tag,
  TagField,
  Value,
} from "@macrostrat/data-components";
import { ThicknessField } from "@macrostrat/column-views";
import { AgeRefinementPlot } from "./age-refinement-plot.ts";
import h from "./main.module.sass";
import type { ReactNode } from "react";

function MacrostratLinkedData(props) {
  const { mapInfo, expanded, source } = props;

  if (!mapInfo.mapData[0]) return null;

  return h(
    ExpansionPanel,
    {
      className: "regional-panel",
      title: "Macrostrat-linked data",
      helpText: "via Macrostrat",
      expanded,
    },
    [
      h("div", { classes: expansionPanelDetailClasses }, [
        h(MatchBasis, { source }),
        h(AgeInformation, { mapInfo, source }),
        h(Thickness, { source }),
        h(LithsAndClasses, { source }),
        h(Environments, { source }),
        h(Economy, { source }),
        h(FossilInfo, { source }),
      ]),
    ]
  );
}

const expansionPanelDetailClasses = {
  root: "expansion-panel-detail",
};

function AgeInformation(props) {
  const { source, mapInfo } = props;
  const { macrostrat } = source;

  if (!macrostrat?.b_age) return h(MapAgeRenderer, { mapInfo });

  return h(MacrostratAgeInfo, { macrostrat, mapInfo });
}

function MapAgeRenderer(props) {
  const { mapInfo, ...rest } = props;
  return h(
    DescribedAgeInfo,
    {
      ageElement: h(AgeChip, {
        b_int: mapInfo.mapData[0].b_int,
        t_int: mapInfo.mapData[0].t_int,
      }),
    },
    "Based on geologic map description."
  );
}

function DescribedAgeInfo(props) {
  const { ageElement, children, className } = props;

  return h("div.described-age.macrostrast-detail", [
    h("div.expansion-summary-title", "Age"),
    h("div.age-chips", null, ageElement),
    h("div.description", children),
  ]);
}

function MacrostratAgeInfoCore({ macrostrat }) {
  const { b_age, t_age, b_int, t_int } = macrostrat;

  if (!b_age) return null;

  let age = b_int.int_name;
  if (b_int.int_id !== t_int.int_id) {
    age += ` - ${t_int.int_name}`;
  }
  return h(
    DescribedAgeInfo,
    {
      ageElement: h(AgeChip, {
        b_int: { ...b_int, int_name: age, b_age, t_age },
        t_int: { ...b_int, int_name: age, b_age, t_age },
      }),
    },
    "Refined using the Macrostrat age model."
  );
}

function MacrostratAgeInfo(props) {
  return h(
    ExpandableDetailsPanel,
    { headerElement: h(MacrostratAgeInfoCore, props) },
    h(ExpansionBody, { title: "Age refinement" }, h(AgeRefinementPlot, props))
  );
}

function MatchBasis(props) {
  const { source } = props;
  if (!source.macrostrat?.strat_names) return null;

  return h(
    ExpandableDetailsPanel,
    {
      className: "macrostrat-unit",
      headerElement: h([
        h("h3", source.macrostrat.strat_names[0].rank_name),
        h("div.description", "Matched unit"),
      ]),
    },
    h(ExpansionBody, { title: "All matched names" }, [
      source.macrostrat.strat_names.map((name, i) => {
        let lastElement: boolean =
          i == source.macrostrat.strat_names.length - 1;
        return h("span", { key: i }, [
          h(
            "a.externalLink",
            {
              href: "/sift/#/strat_name/" + name.strat_name_id,
              key: i,
            },
            [name.rank_name]
          ),
          h.if(!lastElement)([", "]),
        ]);
      }),
    ])
  );
}

function Thickness(props) {
  const { source } = props;
  const max_thick = source.macrostrat?.max_thick;
  if (max_thick == null || max_thick == 0) return null;

  const unit = { max_thick, min_thick: source.macrostrat?.min_min_thick };

  return h(ThicknessField, { unit });
}

function addSeparators(values: ReactNode[]) {
  const result: ReactNode[] = [];
  values.forEach((val, i) => {
    result.push(val);
    if (i < values.length - 1) {
      result.push(", ");
    }
  });
  return result;
}

function FossilInfo(props) {
  const { source } = props;
  const { macrostrat } = source;
  if (macrostrat == null) return null;

  const values = {
    collections: macrostrat.pbdb_collections,
    occurrences: macrostrat.pbdb_occs,
  };

  const children = addSeparators(
    Object.entries(values)
      .map(([key, val]) => {
        if (val == null) return null;
        return h(Value, { value: val, unit: key });
      })
      .filter(Boolean)
  );

  return h(
    DataField,
    {
      label: "Fossils ",
      value: children,
    },
    [h("span.data-source", "via PBDB")]
  );
}

function LithsAndClasses(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { liths = null, lith_types = null } = macrostrat;

  if (!liths || liths.length == 0) return null;

  const lithologies = liths.map((lith) => {
    return {
      ...lith,
      name: lith.lith,
      color: lith.color || "#000000",
    };
  });

  return h(
    ExpandableDetailsPanel,
    {
      headerElement: h(TypesList, { label: "Lithology", data: lith_types }),
    },
    h(
      ExpansionBody,
      h(LithologyList, {
        label: "Matched lithologies",
        lithologies,
      })
    )
  );
}

function TypesList(props) {
  /** List for higher-level type/class attributes (e.g. environment types, economic types)
   * that might not have specific IDs
   */
  const { data, label } = props;

  if (!data || data.length == 0) return null;

  return h(
    TagField,
    { label },
    data.map((d) => {
      let name = d.name;
      if (name == null || name == "") name = "other";
      return h(Tag, { name, color: d.color ?? "#888" });
    })
  );
}

function Environments(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { environs = null, environ_types = null } = macrostrat;

  if (!environs || environs.length == 0) return null;

  const environments = environs.map((environ) => {
    return {
      ...environ,
      name: environ.environ,
      color: environ.color || "#000000",
    };
  });

  return h(
    ExpandableDetailsPanel,
    {
      headerElement: h(TypesList, {
        label: "Environment",
        data: environ_types,
      }),
    },
    h(ExpansionBody, [
      h(EnvironmentsList, {
        label: "Matched environments",
        environments,
      }),
    ])
  );
}

function Economy(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { econs = null, econ_types = null } = macrostrat;
  if (!econs || econs.length == 0) return null;
  return h(
    ExpandableDetailsPanel,
    {
      headerElement: h(TypesList, { label: "Economy", data: econ_types }),
    },
    h(ExpansionBody, [
      h(
        TagField,
        { label: "Matched economic attributes" },
        econs.map((econ, i) => {
          return h(Tag, {
            key: i,
            name: econ.econ,
            color: econ.color,
          });
        })
      ),
    ])
  );
}

export { MacrostratLinkedData };
