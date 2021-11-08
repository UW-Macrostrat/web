import h from "@macrostrat/hyper";
import { Typography } from "@material-ui/core";
import AgeChip from "../AgeChip";
import AttrChip from "../AttrChip";
import MacrostratAgeChip from "../MacrostratAgeChip";
import { ExpansionPanel } from "./ExpansionPanel";

let Divider = () => h("div.whitespace-divider");

function MacrostratLinkedData(props) {
  const { mapInfo, bedrockMatchExpanded, source } = props;

  if (!mapInfo || !mapInfo.mapData || !mapInfo.mapData.length) {
    return h("div");
  }

  return h("span", [
    h(Divider),
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
          h(MatchBasis, { source }),
          h(Thickness, { source }),
          h(MinorFossilCollections, { source }),
          h(FossilOccs, { source }),
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
    ExpansionPanel,
    {
      title: "Age:",
    },
    [
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
    },
    [
      h.if(source.macrostrat.strat_names.length > 1)(["..."]),
      h(Divider),
      h(Divider),
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
    ExpansionPanel,
    { title: "Thickness" },
    [
      h(Typography, { className: "expansion-summary-detail" }, [
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
    ExpansionPanel,
    {
      title: "Fossil collections:",
    },
    [h("div", [macrostrat.pbdb_collections])]
  );
}

function FossilOccs(props) {
  const { source } = props;
  const { macrostrat } = source;

  if (!macrostrat) return h("div");

  return h.if(macrostrat && macrostrat.pbdb_occs)(
    ExpansionPanel,
    {
      title: "Fossil Occurences: ",
    },
    [
      h(Typography, { className: "expansion-summary-detail" }, [
        macrostrat.pbdb_occs,
      ]),
    ]
  );
}

function LithsAndClasses(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { liths, lith_types } = macrostrat;

  if (!liths) return h("div");

  return h.if(liths && liths.length > 0)(
    ExpansionPanel,
    { title: "Lithology:" },
    [
      h(Divider),
      h("p.expansion-panel-detail-header", ["Matched lithologies: "]),
      macrostrat.liths.map((lith, i) => {
        return h(AttrChip, {
          key: i,
          name: lith.lith,
          color: lith.color,
          fill: lith.lith_fill,
        });
      }),
      h.if(lith_types && lith_types.length > 0)([
        h(Divider),
        h("p.expansion-panel-detail-header", ["Matched lithology types: "]),
        lith_types.map((lithClass, i) => {
          return h(AttrChip, {
            key: i,
            name: lithClass.name,
            color: lithClass.color,
          });
        }),
      ]),
    ]
  );
}

function Environments(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { environs, environ_types } = macrostrat;

  if (!environs) return h("div");

  return h.if(environs && environs.length > 0)(
    ExpansionPanel,
    {
      title: "Environment: ",
    },
    [
      h(Divider),
      h("p.expansion-panel-detail-header", ["Matched environments: "]),
      macrostrat.environs.map((env, i) => {
        return h(AttrChip, {
          key: i,
          name: env.environ,
          color: env.color,
        });
      }),
      h.if(environ_types && environ_types.length > 0)([
        h(Divider),
        h("p.expansion-panel-detail-header", ["Matched environment types: "]),
        environ_types.map((type, i) => {
          return h(AttrChip, {
            key: i,
            name: type.name,
            color: type.color,
          });
        }),
      ]),
    ]
  );
}

function Economy(props) {
  const { source } = props;
  const { macrostrat } = source;
  const { econs, econ_types } = macrostrat;
  if (!econs) return h("div");

  return h.if(econs && econs.length > 0)(
    ExpansionPanel,
    {
      title: "Economy: ",
    },
    [
      h(Divider),
      h("p.expansion-panel-detail-header", ["Matched economic attributes: "]),
      econs.map((econ, i) => {
        return h(AttrChip, {
          key: i,
          name: econ.econ,
          color: econ.color,
        });
      }),
      h.if(econ_types && econ_types.length > 0)("div", [
        h(Divider),
        h("p.expansion-panel-detail-header", ["Matched economic types: "]),
        econ_types.map((econClass, i) => {
          return h(AttrChip, {
            key: i,
            name: econClass.name,
            color: econClass.color,
          });
        }),
      ]),
    ]
  );
}

export { MacrostratLinkedData };
