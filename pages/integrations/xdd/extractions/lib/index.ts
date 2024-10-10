import h from "./main.module.sass";
import classNames from "classnames";
import { Tag } from "@blueprintjs/core";
import { asChromaColor } from "@macrostrat/color-utils";
import { Entity, EntityExt, Highlight, EntityType } from "./types";

export function buildHighlights(entities: EntityExt[]): Highlight[] {
  let highlights = [];
  for (const entity of entities) {
    highlights.push({
      start: entity.indices[0],
      end: entity.indices[1],
      text: entity.name,
      backgroundColor: entity.type.color ?? "#ddd",
      tag: entity.type.name,
      id: entity.id,
    });
    highlights.push(...buildHighlights(entity.children ?? []));
  }
  return highlights;
}

export function enhanceData(extractionData, models, entityTypes) {
  console.log(extractionData, models);
  return {
    ...extractionData,
    model: models.get(extractionData.model_id),
    entities: extractionData.entities?.map((d) =>
      enhanceEntity(d, entityTypes)
    ),
  };
}

function enhanceEntity(
  entity: Entity,
  entityTypes: Map<number, EntityType>
): EntityExt {
  return {
    ...entity,
    type: addColor(entityTypes.get(entity.type), entity.match != null),
    children: entity.children?.map((d) => enhanceEntity(d, entityTypes)),
  };
}

function addColor(entityType: EntityType, match = false) {
  let color = entityType.color ?? "#ddd";

  color = asChromaColor(color).brighten(match ? 1 : 2);

  return { ...entityType, color: color.css() };
}

export function ExtractionContext({
  data,
  entityTypes,
}: {
  data: any;
  entityTypes: Map<number, EntityType>;
}) {
  const highlights = buildHighlights(data.entities);

  return h("div", [
    h("p", h(HighlightedText, { text: data.paragraph_text, highlights })),
    h(ModelInfo, { data: data.model }),
    h(
      "ul.entities",
      data.entities.map((d) => h(ExtractionInfo, { data: d }))
    ),
  ]);
}

export function ModelInfo({ data }) {
  return h("p.model-name", ["Model: ", h("code.bp5-code", data.name)]);
}

export function EntityTag({ data }) {
  const { name, type, match } = data;
  const className = classNames(
    {
      matched: match != null,
      type: data.type.name,
    },
    "entity"
  );

  return h(
    Tag,
    { style: { backgroundColor: type.color ?? "#ddd" }, className },
    [
      h("code.entity-type.bp5-code", type.name),
      " ",
      h("span.entity-name", name),
      h(Match, { data: match }),
    ]
  );
}

function ExtractionInfo({ data }: { data: EntityExt }) {
  const children = data.children ?? [];

  return h("li.entity-row", [
    h(EntityTag, { data }),
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
