import h from "./main.module.sass";
import {
  DataField,
  ExpansionPanel,
  Parenthetical,
} from "@macrostrat/data-components";
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
        h(AgeField, {
          b_age: source.b_int.b_age,
          t_age: source.t_int.t_age,
          age: source.age,
        }),
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
        h(MapReference, {
          reference: source.ref,
        }),
      ]),
    ]
  );
}

function AgeField(props) {
  const { b_age, t_age, age } = props;

  if (!b_age || !t_age || !age) return null;

  let children = [];
  if (age) {
    children.push(h("h4.age-interval", age));
  }
  if (b_age && t_age) {
    const ageRange = h(AgeRange, {
      data: { b_age, t_age },
    });
    if (age) {
      children.push(h(Parenthetical, ageRange));
    } else {
      children.push(ageRange);
    }
  }

  return h(DataField, { label: "Age" }, children);
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
