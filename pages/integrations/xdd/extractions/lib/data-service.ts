import { PostgrestClient } from "@supabase/postgrest-js";

import { postgrestPrefix } from "@macrostrat-web/settings";
import { useEffect, useState } from "react";

interface FilterDef {
  subject: string;
  op?: string;
  predicate: any;
}

const postgrest = new PostgrestClient(postgrestPrefix);

export function usePostgresQuery(
  query: string,
  filter: FilterDef | null = null
) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let q = postgrest.from(query).select();

    if (filter != null) {
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

export function useEntityTypeIndex() {
  const ix = useIndex("kg_entity_type");
  return ix;
}
