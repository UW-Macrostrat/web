import { HotkeysProvider } from "@blueprintjs/core";
import DataSheet from "@macrostrat/data-sheet2";
import { useState } from "react";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useAsyncEffect } from "@macrostrat/ui-components";
import { ColorCell } from "@macrostrat/data-sheet2";
import { Region } from "@blueprintjs/table";
import { PageBreadcrumbs } from "~/renderer";
import { debounce } from "underscore";
import {
  LongTextViewer,
  IntervalCell,
  lithologyRenderer,
  ExpandedLithologies,
} from "~/components/legend-table";
import { postgrest } from "~/providers";
import { useRef, useReducer } from "react";

const h = hyper.styled(styles);

function preprocessData(data) {
  return data.map((d) => {
    const { best_age_bottom, best_age_top, ...rest } = d;
    return {
      ...rest,
      model_age: [best_age_bottom, best_age_top],
    };
  });
}

export function Page() {
  // const [data, setData] = useState(null);

  // useAsyncEffect(async () => {
  //   const res = await postgrest
  //     .from("legend")
  //     .select(
  //       "source_id, legend_id, name, strat_name, age, lith, descrip, comments, liths, b_interval, t_interval, best_age_bottom, best_age_top, unit_ids, concept_ids"
  //     )
  //     .order("legend_id", { ascending: true })
  //     .limit(100);
  //   setData(preprocessData(res.data));
  // }, []);

  const { data, onScroll } = useLazyLoadedPostgRESTData();

  if (data == null) {
    return h("div", "Loading...");
  }

  return h(
    HotkeysProvider,
    h(FullscreenPage, { className: "main" }, [
      h(PageBreadcrumbs),
      h("h1", "Map legend units"),
      h(DataSheet, {
        data,
        editable: false,
        columnSpecOptions,
        onVisibleCellsChange(visibleCells) {
          onScroll(visibleCells);
        },
      }),
    ])
  );
}

const columnSpecOptions = {
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

interface ChunkIndex {
  startRow: number;
  endRow: number;
  lastValue: any;
}

interface LazyLoaderState<T> {
  data: (T | null)[];
  loading: boolean;
  error: Error | null;
  chunkSize: number;
  sortKey: string;
  visibleRegion: RowRegion;
}

type LazyLoaderAction<T> =
  | { type: "start-loading" }
  | { type: "loaded"; data: T[]; offset: number; totalSize: number }
  | { type: "error"; error: Error }
  | { type: "set-visible"; region: RowRegion };

function adjustArraySize<T>(arr: T[], newSize: number) {
  if (newSize == null || arr.length === newSize) {
    return arr;
  } else if (arr.length > newSize) {
    // Trim the array
    arr = arr.slice(0, newSize);
  }
  return [...arr, ...Array(newSize - arr.length).fill(null)];
}

function lazyLoadingReducer<T>(
  state: LazyLoaderState<T>,
  action: LazyLoaderAction<T>
): LazyLoaderState<T> {
  console.log(action);
  switch (action.type) {
    case "start-loading":
      return {
        ...state,
        loading: true,
      };
    case "set-visible":
      return {
        ...state,
        visibleRegion: action.region,
      };
    case "loaded":
      let data = adjustArraySize(state.data, action.totalSize);
      for (let i = 0; i < action.data.length; i++) {
        data[action.offset + i] = action.data[i];
      }
      //data.splice(action.offset, action.data.length, ...action.data);

      return {
        ...state,
        data,
        loading: false,
      };
    case "error":
      return {
        ...state,
        error: action.error,
        loading: false,
      };
    default:
      return state;
  }
}

interface RowRegion {
  rowIndexStart: number;
  rowIndexEnd: number;
}

enum LoadDirection {
  "up",
  "down",
}

function overlapsNulls(data: any[], region: RowRegion) {
  for (let i = region.rowIndexStart; i < region.rowIndexEnd; i++) {
    if (data[i] == null) {
      return true;
    }
  }
  return false;
}

function distanceToNextNonEmptyRow(
  data: any[],
  start: number,
  direction: LoadDirection,
  limit: number
): number {
  let i = start;
  while (i < data.length && i > 0 && limit > 0) {
    if (data[i] != null) {
      return i;
    }
    i += direction === LoadDirection.down ? 1 : -1;
    limit -= 1;
  }
  return i;
}

async function loadMoreData<T>(state: LazyLoaderState<T>, dispatch: any) {
  const rowIndex = indexOfFirstNullInRegion(state.data, state.visibleRegion);
  if (state.loading || rowIndex == null) {
    return;
  }

  let opts = undefined;

  dispatch({ type: "start-loading" });

  // Allows random seeking
  const isInitialQuery = state.data.length === 0;
  if (isInitialQuery) {
    opts = { count: "exact" };
  }
  let query = postgrest.from("legend").select("*", opts);

  // This only works for forward queries
  if (!isInitialQuery) {
    const val = state.data[rowIndex - 1]?.[state.sortKey];
    query = query.gt(state.sortKey, val);
  }

  query = query
    .order(state.sortKey, { ascending: true })
    .limit(state.chunkSize);

  const res = await query;

  console.log(res);

  const { data, count } = res;

  dispatch({
    type: "loaded",
    data,
    offset: rowIndex,
    totalSize: count,
  });
}

function useLazyLoadedPostgRESTData() {
  const initialState: LazyLoaderState<any> = {
    data: [],
    loading: false,
    error: null,
    totalSize: 0,
    chunkSize: 100,
    sortKey: "legend_id",
    visibleRegion: { rowIndexStart: 0, rowIndexEnd: 1 },
  };

  const [state, dispatch] = useReducer(lazyLoadingReducer, initialState);
  const { data, loading } = state;

  useAsyncEffect(async () => {
    loadMoreData(state, dispatch);
  }, [data, loading, state.visibleRegion]);

  return {
    data,
    loading,
    onScroll(visibleCells: RowRegion) {
      dispatch({
        type: "set-visible",
        region: visibleCells,
      });
    },
  };
}

function getRowIndexToLoadFrom<T>(
  data: (T | null)[],
  visibleRegion: RowRegion,
  chunkSize: number
) {
  return indexOfFirstNullInRegion(data, visibleRegion);
}

function indexOfFirstNullInRegion(
  data: any[],
  region: RowRegion
): number | null {
  for (let i = region.rowIndexStart; i < region.rowIndexEnd; i++) {
    if (data[i] == null) {
      return i;
    }
  }
  return null;
}
