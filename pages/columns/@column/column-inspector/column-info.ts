import h from "@macrostrat/hyper";
import { AgeField, ThicknessField } from "@macrostrat/column-views";
import { DataField } from "@macrostrat/data-components";
import { FossilInfo } from "#/map/map-interface/components/info-drawer/macrostrat-linked";

export function ColumnExtData({ columnInfo }) {
  const formattedArea = Math.round(columnInfo.area).toLocaleString();
  return h("div.column-data", [
    h(ThicknessField, { unit: columnInfo }),
    h(AgeField, { unit: columnInfo }),
    h(DataField, {
      label: "Area",
      value: formattedArea,
      unit: "km²",
    }),
    h(FossilInfo, {
      collections: columnInfo.pbdb_collections,
      occurrences: columnInfo.pbdb_occs,
    }),
  ]);
}
