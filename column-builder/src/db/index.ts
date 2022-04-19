import { useEffect, useCallback, useState } from "react";
import {
  PostgrestClient,
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
} from "@supabase/postgrest-js";

const pg = new PostgrestClient("http://localhost:3001"); // this needs to be env set

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

interface TableHooksI {
  tableName: string;
}

interface SelectTableI extends TableHooksI {
  match?: number | Record<string, unknown>;
  limit?: number;
  columns?: string | undefined;
}

/*
 * Helper hook to abstract some query building
 */
function useTableSelect(props: SelectTableI) {
  let query = pg.from(props.tableName).select(props.columns);
  if (props.match) {
    if (typeof props.match !== "number") {
      query = query.match(props.match);
    } else {
      query = query.match({ id: props.match });
    }
  }
  if (props.limit) {
    query = query.limit(props.limit);
  }
  return usePostgrest(query);
}

interface UpdateTableI extends TableHooksI {
  id: number | Record<string, unknown>;
  changes: object;
}

async function tableUpdate(props: UpdateTableI) {
  let query = pg.from(props.tableName).update(props.changes);
  if (typeof props.id !== "number") {
    query = query.match(props.id);
  } else {
    query = query.match({ id: props.id });
  }
  return await query;
}

interface InsertTableI extends TableHooksI {
  row: object;
}

/* 
  Hook for easy table inserts
*/
async function tableInsert(props: InsertTableI) {
  const query = pg.from(props.tableName).insert([props.row]);
  return await query;
}

export default pg;
export { usePostgrest, useTableSelect, tableUpdate, tableInsert };
