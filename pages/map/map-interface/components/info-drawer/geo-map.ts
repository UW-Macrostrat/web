import h from "./main.module.sass";
import {
  DataField,
  ExpansionPanel,
  IntervalAgeRange,
} from "@macrostrat/data-components";
import {
  BaseMapReference,
  MapReference,
  MapReferenceList,
} from "~/components/map-info";
import { Icon } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { infoMarkerPositionAtom, useAppState } from "../../app-state";
import { tileInspectorHref } from "~/_utils/tile-inspector";
import { ClampedText } from "./clamped-text";
import type { ReactNode } from "react";

function GeoMapLines(props) {
  const { source } = props;
  if (!source.lines || source.lines.length == 0) {
    return null;
  }
  const lines = source.lines.map((line, i) => h(LineInfo, { line, key: i }));
  return h(
    DataField,
    { label: "Lines" },
    h("span.map-lines", addSeparators(lines))
  );
}

function LineInfo(props) {
  const { line } = props;
  const { name, type, direction, descrip } = line;
  const details = [direction, withoutType(descrip, type)]
    .filter(Boolean)
    .join(" ");

  const children: ReactNode[] = [];
  if (name) children.push(h("strong.line-name", name));
  if (name && type) children.push(" – ");
  if (type) children.push(h("span.type", type));
  if (details) children.push(h("span.details", [" (", details, ")"]));

  return h("span.line-info", children);
}

/** A line's description without the type it restates, which is shown beside
 * it: under type "fault", "Fault, approximate" is "approximate" and "Fault" is
 * nothing. Many maps' descriptions open with their type (SGMC's "Fault, sense of
 * displacement unknown or undefined, certain"). */
function withoutType(descrip: string | null, type: string | null) {
  if (!descrip || !type) return descrip;
  const words = type.toLowerCase().match(/[a-z0-9]+/g);
  if (words == null) return descrip;
  const restated = new RegExp(
    "^\\W*" + words.join("[^a-z0-9]+") + "(?![a-z0-9])[\\W]*",
    "i"
  );
  if (!restated.test(descrip)) return descrip;
  return descrip.replace(restated, "").replace(/[()]/g, "").trim();
}

function addSeparators(values: ReactNode[]) {
  const result: ReactNode[] = [];
  values.forEach((val, i) => {
    if (i > 0) result.push(", ");
    result.push(val);
  });
  return result;
}

export function GeologicMapInfo(props) {
  const { bedrockExpanded, source } = props;

  if (!source) return null;
  if (
    !source.name &&
    !source.descrip &&
    !source.comments &&
    (!source.liths || source.liths.length == 0)
  )
    return null;

  const [comments, commentRefs] = processComments(source.comments);
  const refs = h(SourceReferences, { source, commentRefs });

  return h(
    ExpansionPanel,
    {
      classes: { root: "regional-panel" },
      title: "Geologic map",
      helpText: "via providers, Macrostrat",
      expanded: bedrockExpanded,
    },
    [
      h("div.map-source-attrs", [
        h.if(source.name && source.name.length)("h3.unit-name", source.name),
        h(AgeField, { source }),
        h.if(source.strat_name != source.name)(StratNamesField, {
          value: source.strat_name,
        }),
        h(LongText, {
          name: "Description",
          text: source.descrip,
        }),
        h(LongText, {
          name: "Lithology",
          text: source.lith?.replace(/,(\w)/g, ", $1"),
          lines: null,
        }),
        h(LongText, {
          name: "Comments",
          text: comments,
        }),
        h(GeoMapLines, { source }),
        h(DataField, { label: "Source" }, refs),
      ]),
    ]
  );
}

/** The polygon's references, as API v2 assembles them from every level where
 * it can (`refs`); otherwise the map's citation, and for SGMC the original map
 * and primary reference its comments name. */
function SourceReferences({ source, commentRefs }) {
  const links = h(MapSourceLinks, { source });
  if (source.refs?.length > 0) {
    return h(MapReferenceList, { refs: source.refs }, links);
  }

  const refs = [];
  let mainPrefix = null;
  if (commentRefs.primary || commentRefs.original) {
    mainPrefix = "Compiled in";
  }
  refs.push(
    h(MapReference, { prefix: mainPrefix, reference: source.ref }, links)
  );
  if (commentRefs.original) {
    refs.push(
      h(BaseMapReference, { prefix: "Originally from" }, commentRefs.original)
    );
  }
  if (commentRefs.primary) {
    refs.push(
      h(
        BaseMapReference,
        { prefix: "Primarily described in" },
        commentRefs.primary
      )
    );
  }
  return h(refs);
}

/** The map's own page and, revealed on hover for those who know to look, the
 * tile inspector at this point. */
function MapSourceLinks({ source }) {
  const { source_id } = source;
  if (source_id == null) return null;
  return h("span.map-source-links", [
    h(
      "a.map-page-link",
      { href: `/maps/${source_id}`, title: "Map page" },
      h(Icon, { icon: "map", size: 12 })
    ),
    h(TileInspectorLink),
  ]);
}

/** The tile inspector, at the info marker and on the same compilation,
 * showing the raw tile features behind this description. */
function TileInspectorLink() {
  const position = useAtomValue(infoMarkerPositionAtom);
  const compilation = useAppState((state) => state.compilation);
  const zoom = useAppState((state) => state.mapPosition.target?.zoom);

  if (position == null) return null;

  const href = tileInspectorHref({
    compilation,
    position,
    zoom: position.zoom ?? zoom ?? null,
  });

  return h(
    "a.dev-inspector-link",
    { href, title: "Inspect the map tiles at this location" },
    h(Icon, { icon: "code", size: 12 })
  );
}

function processComments(comments) {
  // Extract references from comments if they are present
  let refs = {};
  let commentsText = comments;
  if (commentsText == null) {
    return [null, refs];
  }
  for (let key of ["Primary reference: ", "Original map source: "]) {
    if (commentsText.includes(key)) {
      const [mainComments, refPart] = commentsText.split(key);
      commentsText = mainComments.trim();
      const keyShort = key.split(" ")[0].toLowerCase();
      refs[keyShort] = refPart.trim();
    }
  }
  return [commentsText, refs];
}

/** The source's age as it wrote it, with the Macrostrat intervals it was
 * matched to beneath. Both are always shown: the match alone read as if
 * Macrostrat had dated the unit. */
function AgeField({ source }) {
  const { age, b_int, t_int } = source;
  const hasIntervals = b_int?.int_id != null || t_int?.int_id != null;

  if (!age && !hasIntervals) return null;

  let described = null;
  if (age) {
    described = h("div.described-age", h("span.age-text", age));
  }

  let resolved = null;
  if (hasIntervals) {
    const unit = {
      b_int_id: b_int?.int_id,
      t_int_id: t_int?.int_id,
      b_age: b_int?.b_age,
      t_age: t_int?.t_age,
    };
    resolved = h(
      "div.resolved-age",
      h(IntervalAgeRange, { unit, flavor: "ages", verbose: true })
    );
  }

  return h(
    DataField,
    { label: "Age" },
    h("div.age-values", [described, resolved])
  );
}

/** A map can list dozens of names for one unit; long lists are clipped like
 * the description. */
function StratNamesField(props) {
  const { value: text } = props;
  if (!text || !text.length) return null;
  const isPlural =
    text.includes(",") || text.includes(";") || text.includes(" and ");
  let name = "Stratigraphic name";
  if (isPlural) name += "s";
  return h(LongText, { name, text, lines: 2 });
}

/** A labelled run of prose. Long ones are clipped until asked for. */
function LongText(props) {
  const { name, text, lines = 3 } = props;
  if (!text || !text.length) return null;
  const label = h("span.inline-label", name);
  if (lines == null) {
    return h("div.long-text-field", h("p.long-text", [label, text]));
  }
  return h(
    "div.long-text-field",
    h(ClampedText, { text, lines, prefix: label })
  );
}
