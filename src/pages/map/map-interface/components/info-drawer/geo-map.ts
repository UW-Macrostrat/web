import h from "@macrostrat/hyper";
import { ExpansionPanel } from "@macrostrat/map-interface";
import LongText from "../long-text";
import { IntervalChip } from "../info-blocks";
import { useAppActions } from "~/pages/map/map-interface/app-state";
import { MapReference } from "~/components/map-info";

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
  const runAction = useAppActions();

  if (!source) return h("div");

  const interval = {
    int_name: source.age,
    b_age: source.b_int.b_age,
    t_age: source.t_int.t_age,
    color: "#cccccc",
  };

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
          h(IntervalChip, {
            interval,
          }),
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
        h(MapReference, {
          reference: source.ref,
          onClickSourceID() {
            runAction({
              type: "set-focused-map-source",
              source_id: source.source_id,
            });
          },
        }),
      ]),
    ]
  );
}

export { GeologicMapInfo };
