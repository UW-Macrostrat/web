import {
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
  IntervalAgeRange,
} from "@macrostrat/data-components";
import { ThicknessField, Duration } from "@macrostrat/column-views";
import h from "./main.module.sass";
import type { ReactNode } from "react";

import {
  browserHistory,
  columnFootprintsAtom,
  useAppActions,
  useLocation,
  type ColumnFootprints,
} from "../../app-state";
import { AnchorButton, SegmentedControl, Spinner } from "@blueprintjs/core";
import { LinkCard } from "~/components/cards";
import { useAtomValue } from "jotai";
import { AttributeField } from "./attribute-hierarchy";
import { ColumnThumbnail } from "./column-thumbnail";

export function RegionalStratigraphy(props) {
  const { mapInfo, columnInfo, source, expanded, loading } = props;
  if (mapInfo?.mapData == null) return null;

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
        fetching: loading,
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
    h(ColumnCard, { columnInfo, source }),
    h(MacrostratLinkedData, { mapInfo, source }),
    h(FootprintControl),
  ]);
}

export function MacrostratLinkedData(props) {
  const { mapInfo, source } = props;

  if (!mapInfo.mapData[0]) return null;

  return h("div.unit-data", [
    h(MatchedUnits, { source }),
    h(MatchedUnitAge, { source }),
    h(Thickness, { source }),
    h(LithsAndClasses, { source }),
    h(Environments, { source }),
    h(Economy, { source }),
    h(MapFossilInfo, { source }),
  ]);
}

/** The column as one card: following it shows the column in this panel */
function ColumnCard({ columnInfo, source }) {
  const runAction = useAppActions();
  const { pathname } = useLocation();

  const onClick = (evt) => {
    if (evt.metaKey || evt.ctrlKey || evt.shiftKey) return;
    // Vike routes anchors from a document listener that ignores preventDefault
    evt.preventDefault();
    evt.stopPropagation();
    runAction({ type: "open-column-page" });
  };

  return h(
    LinkCard,
    {
      className: "column-card",
      density: "list",
      href: browserHistory.createHref({ pathname: pathname + "/column" }),
      label: "Show the stratigraphic column",
      nestedLinks: true,
      onClick,
    },
    h("div.column-card-body", [
      h(ColumnThumbnail, { source }),
      h("div.column-title", [
        h(ColumnTitle, { columnInfo }),
        h("div.description", "Stratigraphic column"),
      ]),
      h(ColumnPageButton, { col_id: columnInfo.col_id }),
    ])
  );
}

export function ColumnTitle({ columnInfo }) {
  return h("h3.column-name", [
    columnInfo.col_name,
    h.if(columnInfo.col_group)([" — ", columnInfo.col_group]),
  ]);
}

export function ColumnPageButton({ col_id }) {
  return h(AnchorButton, {
    className: "column-page-button",
    href: `/columns/${col_id}`,
    icon: "share",
    minimal: true,
    small: true,
    title: "Open the column page",
  });
}

const footprintOptions = [
  { label: "None", value: "none" },
  { label: "Selected", value: "selected" },
  { label: "All", value: "all" },
];

/** Which column footprints the map draws; applies across the page */
export function FootprintControl() {
  const footprints = useAtomValue(columnFootprintsAtom);
  const runAction = useAppActions();
  return h("div.footprint-control", [
    h("span.footprint-label", "Show footprints"),
    h(SegmentedControl, {
      small: true,
      options: footprintOptions,
      value: footprints,
      onValueChange(value: ColumnFootprints) {
        runAction({ type: "set-column-footprints", footprints: value });
      },
    }),
  ]);
}

/** Ages belong here only once a unit was matched; the geologic map section
 * carries the source's own age otherwise. */
function MatchedUnitAge({ source }) {
  const { macrostrat } = source;
  if (macrostrat?.b_age == null || macrostrat?.t_age == null) return null;
  const { b_age, t_age, b_int, t_int } = macrostrat;

  const unit = {
    b_int_id: b_int?.int_id,
    t_int_id: t_int?.int_id,
    b_age,
    t_age,
  };

  return h(DataField, { label: "Age" }, [
    h(IntervalAgeRange, { unit, flavor: "ages", verbose: true }),
    h(Parenthetical, h(Duration, { value: b_age - t_age })),
  ]);
}

/** Every stratigraphic name the map unit was matched to */
function MatchedUnits({ source }) {
  const stratNames = source.macrostrat?.strat_names;
  if (stratNames == null || stratNames.length == 0) return null;

  const names = stratNames.map((s, i) => {
    return h(StratNameVal, {
      key: s.strat_name_id ?? i,
      strat_name_id: s.strat_name_id,
      name: s.rank_name,
    });
  });

  let label = "Matched unit";
  if (stratNames.length > 1) label = "Matched units";

  return h("div.matched-units", [
    h("h3", addSeparators(names)),
    h("div.description", label),
  ]);
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
  const { liths = null, lith_types = null } = source.macrostrat ?? {};

  if (!liths || liths.length == 0) return null;

  const lithologies = liths.map((lith) => {
    return {
      ...lith,
      name: lith.lith,
      color: lith.color || "#000000",
    };
  });

  return h(
    AttributeField,
    {
      label: "Lithology",
      items: lithologies,
      types: lith_types,
      levelFields: ["lith_class", "lith_type"],
    },
    h(LithologyList, { label: "Matched lithologies", lithologies })
  );
}

function Environments(props) {
  const { source } = props;
  const { environs = null, environ_types = null } = source.macrostrat ?? {};

  if (!environs || environs.length == 0) return null;

  const environments = environs.map((environ) => {
    return {
      ...environ,
      name: environ.environ,
      color: environ.color || "#000000",
    };
  });

  return h(
    AttributeField,
    {
      label: "Environment",
      items: environments,
      types: environ_types,
      levelFields: ["environ_class", "environ_type"],
    },
    h(EnvironmentsList, { label: "Matched environments", environments })
  );
}

function Economy(props) {
  const { source } = props;
  const { econs = null, econ_types = null } = source.macrostrat ?? {};
  if (!econs || econs.length == 0) return null;

  const economics = econs.map((econ) => {
    return { ...econ, name: econ.econ };
  });

  return h(
    AttributeField,
    {
      label: "Economy",
      items: economics,
      types: econ_types,
      levelFields: ["econ_class", "econ_type"],
    },
    h(
      TagField,
      { label: "Matched economic attributes" },
      economics.map((econ, i) => {
        return h(Tag, { key: i, name: econ.name, color: econ.color });
      })
    )
  );
}
