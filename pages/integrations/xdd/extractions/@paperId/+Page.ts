import h from "./main.module.sass";
import { PostgrestClient } from "@supabase/postgrest-js";

import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { useEffect, memo, useState } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { Tag } from "@blueprintjs/core";
import classNames from "classnames";
import { asChromaColor } from "@macrostrat/color-utils";

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

function buildHighlights(entities, entityTypes): Highlight[] {
  let highlights = [];
  for (const entity of entities) {
    console.log(entity);
    highlights.push({
      start: entity.indices[0],
      end: entity.indices[1],
      backgroundColor: entity.type.color ?? "#ddd",
    });
    highlights.push(...buildHighlights(entity.children ?? [], entityTypes));
  }
  return highlights;
}

function enhanceData(extractionData, models, entityTypes) {
  console.log(entityTypes);
  return {
    ...extractionData,
    model: models.get(extractionData.model_id),
    entities: extractionData.entities?.map((d) =>
      enhanceEntity(d, entityTypes)
    ),
  };
}

function enhanceEntity(entity, entityTypes) {
  console.log(entity);
  return {
    ...entity,
    type: addColor(entityTypes.get(entity.type), entity.match != null),
    children: entity.children?.map((d) => enhanceEntity(d, entityTypes)),
  };
}

function addColor(entityType, match = false) {
  let color = "#ddd";
  const name = entityType.name;
  if (name == "strat_name") color = "#be75c6";

  if (name == "lith") color = "#74ea41";

  if (name == "strat_noun") color = "#be75c6";

  if (name == "lith_att") color = "#e8e534";

  color = asChromaColor(color).brighten(match ? 1 : 2);

  return { ...entityType, color: color.css() };
}

function ExtractionContext({ data, entityTypes }) {
  const { name } = data.model;
  const highlights = buildHighlights(data.entities, entityTypes);

  return h("div", [
    h("p", h(HighlightedText, { text: data.paragraph_text, highlights })),
    h("p.model-name", ["Model: ", h("code.bp5-code", name)]),
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
  type?: number;
  indices: [number, number];
  children: Entity[];
  match?: Match;
}

function ExtractionInfo({ data }: { data: Entity }) {
  const children = data.children ?? [];

  const match = data.match ?? null;
  const className = classNames({
    matched: match != null,
    type: data.type.name,
  });

  return h("li.entity", { className }, [
    h(
      Tag,
      { style: { backgroundColor: data.type.color ?? "#ddd", color: "#222" } },
      [
        h("span.name", data.name),
        ":  ",
        h("code.type", null, data.type.name),
        h(Match, { data: match }),
      ]
    ),
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
  return h([" ", h("a.match", { href }, `#${matchID(data)}`)]);
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

function matchID(match) {
  if (match == null) return null;

  for (const id of ["strat_name_id", "lith_id", "lith_att_id"]) {
    if (match[id]) {
      return match[id];
    }
  }
  return null;
}

type Highlight = {
  start: number;
  end: number;
  backgroundColor?: string;
  borderColor?: string;
};

function HighlightedText(props: { text: string; highlights: Highlight[] }) {
  const { text, highlights = [] } = props;
  const parts = [];
  let start = 0;

  const sortedHighlights = highlights.sort((a, b) => a.start - b.start);
  const deconflictedHighlights = sortedHighlights.map((highlight, i) => {
    if (i === 0) return highlight;
    const prev = sortedHighlights[i - 1];
    if (highlight.start < prev.end) {
      highlight.start = prev.end;
    }
    return highlight;
  });

  for (const highlight of deconflictedHighlights) {
    const { start: s, end, ...rest } = highlight;
    parts.push(text.slice(start, s));
    parts.push(h("span.highlight", { style: rest }, text.slice(s, end)));
    start = end;
  }
  parts.push(text.slice(start));
  return h("span", parts);
}
