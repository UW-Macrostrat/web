import h from "./main.module.sass";
import {
  DataField,
  ExpansionPanel,
  Parenthetical,
} from "@macrostrat/data-components";
import {
  useAppActions,
  useAppState,
  useHashNavigate,
} from "#/map/map-interface/app-state";
import { MapReference } from "~/components/map-info";
import { AgeRange } from "@macrostrat/column-views";

function LongTextField(props) {
  const { name, text } = props;
  if (!text || !text.length) return null;
  return text && text.length ? h(LongText, { name, text }) : null;
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

export function GeologicMapInfo(props) {
  const { bedrockExpanded, source } = props;
  const runAction = useAppActions();

  if (!source) return null;

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
        h(MapReference, {
          reference: source.ref,
        }),
        h(
          DataField,
          {
            label: "Age",
          },
          [
            h("h4.age-interval", source.age),
            h(
              Parenthetical,
              h(AgeRange, {
                data: {
                  b_age: source.b_int.b_age,
                  t_age: source.t_int.t_age,
                },
              })
            ),
          ]
        ),
        h.if(source.strat_name != source.name)(StratNamesField, {
          value: source.strat_name,
        }),
        h(LongTextField, {
          name: "Description",
          text: source.descrip,
        }),
        h(LongTextField, {
          name: "Lithology",
          text: source.lith.replace(/,(\w)/g, ", $1"),
        }),
        h(LongTextField, {
          name: "Comments",
          text: source.comments,
        }),
        h(GeoMapLines, { source }),
      ]),
    ]
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

function LongText(props) {
  const { name, text } = props;
  return h(
    DataField,
    { label: name, inline: true, className: "long-text-field" },
    h("p", text)
  );
}
