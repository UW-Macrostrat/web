import h from "@macrostrat/hyper";
import { ExpansionPanel } from "@macrostrat/map-interface/src/expansion-panel";
import Reference from "../Reference";
import LongText from "../long-text";
import { IntervalChip } from "../info-blocks";
import { useAppActions } from "~/map-interface/app-state";

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
        h(MapReference, { reference: source.ref }),
      ]),
    ]
  );
}

function MapReference(props) {
  const { reference: ref } = props;
  if (!ref || Object.keys(ref).length === 0) {
    return null;
  }

  const runAction = useAppActions();

  const {
    authors,
    ref_year,
    url,
    ref_title,
    ref_source,
    isbn_doi,
    source_id,
    map_id,
  } = ref;

  const year = ref_year.length ? " " + ref_year + ", " : "";
  const source = ref_source.length ? ": " + ref_source : "";
  const doi = isbn_doi.length ? ", " + isbn_doi : "";

  return h("p.reference.map-source-attr", [
    h("span.attr", "Source: "),
    authors,
    year,
    h("a.ref-link", { href: url, target: "_blank" }, [ref_title]),
    source,
    doi,
    ". ",
    h(
      "a",
      {
        onClick() {
          runAction({ type: "set-focused-map-source", source_id });
        },
      },
      source_id
    ),
    " / ",
    map_id,
  ]);
}

export { GeologicMapInfo };
