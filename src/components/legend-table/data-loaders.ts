/** Lazy loading of data from a PostgREST endpoint */

import { useAsyncEffect } from "@macrostrat/ui-components";
import { debounce } from "underscore";
import { postgrest } from "~/_providers";
import { useReducer } from "react";
import update, { Spec } from "immutability-helper";

interface ChunkIndex {
  startRow: number;
  endRow: number;
  lastValue: any;
}

interface LazyLoaderState<T> {
  data: (T | null)[];
  loading: boolean;
  error: Error | null;
  visibleRegion: RowRegion;
}

type LazyLoaderAction<T> =
  | { type: "start-loading" }
  | { type: "loaded"; data: T[]; offset: number; totalSize: number }
  | { type: "error"; error: Error }
  | { type: "set-visible"; region: RowRegion }
  | { type: "update-data"; data: Map<number, T> };

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
    case "update-data":
      let spec: Spec<T[]> = {};
      for (let [key, value] of Array.from(action.data.entries())) {
        spec[key] = { $set: value };
      }

      console.log(spec);

      return {
        ...state,
        loading: false,
        data: update(state.data, spec),
      };
    case "loaded":
      let data = adjustArraySize(state.data, action.totalSize);
      data = [
        ...data.slice(0, action.offset),
        ...action.data,
        ...data.slice(action.offset + action.data.length),
      ];

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

interface QueryConfig {
  columns?: string;
  count?: "exact" | "estimated";
  limit?: number;
  offset?: number;
  order?: { key: string; ascending: boolean };
  after?: any;
}

function buildQuery<T>(endpoint: string, config: QueryConfig) {
  const { columns = "*", count } = config;
  const opts = { count };

  let query = postgrest.from(endpoint).select(columns, opts);

  if (config.order != null) {
    query = query.order(config.order.key, {
      ascending: config.order.ascending,
    });
    if (config.after != null) {
      const op = config.order.ascending ? "gt" : "lt";
      query = query[op](config.order.key, config.after);
    }
  }
  if (config.limit != null) {
    if (config.offset != null) {
      query = query.range(config.offset, config.offset + config.limit - 1);
      console.log(`Random seek from ${config.offset}, this will be slow`);
    } else {
      query = query.limit(config.limit);
    }
  }
  return query;
}

function loadMoreData<T>(
  endpoint: string,
  config: QueryConfig & { chunkSize: number },
  state: LazyLoaderState<T>,
  dispatch: any
) {
  const rowIndex = indexOfFirstNullInRegion(state.data, state.visibleRegion);
  if (state.loading || rowIndex == null) {
    return;
  }

  dispatch({ type: "start-loading" });

  const { chunkSize = 100, ...rest } = config;

  const sortKey = config.order?.key ?? "id";

  let cfg: QueryConfig = {
    ...rest,
    limit: chunkSize,
    offset: null,
  };

  // Allows random seeking
  const isInitialQuery = state.data.length === 0;
  if (isInitialQuery) {
    cfg.count = "exact";
  }

  // This only works for forward queries
  if (!isInitialQuery) {
    cfg.after = state.data[rowIndex - 1]?.[sortKey];
    if (cfg.after == null) {
      cfg.offset = rowIndex;
    }
  }

  const query = buildQuery(endpoint, cfg);

  const res = query.then((res) => {
    console.log("Result", res);
    const { data, count } = res;
    dispatch({
      type: "loaded",
      data,
      offset: rowIndex,
      totalSize: count,
    });
  });
}

type LazyLoaderOptions = Omit<QueryConfig, "count" | "offset" | "limit"> & {
  chunkSize?: number;
  sortKey?: string;
};

export function usePostgRESTLazyLoader(
  endpoint: string,
  config: LazyLoaderOptions = {}
) {
  const initialState: LazyLoaderState<any> = {
    data: [],
    loading: false,
    error: null,
    visibleRegion: { rowIndexStart: 0, rowIndexEnd: 1 },
  };

  const [state, dispatch] = useReducer(lazyLoadingReducer, initialState);
  const { data, loading } = state;

  useAsyncEffect(async () => {
    loadMoreData(endpoint, config, state, dispatch);
  }, [
    data,
    state.visibleRegion.rowIndexStart,
    state.visibleRegion.rowIndexEnd,
  ]);

  const onScroll = debounce((visibleCells: RowRegion) => {
    dispatch({
      type: "set-visible",
      region: visibleCells,
    });
  }, 500);

  return {
    data,
    loading,
    onScroll,
    dispatch,
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
