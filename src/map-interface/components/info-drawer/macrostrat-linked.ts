import h from "@macrostrat/hyper";
import AgeChip from "../AgeChip";
import AttrChip from "../AttrChip";
import MacrostratAgeChip from "../MacrostratAgeChip";
import { ExpansionPanel } from "../expansion-panel";

function MacrostratLinkedData(props) {
  const { mapInfo, bedrockMatchExpanded, source } = props;

  if (!mapInfo.mapData[0]) return h("div");

  return h("span", [
    h(
      ExpansionPanel,
      {
        classes: { root: "regional-panel" },
        title: "Macrostrat-linked data",
        helpText: "via Macrostrat",
        expanded: bedrockMatchExpanded,
      },
      [
        h("div", { classes: expansionPanelDetailClasses }, [
          h(AgeChipRenderer, { mapInfo, source }),
          h(MacrostratAgeChipRenderer, { source }),
          h(Thickness, { source }),
          h(MinorFossilCollections, { source }),
          h(FossilOccs, { source }),
          h(MatchBasis, { source }),
          h(LithsAndClasses, { source }),
          h(Environments, { source }),
          h(Economy, { source }),
        ]),
      ]
    ),
  ]);
}

const expansionPanelDetailClasses = {
  root: "expansion-panel-detail",
};

function AgeChipRenderer(props) {
  const { source, mapInfo } = props;
  return h.if(
    !source.macrostrat || Object.keys(source.macrostrat).length === 0
  )(AgeChip, {
    b_int: mapInfo.mapData[0].b_int,
    t_int: mapInfo.mapData[0].t_int,
  });
}

function MacrostratAgeChipRenderer(props) {
  const { source } = props;

  return h.if(source.macrostrat && source.macrostrat.b_age)(
    "div.macrostrat-detail",
    [
      h("div.expansion-summary-title", "Age: "),
      h(MacrostratAgeChip, {
        b_int: source.macrostrat.b_int,
        t_int: source.macrostrat.t_int,
        b_age: source.macrostrat.b_age,
        t_age: source.macrostrat.t_age,
        color: source.color,
      }),
    ]
  );
}

function MatchBasis(props) {
  const { source } = props;
  console.log(source);
  if (!source.macrostrat.strat_names) return h("div");

  return h.if(source.macrostrat && source.macrostrat.strat_names)(
    ExpansionPanel,
    {
      title: "Match basis",
      helpText: source.macrostrat.strat_names[0].rank_name,
      subheader: true,
    },
    [
      h("p.expansion-panel-detail-header", ["All matched names:"]),
      source.macrostrat.strat_names.map((name, i) => {
        let lastElement: boolean =
          i == source.macrostrat.strat_names.length - 1;
        return h("span", { key: i }, [
          h(
            "a.externalLink",
            {
              href:
                "https://macrostrat.org/sift/#/strat_name/" +
                name.strat_name_id,
              key: i,
            },
            [name.rank_name]
          ),
          h.if(!lastElement)([", "]),
        ]);
      }),
    ]
  );
}

function Thickness(props) {
  const { source } = props;
  if (!source.macrostrat.max_thick) return h("div");

  return h.if(source.macrostrat && source.macrostrat.max_thick)(
    "div.macrostrat-detail",
    [
      h("div.expansion-summary-title", "Thickness: "),
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
      h("div.expansion-summary-title", "Fossil collections: "),
      h("div", [macrostrat.pbdb_collections]),
    ]
  );
}

function FossilOccs(props) {
  const { source } = props;
  const { macrostrat } = source;

  if (!macrostrat) return h("div");

  return h.if(macrostrat && macrostrat.pbdb_occs)("div.macrostrat-detail", [
    h("div.expansion-summary-title", "Fossil occurences: "),
    h("div", [macrostrat.pbdb_occs]),
  ]);
}

function LithTypes(props) {
  const { lith_types } = props;

  return h.if(lith_types && lith_types.length > 0)("div", [
    lith_types.map((lithClass, i) => {
      return h(AttrChip, {
        key: i,
        name: lithClass.name,
        color: lithClass.color,
      });
    }),
  ]);
}

function LithsAndClasses(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { liths = null, lith_types = null } = macrostrat;

  if (!liths) return h("div");

  return h.if(liths && liths.length > 0)(
    ExpansionPanel,
    {
      title: "Lithology",
      sideComponent: h(LithTypes, { lith_types }),
      subheader: true,
    },
    [
      h("p.expansion-panel-detail-header", ["Matched lithologies: "]),
      macrostrat.liths.map((lith, i) => {
        return h(AttrChip, {
          key: i,
          name: lith.lith,
          color: lith.color,
          fill: lith.lith_fill,
        });
      }),
    ]
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

  if (!environs) return h("div");

  return h.if(environs && environs.length > 0)(
    ExpansionPanel,
    {
      title: "Environment ",
      sideComponent: h(EnvironTypes, { environ_types }),
      subheader: true,
    },
    [
      h("p.expansion-panel-detail-header", ["Matched environments: "]),
      macrostrat.environs.map((env, i) => {
        return h(AttrChip, {
          key: i,
          name: env.environ,
          color: env.color,
        });
      }),
    ]
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
    ExpansionPanel,
    {
      title: "Economy ",
      subheader: true,
      sideComponent: h(EconType, { econ_types }),
    },
    [
      h("p.expansion-panel-detail-header", ["Matched economic attributes: "]),
      econs.map((econ, i) => {
        return h(AttrChip, {
          key: i,
          name: econ.econ,
          color: econ.color,
        });
      }),
    ]
  );
}

export { MacrostratLinkedData };
