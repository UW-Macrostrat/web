import hyper from "@macrostrat/hyper";
import { AgeChip, AttrChip } from "../info-blocks";
import {
  ExpansionPanel,
  ExpandableDetailsPanel,
  ExpansionBody,
} from "@macrostrat/map-interface";
import styles from "./main.module.styl";
import { scaleLinear } from "@visx/scale";
import { AxisBottom } from "@visx/axis";
import chroma from "chroma-js";
import { LithologyTag } from "~/components";
const h = hyper.styled(styles);

function MacrostratLinkedData(props) {
  const { mapInfo, bedrockMatchExpanded, source } = props;

  if (!mapInfo.mapData[0]) return h("div");

  return h(
    ExpansionPanel,
    {
      className: "regional-panel",
      title: "Macrostrat-linked data",
      helpText: "via Macrostrat",
      expanded: bedrockMatchExpanded,
    },
    [
      h("div", { classes: expansionPanelDetailClasses }, [
        h(MatchBasis, { source }),
        h(AgeInformation, { mapInfo, source }),
        h(Thickness, { source }),
        h(MinorFossilCollections, { source }),
        h(FossilOccs, { source }),
        h(LithsAndClasses, { source }),
        h(Environments, { source }),
        h(Economy, { source }),
      ]),
    ]
  );
}

const expansionPanelDetailClasses = {
  root: "expansion-panel-detail",
};

function AgeInformation(props) {
  const { source, mapInfo } = props;
  const { macrostrat } = source;

  if (!macrostrat?.b_age) return h(MapAgeRenderer, { mapInfo });

  return h(MacrostratAgeInfo, { macrostrat, mapInfo });
}

function MapAgeRenderer(props) {
  const { mapInfo, ...rest } = props;
  return h(
    DescribedAgeInfo,
    {
      ageElement: h(AgeChip, {
        b_int: mapInfo.mapData[0].b_int,
        t_int: mapInfo.mapData[0].t_int,
      }),
    },
    "Based on geologic map description."
  );
}

function DescribedAgeInfo(props) {
  const { ageElement, children, className } = props;

  return h("div.described-age.macrostrast-detail", [
    h("div.expansion-summary-title", "Age"),
    h("div.age-chips", null, ageElement),
    h("div.description", children),
  ]);
}

function AgeRefinementBar({ scale, data, color, label = null }) {
  const { b_int, t_int } = data;
  const b_age = data.b_age ?? b_int.b_age;
  const t_age = data.t_age ?? t_int.t_age;
  const backgroundColor = color ?? b_int.color;
  const accentColor = chroma(backgroundColor).darken(0.5).hex();
  const labelColor = chroma(backgroundColor).darken(2).hex();

  const left = scale(b_age);
  const width = scale(t_age) - scale(b_age);

  let labelTranslate = 5;
  let textAlign = "start";

  // Adjust label placement

  if (width < 100) {
    if (left < 100) {
      labelTranslate = width + 5;
    } else {
      labelTranslate = -305;
      textAlign = "end";
    }
  }

  return h(
    "div.age-refinement-bar",
    {
      style: {
        marginLeft: `${left}px`,
        width: `${width}px`,
        height: "18px",
        backgroundColor,
        border: `2px solid ${accentColor}`,
        position: "relative",
      },
    },
    h(
      "div.age-refinement-bar-label",
      {
        style: {
          transform: `translateX(${labelTranslate}px)`,
          color: labelColor,
          fontSize: "10px",
          width: 300,
          textAlign,
        },
      },
      label
    )
  );
}

function AgeRefinementPlot({ macrostrat, mapInfo }) {
  // Plot the amount by which the age was refined

  const mapData = mapInfo.mapData[0];
  const b_age = Math.max(mapData.b_int.b_age, macrostrat.b_age);
  const t_age = Math.min(mapData.t_int.t_age, macrostrat.t_age);

  const scale = scaleLinear({
    domain: [1.02 * b_age, t_age * 0.98],
    range: [20, 360],
  });

  // use visx to plot the age refinement
  return h("div.age-refinement-plot", [
    h(AgeRefinementBar, {
      scale,
      data: macrostrat,
      label: "Macrostrat age model",
    }),
    h(AgeRefinementBar, {
      scale,
      data: mapData,
      label: "Map legend",
    }),
    // Age axis
    h("svg", { width: "100%", height: "40px" }, [
      h(AxisBottom, {
        scale,
        numTicks: 5,
        top: 1,
        left: 0,
        label: "Age (Ma)",
      }),
    ]),
  ]);
}

function MacrostratAgeInfoCore({ macrostrat }) {
  const { b_age, t_age, b_int, t_int } = macrostrat;

  if (!b_age) return null;

  let age = b_int.int_name;
  if (b_int.int_id !== t_int.int_id) {
    age += ` - ${t_int.int_name}`;
  }
  return h(
    DescribedAgeInfo,
    {
      ageElement: h(AgeChip, {
        b_int: { ...b_int, int_name: age, b_age, t_age },
        t_int: { ...b_int, int_name: age, b_age, t_age },
      }),
    },
    "Refined using the Macrostrat age model."
  );
}

function MacrostratAgeInfo(props) {
  return h(
    ExpandableDetailsPanel,
    { headerElement: h(MacrostratAgeInfoCore, props) },
    h(ExpansionBody, { title: "Age refinement" }, h(AgeRefinementPlot, props))
  );
}

function MatchBasis(props) {
  const { source } = props;
  if (!source.macrostrat?.strat_names) return null;

  return h(
    ExpandableDetailsPanel,
    {
      className: "macrostrat-unit",
      headerElement: h([
        h("h3", source.macrostrat.strat_names[0].rank_name),
        h("div.description", "Matched stratigraphic unit"),
      ]),
    },
    h(ExpansionBody, { title: "All matched names" }, [
      source.macrostrat.strat_names.map((name, i) => {
        let lastElement: boolean =
          i == source.macrostrat.strat_names.length - 1;
        return h("span", { key: i }, [
          h(
            "a.externalLink",
            {
              href: "/sift/#/strat_name/" + name.strat_name_id,
              key: i,
            },
            [name.rank_name]
          ),
          h.if(!lastElement)([", "]),
        ]);
      }),
    ])
  );
}

function Thickness(props) {
  const { source } = props;
  if (!source.macrostrat.max_thick) return h("div");

  return h.if(source.macrostrat && source.macrostrat.max_thick)(
    "div.macrostrat-detail",
    [
      h("div.expansion-summary-title", "Thickness"),
      h("div", [
        source.macrostrat.min_min_thick,
        " - ",
        source.macrostrat.max_thick,
        "m",
      ]),
    ]
  );
}

function MinorFossilCollections(props) {
  const { source } = props;
  const { macrostrat } = source;
  if (!macrostrat.pbdb_collections) return h("div");

  return h.if(macrostrat && macrostrat.pbdb_collections)(
    "div.macrostrat-detail",
    [
      h("div.expansion-summary-title", "Fossil collections"),
      h("div", [macrostrat.pbdb_collections]),
    ]
  );
}

function FossilOccs(props) {
  const { source } = props;
  const { macrostrat } = source;

  if (!macrostrat?.pbdb_occs) return null;

  return h("div.macrostrat-detail", [
    h("div.expansion-summary-title", "Fossil occurrences"),
    h("div", [macrostrat.pbdb_occs]),
  ]);
}

function LithTypes(props) {
  const { lith_types } = props;

  return h.if(lith_types && lith_types.length > 0)(
    "div.lithologies.lithology-types",
    [
      lith_types.map((lithClass, i) => {
        console.log(lithClass);
        return h(LithologyTag, {
          key: lithClass.name,
          data: {
            ...lithClass,
          },
          tooltip: false,
        });
      }),
    ]
  );
}

function LithsAndClasses(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { liths = null, lith_types = null } = macrostrat;

  if (!liths || liths.length == 0) return null;

  return h(
    ExpandableDetailsPanel,
    {
      title: "Lithology",
      value: h(LithTypes, { lith_types }),
    },
    h(ExpansionBody, { title: "Matched lithologies" }, [
      h(
        "span.lithologies",
        macrostrat.liths.map((lith, i) => {
          const l1 = {
            lith_id: lith.lith_id,
            name: lith.lith,
            color: lith.color,
          };
          return h(LithologyTag, { data: l1, expandOnHover: false });
        })
      ),
    ])
  );
}

function EnvironTypes(props) {
  const { environ_types } = props;

  return h.if(environ_types && environ_types.length > 0)("div", [
    environ_types.map((type, i) => {
      return h(AttrChip, {
        key: i,
        name: type.name || "other",
        color: type.color,
      });
    }),
  ]);
}

function Environments(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { environs = null, environ_types = null } = macrostrat;

  if (!environs || environs.length == 0) return null;

  return h(
    ExpandableDetailsPanel,
    {
      title: "Environment",
      value: h(EnvironTypes, { environ_types }),
    },
    h(ExpansionBody, { title: "Matched environments" }, [
      macrostrat.environs.map((env, i) => {
        return h(AttrChip, {
          key: i,
          name: env.environ,
          color: env.color,
          emphasized: false,
        });
      }),
    ])
  );
}

function EconType(props) {
  const { econ_types } = props;

  return h.if(econ_types && econ_types.length > 0)("div", [
    econ_types.map((econClass, i) => {
      return h(AttrChip, {
        key: i,
        name: econClass.name,
        color: econClass.color,
      });
    }),
  ]);
}

function Economy(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { econs = null, econ_types = null } = macrostrat;
  if (!econs) return h("div");

  return h.if(econs && econs.length > 0)(
    ExpandableDetailsPanel,
    {
      title: "Economy ",
      value: h(EconType, { econ_types }),
    },
    h(ExpansionBody, { title: "Matched economic attributes" }, [
      econs.map((econ, i) => {
        return h(AttrChip, {
          key: i,
          name: econ.econ,
          color: econ.color,
        });
      }),
    ])
  );
}

export { MacrostratLinkedData };
