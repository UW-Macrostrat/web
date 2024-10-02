import h from "@macrostrat/hyper";
import { PostgrestClient } from "@supabase/postgrest-js";

import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { useEffect, useState } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { ExtractionContext, enhanceData } from "../lib";

const postgrest = new PostgrestClient(postgrestPrefix);

interface FilterDef {
  subject: string;
  op?: string;
  predicate: any;
}

function usePostgresQuery(query: string, filter: FilterDef | null = null) {
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

function useModelIndex() {
  return useIndex("kg_model");
}

function useEntityTypeIndex() {
  const ix = useIndex("kg_entity_type");
  return ix;
}

export function Page() {
  return h(ContentPage, [h(PageBreadcrumbs), h(PageMain)]);
}

function PageMain() {
  return h("div", [h(ExtractionIndex)]);
}

function ExtractionIndex() {
  const { routeParams } = usePageContext();
  const { paperId } = routeParams;

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const paper = usePostgresQuery("kg_publication_entities", {
    subject: "paper_id",
    predicate: paperId,
  })?.[0];

  const data = usePostgresQuery("kg_context_entities", {
    subject: "paper_id",
    predicate: paperId,
  });

  if (data == null || models == null || paper == null || entityTypes == null) {
    return h("div", "Loading...");
  }

  return h([
    h("h1", paper.citation?.title ?? "Model extractions"),
    data.map((d) => {
      return h(ExtractionContext, {
        data: enhanceData(d, models, entityTypes),
        entityTypes,
      });
    }),
  ]);
}
