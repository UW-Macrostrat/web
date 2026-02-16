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
  useInteractionProps,
  isClickable,
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

export function RegionalStratigraphy(props) {
  const { mapInfo, columnInfo, source, expanded } = props;
  if (mapInfo?.mapData == null) return null;

  const fetchingColumnInfo = useAppState((s) => s.core.fetchingColumnInfo);
  const fetchingMapInfo = useAppState((s) => s.core.fetchingMapInfo);

  return h(
    ExpansionPanel,
    {
      classes: { root: "regional-panel" },
      title: "Regional stratigraphy",
      helpText: "via Macrostrat",
      expanded,
    },
    [
      h(RegionalStratigraphyContent, {
        mapInfo,
        columnInfo,
        fetching: fetchingColumnInfo || fetchingMapInfo,
        source,
      }),
    ]
  );
}

function RegionalStratigraphyContent(props) {
  const { mapInfo, columnInfo, source, fetching } = props;
  if (fetching) return h(Spinner);
  if (columnInfo == null || mapInfo == null) return null;

  return h("div.regional-stratigraphy", [
    h(BasicColumnInfo, { columnInfo }),
    h(MacrostratLinkedData, { mapInfo, source }),
  ]);
}

export function MacrostratLinkedData(props) {
  const { mapInfo, source } = props;

  if (!mapInfo.mapData[0]) return null;

  return h("div.unit-data", [
    h(MatchBasis, { source }),
    h(AgeInformation, { mapInfo, source }),
    h(Thickness, { source }),
    h(LithsAndClasses, { source }),
    h(Environments, { source }),
    h(Economy, { source }),
    h(MapFossilInfo, { source }),
  ]);
}

function BasicColumnInfo({ columnInfo }) {
  return h("div.column-info", [
    h("h3", [
      h(Link, { to: "column" }, columnInfo.col_name),
      h.if(columnInfo.col_group)([" — ", columnInfo.col_group]),
    ]),
  ]);
}

function AgeInformation(props) {
  const { source, mapInfo } = props;
  const { macrostrat } = source;

  if (!macrostrat?.b_age) return h(UnitAgeInfo, { mapInfo });

  return h(MacrostratAgeInfo, { macrostrat, mapInfo });
}

function UnitAgeInfo(props) {
  const { mapInfo } = props;
  const unit = {
    b_int_id: mapInfo.mapData[0].b_int.int_id,
    t_int_id: mapInfo.mapData[0].t_int.int_id,
  };
  return h(DataField, { label: "Age" }, [
    h(IntervalProportions, { unit, showAgeRange: true, multiLine: true }),
    h("p.description", "Based on geologic map description."),
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
    h(StratNamesField, { stratNames: source.macrostrat.strat_names })
  );
}

function StratNamesField(props: {
  stratNames: { strat_name_id: number; rank_name: string }[];
}) {
  /** Handling for stratigraphic name field */
  const { stratNames } = props;

  if (stratNames == null || stratNames.length == 0) return null;

  const names = stratNames.map((s) => {
    return h(StratNameVal, {
      strat_name_id: s.strat_name_id,
      name: s.rank_name,
    });
  });

  return h(DataField, { label: "All matched names" }, names);
}

function StratNameVal({ strat_name_id, name }) {
  const interactionProps = useInteractionProps({ strat_name_id });
  const clickable = isClickable(interactionProps);
  return h(clickable ? "a" : "span", { ...interactionProps }, name);
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
