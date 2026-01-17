import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { DataSheetDensity, PostgRESTTableView } from "@macrostrat/data-sheet";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { PageBreadcrumbs } from "~/components";
import {
  LongTextViewer,
  lithologyRenderer,
  ExpandedLithologies,
} from "~/components/data-table";
import { IntervalCell } from "@macrostrat/data-sheet";
import { usePageContext } from "vike-react/usePageContext";
import {
  MacrostratDataProvider,
  useMacrostratData,
  useMacrostratStore,
} from "@macrostrat/column-views";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { useCallback, useMemo } from "react";
import { Cell } from "@blueprintjs/table";
import { Spinner } from "@blueprintjs/core";

const h = hyper.styled(styles);

export function Page() {
  const { routeParams } = usePageContext();
  const { section_id } = routeParams as { section_id: string };

  return h(FullscreenPage, { className: "main" }, [
    h(PageBreadcrumbs),
    h("h1", "Unit boundaries"),
    h(
      MacrostratDataProvider,
      { baseURL: apiV2Prefix },
      h(SectionPostgRESTTable, { section_id })
    ),
  ]);
}

function SectionPostgRESTTable(props) {
  const { section_id } = props;
  const filter = useCallback(
    (query) => query.eq("section_id", section_id),
    [section_id]
  );

  // Force the loading of intervals data
  // This is a hack due to poor design of the data loading system
  useMacrostratData("intervals");

  return h(PostgRESTTableView, {
    endpoint: postgrestPrefix,
    table: "unit_boundaries",
    order: { key: "t1_age", ascending: true },
    columnOptions,
    filter,
    density: DataSheetDensity.MEDIUM,
    editable: true,
  });
}

function IntervalIDCell(props) {
  const { value } = props;

  const intervalsMap = useMacrostratStore((d) => d.intervals);
  const val = useMemo(
    () => intervalsMap.get(parseInt(value)),
    [intervalsMap, value]
  );

  if (val == null) return h(Cell, props);

  return h(IntervalCell, { ...props, value: val });
}

const columnOptions = {
  overrides: {
    id: {
      editable: false,
    },
    name: "Unit name",
    comments: "Comments",
    legend_id: "Legend ID",
    strat_name: "Stratigraphic names",
    t1: {
      name: "Interval",
      cellComponent: IntervalIDCell,
    },
    t1_prop: {
      name: "Proportion",
      width: 80,
    },
    unit_id: {
      name: "Lower unit",
    },
    unit_id_2: {
      name: "Upper unit",
    },
    descrip: {
      name: "Description",
      dataEditor: LongTextViewer,
    },
  },
};
