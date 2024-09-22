import h from "@macrostrat/hyper";
import { PostgrestClient } from "@supabase/postgrest-js";

import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { useEffect, useState } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { JSONView } from "@macrostrat/ui-components";

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
  }, [query, filter]);
  return data;
}

function useModelIndex() {
  const models = usePostgresQuery("kg_model");
  if (models == null) return null;

  return new Map(models.map((d) => [d.id, d]));
}

export function Page() {
  return h(ContentPage, [h(PageBreadcrumbs), h(PageMain)]);
}

function PageMain() {
  return h("div", [
    h("h1", "xDD stratigraphic name extractions"),
    h(ExtractionIndex),
  ]);
}

function ExtractionIndex() {
  const { routeParams } = usePageContext();
  const { paperId } = routeParams;

  const models = useModelIndex();

  const data = usePostgresQuery("kg_context_entities", {
    subject: "paper_id",
    predicate: paperId,
  });
  if (data == null || models == null) {
    return h("div", "Loading...");
  }

  return h(
    data.map((d) => {
      return h(ExtractionContext, { data: enhanceData(d, models) });
    })
  );
}

function enhanceData(extractionData, models) {
  return {
    ...extractionData,
    model: models.get(extractionData.model_id),
  };
}

function ExtractionContext({ data }) {
  console.log(data);
  const { name } = data.model;
  return h("div", [
    h("p", data.paragraph_text),
    h("p.model-name", h("code", name)),
    h(
      "ul.entities",
      data.entities.map((d) => h(ExtractionInfo, { data: d }))
    ),
  ]);
}

type Match = any;

interface Entity {
  id: number;
  name: string;
  type: "strat_name" | "lith" | "lith_att";
  indices: [number, number];
  children: Entity[];
  match?: Match;
}

function ExtractionInfo({ data }: { data: Entity }) {
  const children = data.children ?? [];

  const match = data.match ?? null;

  return h("li.entity", { className: data.type }, [
    h("span.name", data.name),
    h(Match, { data: match }),
    h.if(children.length > 0)([
      h(
        "ul.children",
        children.map((d) => h(ExtractionInfo, { data: d }))
      ),
    ]),
  ]);
}

function Match({ data }) {
  if (data == null) return null;
  const href = buildHref(data);
  return h([" ", h("a.match", { href }, data.name)]);
}

function buildHref(match) {
  /** Build a URL for a matched term */
  if (match == null) return null;

  if (match.strat_name_id != null) {
    return `/lex/strat-names/${match.strat_name_id}`;
  }

  if (match.lith_id != null) {
    return `/lex/lithologies`;
  }

  if (match.lith_att_id != null) {
    return `/lex/lithologies`;
  }

  return null;
}
