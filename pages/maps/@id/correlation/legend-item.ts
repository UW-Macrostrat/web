import { LegendItem } from "./types";
import h from "./main.module.sass";
import {
  DataField,
  IntervalField,
  LithologyList,
  LegendPanelHeader,
} from "~/components/unit-details";
import { Button } from "@blueprintjs/core";

export function LegendItemInformation({
  legendItem,
}: {
  legendItem: LegendItem;
}) {
  return h([
    h(LegendPanelHeader, { title: legendItem.name, id: legendItem.legend_id }),
    h("div.data", [
      h(DataField, {
        label: "Stratigraphic names",
        value: legendItem.strat_name,
      }),
      h(DataField, { label: "Age", value: legendItem.age }),
      h(DataField, {
        label: "Description",
        value: legendItem.descrip,
        inline: false,
      }),
      h(DataField, { label: "Comments", value: legendItem.comments }),
      h(DataField, { label: "Lithology", value: legendItem.lith }),
      h(LithologyList, { lithologies: legendItem.liths }),
      h(IntervalField, {
        intervals: [legendItem.b_interval, legendItem.t_interval],
      }),
      h(DataField, {
        label: "Best age",
        value: `${legendItem.best_age_bottom} - ${legendItem.best_age_top}`,
        unit: "Ma",
      }),
      h(DataField, { label: "Unit IDs", value: legendItem.unit_ids }),
      h(DataField, { label: "Concept IDs", value: legendItem.concept_ids }),
    ]),
  ]);
}
