import h from "./main.module.sass";
import {
  DataField,
  ExpansionPanel,
  IntervalAgeRange,
} from "@macrostrat/data-components";
import { BaseMapReference, MapReference } from "~/components/map-info";
import { Icon } from "@blueprintjs/core";
import { useAtomValue } from "jotai";
import { infoMarkerPositionAtom, useAppState } from "../../app-state";
import { tileInspectorHref } from "~/_utils/tile-inspector";
import { ClampedText } from "./clamped-text";

function GeoMapLines(props) {
  const { source } = props;
  if (!source.lines || source.lines.length == 0) {
    return null;
  }
  const { lines } = source;
  return h(
    DataField,
    { label: "Lines", inline: false },
    h(
      "ul.map-lines",
      lines.map((line, i) => {
        return h(LineInfo, { line, key: i });
      })
    )
  );
}

function LineInfo(props) {
  const { line } = props;
  const { name, type, direction, descrip } = line;

  const children = [
    h("span.basic-info", [
      h.if(name)("strong.line-name", name),
      h("span.type", type),
    ]),
    h("span.direction", direction),
    h("span.description", descrip),
  ];

  return h("li.line-info", children);
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

  const [comments, additionalRefs] = processComments(source.comments);

  const refs = [];
  /** Stopgap for refs from SGMC, which are stored in comments.
   * TODO: Eventually the reference model will need to be improved, but
   * this works for now.
   */
  let mainPrefix = null;
  if (additionalRefs.primary || additionalRefs.original) {
    mainPrefix = "Compiled in";
  }
  refs.push(h(MapReference, { prefix: mainPrefix, reference: source.ref }));
  if (additionalRefs.original) {
    refs.push(
      h(
        BaseMapReference,
        { prefix: "Originally from" },
        additionalRefs.original
      )
    );
  }
  if (additionalRefs.primary) {
    refs.push(
      h(
        BaseMapReference,
        { prefix: "Primarily described in" },
        additionalRefs.primary
      )
    );
  }

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
        h(MapSourceFooter, { source }),
      ]),
    ]
  );
}

/** The map's own page and, revealed on hover for those who know to look, the
 * tile inspector at this point. */
function MapSourceFooter({ source }) {
  const { source_id } = source;
  if (source_id == null) return null;
  return h("div.map-source-footer", [
    h("a.map-page-link", { href: `/maps/${source_id}` }, [
      h(Icon, { icon: "map", size: 12 }),
      "Map page",
    ]),
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

function StratNamesField(props) {
  const { value: text } = props;
  if (!text || !text.length) return null;
  const isPlural =
    text.includes(",") || text.includes(";") || text.includes(" and ");
  const label = "Stratigraphic name" + (isPlural ? "s" : "");
  return h(DataField, { label }, text);
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
