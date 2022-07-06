import h from "@macrostrat/hyper";
import { ExpansionPanel } from "../expansion-panel";
import Reference from "../Reference";
import LongText from "../long-text";

function LongTextRenderer(props) {
  const { name, text } = props;

  return h.if(text && text.length)(LongText, { name, text });
}

function GeoMapLines(props) {
  const { source } = props;
  if (!source.lines || source.lines.length == 0) {
    return h("div", [""]);
  }
  const { lines } = source;

  return h("div.map-source-attr", [
    h("span.attr", ["Lines "]),
    lines.map((line, i) => {
      const { name, type, direction, descrip } = line;
      return h("div.map-source-line", { key: i }, [
        h.if(name)("span.line-attr", [h("span.attr", ["Name: "]), name]),
        h.if(type)("span.line-attr", [h("span.attr", ["Type: "]), type]),
        h.if(direction)("span.line-attr", [
          h("span.attr", ["Direction: "]),
          line.direction,
        ]),
        h.if(descrip)("span.line-attr", [
          h("span.attr", ["Description: "]),
          descrip,
        ]),
      ]);
    }),
  ]);
}

function GeologicMapInfo(props) {
  const { bedrockExpanded, source } = props;

  if (!source) return h("div");

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
        h.if(source.name && source.name.length)("div.map-source-attr", [
          h("span.attr", ["Name: "]),
          source.name,
        ]),
        h.if(source.age && source.age.length)("div.map-source-attr", [
          h("span.attr", ["Age: "]),
          source.age,
          ` (${source.b_int.b_age} - ${source.t_int.t_age}`,
          h("span.age-ma", [" Ma"]),
          ")",
        ]),
        h(LongTextRenderer, {
          name: "Stratigraphic name(s)",
          text: source.strat_name,
        }),
        h(LongTextRenderer, {
          name: "Lithology",
          text: source.lith,
        }),
        h(LongTextRenderer, {
          name: "Description",
          text: source.descrip,
        }),
        h(LongTextRenderer, {
          name: "Comments",
          text: source.comments,
        }),
        h(GeoMapLines, { source }),
        h(Reference, { reference: source.ref }),
      ]),
    ]
  );
}

export { GeologicMapInfo };
