import { PostgrestClient } from "@supabase/postgrest-js";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { useEffect, useState, useRef } from "react";

export type FilterState = {
  match?: string;
  candidates?: boolean;
};

export const defaultFilterState: FilterState = {
  match: "",
  candidates: null,
};

const postgrest = new PostgrestClient(postgrestPrefix);

export function useDebouncedStratNames(
  filters: FilterState,
  opts: { perPage: number; delay: number },
  initialData = null
): [
  { data: any; error: any; isLoading: boolean; hasMore: boolean },
  () => void
] {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastID, setLastID] = useState(null);
  const { perPage, delay } = opts;

  const loadNextPage = () => {
    setLastID(data[data.length - 1]?.id ?? 0);
  };

  const prevFilters = useRef<FilterState>();

  useEffect(() => {
    let timerId: any;
    const controller = new AbortController();

    if (prevFilters.current == null && initialData != null) {
      prevFilters.current = filters;
      return;
    }

    const fetchData = async () => {
      let startingData = data;
      let startingOffset = lastID;
      if (prevFilters.current != filters) {
        startingData = [];
        startingOffset = 0;
        setLastID(startingOffset);
        setData(startingData);
      }
      prevFilters.current = filters;
      setIsLoading(true);
      try {
        const newData = await fetchStratNames(
          filters,
          startingOffset,
          perPage,
          controller.signal
        );
        const prevData = startingData ?? [];
        setData([...prevData, ...newData]);
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Fetch cancelled");
        } else {
          setError(error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    timerId = setTimeout(fetchData, delay);

    return () => {
      clearTimeout(timerId);
      controller.abort();
    };
  }, [filters, delay, lastID, perPage]);

  return [{ data, error, isLoading, hasMore: data?.length > 0 }, loadNextPage];
}

export async function fetchStratNames(
  filters: FilterState = {},
  afterId = 0,
  perPage = 20,
  abortSignal?: AbortSignal
) {
  let base = postgrest.from("strat_names_units_kg").select("*");
  if (filters.match != null && filters.match != "") {
    base = base.ilike("strat_name", `%${filters.match}%`);
  }
  if (filters.candidates ?? false) {
    base = base.not("kg_liths", "is", null);
  }

  const q = base
    .order("id", { ascending: true })
    .gt("id", afterId)
    .limit(perPage)
    .abortSignal(abortSignal);
  try {
    const res = await q;
    const data = res.data;
    const error = res.error;
    if (error != null) {
      throw error;
    }

    return data?.map((d) => processStratName(d));
  } catch (e) {
    throw e;
  }
}

function deduplicateArray<T = any>(arr: T[], keyFn = (d) => d.id): T[] {
  let index = {};
  for (const item of arr) {
    const ident = keyFn(item);
    if (ident == null) {
      continue;
    }
    index[ident] = item;
  }
  return Object.values(index);
}

type Attr = {
  id: number;
  name: string;
  type: string;
};

type Lith = {
  id: number;
  name: string;
  props?: Array<number>;
  atts: Array<Attr>;
  units: Array<number>;
};

export function processStratName(d, includeColors = false) {
  // Deduplicate liths array
  const { units, kg_liths, ...rest } = d;
  let lithIndex = {};
  // Create an index of liths
  for (const unit of units ?? []) {
    for (const lith of unit.liths) {
      lithIndex[lith.id] ??= { ...lith, atts: [], props: [], units: [] };
      lithIndex[lith.id].props.push(lith.prop);
      lithIndex[lith.id].units.push(unit.id);
      if (lith.atts != null && lith.atts.length > 0) {
        lithIndex[lith.id].atts.push(...lith.atts);
      }
    }
  }

  const processAtts = (atts: Attr[]): Attr[] => {
    const attsLength = atts?.length ?? 0;
    if (attsLength === 0) {
      return atts ?? [];
    }
    let atts1 = deduplicateArray(atts);

    if (!includeColors) {
      atts1 = atts1.filter((att) => {
        return att.type != "color";
      });
    }

    atts1 = atts1.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    return atts1;
  };

  const liths = Object.values(lithIndex).map((lith: Lith) => {
    return {
      ...lith,
      atts: processAtts(lith.atts),
    };
  });

  const kgLithsNew = kg_liths?.map((lith) => {
    return {
      ...lith,
      atts: processAtts(lith.atts),
    };
  });

  return {
    ...rest,
    units:
      units?.map((unit) => {
        return { id: unit.id, col_id: unit.col_id };
      }) ?? [],
    liths,
    kg_liths: kgLithsNew,
  };
}
