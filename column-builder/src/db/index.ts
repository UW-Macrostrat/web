import { useEffect, useCallback, useState } from "react";
import {
  PostgrestClient,
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
  PostgrestResponse,
} from "@supabase/postgrest-js";

function isServer() {
  return typeof window === "undefined";
}
console.log(
  process.env.NEXT_PUBLIC_SERVER_URL,
  process.env.NEXT_PUBLIC_CLIENT_URL,
  process.env.NEXT_PUBLIC_TOPOLOGY_URL
);
// The address of the postgrest service is different between the client and the server!
const pg = new PostgrestClient(
  //@ts-ignore
  isServer()
    ? process.env.NEXT_PUBLIC_SERVER_URL
    : process.env.NEXT_PUBLIC_CLIENT_URL
);

/**
 * Fetch data using postgrestclient
 * Takes in a postgrestclient QueryBuilder or FilterBuilder
 * which are js objects, more at https://github.com/supabase/postgrest-js
 * returns data
 * @param query : A postgrest-js querybuilder or filterbuilder object
 */
function usePostgrest(
  query: PostgrestQueryBuilder<any> | PostgrestFilterBuilder<any>
) {
  const [result, setResult] = useState<any>(); // cop-out type for now

  const getData = useCallback(async () => {
    const { data, error } = await query;
    if (error) {
      console.error(error);
    } else {
      setResult(data);
    }
  }, [query]);

  useEffect(() => {
    getData();
  }, []);

  return result;
}
interface SelectTableI {
  match?: number | Record<string, unknown>;
  limit?: number;
  columns?: string | undefined;
}

/*
 * Helper hook to abstract some query building
 */
function useTableSelect(table: string, opts: SelectTableI) {
  let query = pg.from(table).select(opts.columns);
  if (opts.match) {
    if (typeof opts.match !== "number") {
      query = query.match(opts.match);
    } else {
      query = query.match({ id: opts.match });
    }
  }
  if (opts.limit) {
    query = query.limit(opts.limit);
  }
  return usePostgrest(query);
}

interface QueryOptsI {
  columns?: string;
  match?: number | Record<string, string | number>;
  limit?: number;
}

async function tableSelect(table: string, opts: QueryOptsI = {}) {
  let query = pg.from(table).select(opts.columns);
  if (opts.match) {
    if (typeof opts.match !== "number") {
      query = query.match(opts.match);
    } else {
      query = query.match({ id: opts.match });
    }
  }
  if (opts.limit) {
    query = query.limit(opts.limit);
  }

  return await query;
}

async function selectFirst(table: string, opts: QueryOptsI) {
  const { data, error }: PostgrestResponse<any> = await tableSelect(
    table,
    opts
  );

  const firstData = data ? data[0] : null;
  return { firstData, error };
}

interface UpdateTableI {
  id: number | Record<string, unknown>;
  changes: object;
}

async function tableUpdate(table: string, opts: UpdateTableI) {
  let query = pg.from(table).update(opts.changes);
  if (typeof opts.id !== "number") {
    query = query.match(opts.id);
  } else {
    query = query.match({ id: opts.id });
  }
  return await query;
}

/* 
  Hook for easy table inserts
*/
async function tableInsert(table: string, row: object) {
  let query = pg.from(table).insert([row]);
  return await query;
}

async function tableInsertMany(table: string, rows: object[]) {
  let query = pg.from(table).insert(rows);
  return await query;
}

export default pg;
export {
  usePostgrest,
  useTableSelect,
  tableUpdate,
  tableInsert,
  selectFirst,
  tableInsertMany,
  tableSelect,
  isServer,
};
