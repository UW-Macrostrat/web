import { HotkeysProvider, Spinner } from "@blueprintjs/core";
import { DataSheet, ColorCell } from "@macrostrat/data-sheet";
import { FullscreenHeaderPage } from "~/layouts";
import h from "./main.module.sass";
import {
  LongTextViewer,
  IntervalCell,
  lithologyRenderer,
  ExpandedLithologies,
} from "~/components/data-table";
import { useLegendData } from "../utils";
import { useData } from "vike-react/useData";

export function Page() {
  const { mapInfo } = useData();
  const data = useLegendData(mapInfo);

  let content = h(Spinner);
  if (data != null) {
    content = h(LegendSheet, { data });
  }

  return h(HotkeysProvider, h(FullscreenHeaderPage, content));
}

function LegendSheet({ data }) {
  return h(DataSheet, {
    data,
    columnSpecOptions: {
      overrides: {
        liths: {
          name: "Lithologies",
          valueRenderer: lithologyRenderer,
          dataEditor: ExpandedLithologies,
        },
        name: "Unit name",
        comments: "Comments",
        legend_id: "Legend ID",
        strat_name: "Stratigraphic names",
        b_interval: {
          name: "Lower",
          cellComponent: IntervalCell,
        },
        t_interval: {
          name: "Upper",
          cellComponent: IntervalCell,
        },
        color: {
          name: "Color",
          cellComponent: ColorCell,
        },
        descrip: {
          name: "Description",
          dataEditor: LongTextViewer,
        },
      },
    },
  });
}
