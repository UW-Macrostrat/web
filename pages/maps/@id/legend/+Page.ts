import { HotkeysProvider, Spinner, Tag } from "@blueprintjs/core";
import DataSheet from "@macrostrat/data-sheet2";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { ColorCell } from "@macrostrat/data-sheet2";
import { PageBreadcrumbs } from "~/components";
import {
  LongTextViewer,
  IntervalCell,
  lithologyRenderer,
  ExpandedLithologies,
} from "~/components/legend-table";
import { useLegendData } from "../utils";
import { useData } from "vike-react/useData";

const h = hyper.styled(styles);

export function Page() {
  const map = useData();
  const data = useLegendData(map);

  if (data == null) {
    return h(Spinner);
  }

  return h(
    HotkeysProvider,
    h(FullscreenPage, { className: "main" }, [
      h(PageBreadcrumbs),
      h("h1", map.name + " map units"),
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
