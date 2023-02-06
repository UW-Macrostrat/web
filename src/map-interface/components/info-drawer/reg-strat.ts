import h from "@macrostrat/hyper";
import { ExpansionPanel } from "../expansion-panel";
import { addCommas } from "~/map-interface/utils";
import { useAppState } from "~/map-interface/app-state";
import { Spinner } from "@blueprintjs/core";

function MapAttribute(props) {
  return h("div.map-source-attr", [
    h("span.attr", [props.label]),
    ...props.content,
  ]);
}

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
      h.if(columnInfo != null)(ColumnData, { columnInfo }),
    ]
  );
}

function ColumnData({ columnInfo }) {
  return h("div.column-data", [
    h(MapAttribute, {
      label: "Name: ",
      content: [columnInfo.col_name],
    }),
    h(MapAttribute, {
      label: "Column ID: ",
      content: [columnInfo.col_id],
    }),
    h(MapAttribute, {
      label: "Group: ",
      content: [columnInfo.col_group],
    }),
    h(MapAttribute, {
      label: "Group ID: ",
      content: [columnInfo.col_group_id],
    }),
    h(MapAttribute, {
      label: "Thickness: ",
      content: [
        addCommas(parseInt(columnInfo.min_thick)),
        " - ",
        addCommas(parseInt(columnInfo.max_thick)),
        h("span.age-ma", ["m"]),
      ],
    }),
    h(MapAttribute, {
      label: "Age: ",
      content: [
        columnInfo.b_age,
        " - ",
        columnInfo.t_age,
        " ",
        h("span.age-ma", ["Ma"]),
      ],
    }),
    h(MapAttribute, {
      label: "Area: ",
      content: [addCommas(columnInfo.area), " ", h("span.age-ma", ["km2"])],
    }),
    h(MapAttribute, {
      label: "Fossil collections: ",
      content: [addCommas(columnInfo.pbdb_collections)],
    }),
    h(MapAttribute, {
      label: "Fossil occurences: ",
      content: [addCommas(columnInfo.pbdb_occs)],
    }),
  ]);
}

export { RegionalStratigraphy };
