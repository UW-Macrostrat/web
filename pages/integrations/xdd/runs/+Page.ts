import { HotkeysProvider } from "@blueprintjs/core";
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
  PostgRESTTableView,
} from "~/components/legend-table";

const h = hyper.styled(styles);

export function Page() {
  return h(
    HotkeysProvider,
    h(FullscreenPage, { className: "main" }, [
      h(PageBreadcrumbs),
      h("h1", "Model runs"),
      h(PostgRESTTableView, {
        table: "kg_model_run",
        columnOptions,
        order: { key: "timestamp", ascending: false },
      }),
    ])
  );
}

const columnOptions = {
  overrides: {
    source_id: "Source",
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
};
