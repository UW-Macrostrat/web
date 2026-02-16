import {
  ExpandableDetailsPanel,
  ExpansionPanel,
  DataField,
  EnvironmentsList,
  LithologyList,
  Tag,
  TagField,
  Value,
  Parenthetical,
} from "@macrostrat/data-components";
import {
  AgeField,
  ThicknessField,
  IntervalProportions,
  Duration,
} from "@macrostrat/column-views";
import { AgeRefinementPlot } from "./age-refinement-plot.ts";
import h from "./main.module.sass";
import type { ReactNode } from "react";

import { useAppState } from "#/map/map-interface/app-state";
import { Spinner } from "@blueprintjs/core";
import { Link } from "react-router-dom";

function RegionalStratigraphy(props) {
  const { mapInfo, columnInfo } = props;
  if (mapInfo?.mapData == null) return null;

  const fetchingColumnInfo = useAppState((s) => s.core.fetchingColumnInfo);

  return h(
    ExpansionPanel,
    {
      classes: { root: "regional-panel" },
      title: "Regional stratigraphy",
      expanded: true,
    },
    [
      h.if(fetchingColumnInfo)(Spinner),
      h.if(columnInfo != null)(BasicColumnInfo, { columnInfo }),
    ]
  );
}

function BasicColumnInfo({ columnInfo }) {
  return h("div.column-data", [
    h("h4", [
      h(Link, { to: "column" }, columnInfo.col_name),
      h.if(columnInfo.col_group)([" — ", columnInfo.col_group]),
    ]),
  ]);
}

export { RegionalStratigraphy };

export function MacrostratLinkedData(props) {
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
      h(MatchBasis, { source }),
      h(AgeInformation, { mapInfo, source }),
      h(Thickness, { source }),
      h(LithsAndClasses, { source }),
      h(Environments, { source }),
      h(Economy, { source }),
      h(MapFossilInfo, { source }),
    ]
  );
}

function AgeInformation(props) {
  const { source, mapInfo } = props;
  const { macrostrat } = source;

  if (!macrostrat?.b_age) return h(MapAgeInfo, { mapInfo });

  return h(MacrostratAgeInfo, { macrostrat, mapInfo });
}

function MapAgeInfo(props) {
  const { mapInfo } = props;
  console.log(mapInfo);
  const unit = {
    b_int_id: mapInfo.mapData[0].b_int.int_id,
    t_int_id: mapInfo.mapData[0].t_int.int_id,
  };
  return h(DataField, { label: "Age" }, [
    h(IntervalProportions, { unit, showAgeRange: true, multiLine: true }),
    h("p.description", "Based on geologic map description."),
  ]);
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

  const unit = { b_int_id: b_int.int_id, t_int_id: t_int.int_id, b_age, t_age };

  return h(AgeField, { unit }, [
    h(Parenthetical, h(Duration, { value: unit.b_age - unit.t_age })),
    h(IntervalProportions, {
      unit,
    }),
  ]);
}

function MacrostratAgeInfo(props) {
  return h(
    ExpandableDetailsPanel,
    { headerElement: h(MacrostratAgeInfoCore, props) },
    h(
      DataField,
      { className: "age-refinement", label: "Age refinement" },
      h(AgeRefinementPlot, props)
    )
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
    h(DataField, { label: "All matched names" }, [
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

function MapFossilInfo(props) {
  const { source } = props;
  const { macrostrat } = source;
  if (macrostrat == null) return null;

  return h(FossilInfo, {
    collections: macrostrat.pbdb_collections,
    occurrences: macrostrat.pbdb_occs,
  });
}

export function FossilInfo(props): {
  collections: number;
  occurrences: number;
} {
  // May not be any fossil info
  const { collections, occurrences } = props;
  if (!collections && !occurrences) return null;
  const values = { collections, occurrences };

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
    h(LithologyList, {
      label: "Matched lithologies",
      lithologies,
    })
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
    h(EnvironmentsList, {
      label: "Matched environments",
      environments,
    })
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
    )
  );
}
