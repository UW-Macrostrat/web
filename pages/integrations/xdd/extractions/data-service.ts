import { PostgrestClient } from "@supabase/postgrest-js";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { useEffect, useState } from "react";

interface FilterDef {
  subject: string;
  op?: string;
  predicate: any;
  user_id?: string;
}

const postgrest = new PostgrestClient(postgrestPrefix);

export function usePostgresQuery(
  query: string,
  filters: FilterDef[] | FilterDef | null = null
) {
  const [data, setData] = useState(null);

  useEffect(() => {
    console.warn("usePostgresQuery should be moved to a separate package");
  }, []);

  let _filters: FilterDef[] = [];
  if (filters != null) {
    if (!Array.isArray(filters)) {
      _filters = [filters];
    } else {
      _filters = filters;
    }
  }

  useEffect(() => {
    let q = postgrest.from(query).select();

    for (const filter of _filters) {
      const { subject, op = "eq", predicate } = filter;
      q = q.filter(subject, op, predicate);
    }

    q.then((res) => {
      setData(res.data);
    });
  }, [query]);

  return data;
}

function useIndex(model, idField = "id") {
  const models = usePostgresQuery(model);
  if (models == null) return null;
  return new Map(models.map((d) => [d[idField], d]));
}

export function useModelIndex() {
  return useIndex("kg_model");
}

export type EntityType = {
  id: number;
  name: string;
  color: string;
};

export function useEntityTypeIndex(): Map<number, EntityType> {
  return useIndex("kg_entity_type");
}
