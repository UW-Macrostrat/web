import { HotkeysProvider, Spinner } from "@blueprintjs/core";
import { DataSheet, ColorCell } from "@macrostrat/data-sheet";
import { FullscreenPage } from "~/layouts";
import h from "./main.module.sass";
import { PageBreadcrumbs } from "~/components";
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

  if (data == null) {
    return h(Spinner);
  }

  return h(
    HotkeysProvider,
    h(FullscreenPage, { className: "main" }, [
      h(PageBreadcrumbs),
      h("h1", mapInfo.name + " map units"),
      h(DataSheet, {
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
      }),
    ])
  );
}
