import { ExpansionPanel } from "@macrostrat/data-components";
import h from "./physiography.module.sass";

function Physiography(props) {
  const { mapInfo } = props;
  const { regions } = mapInfo;

  // An empty div here would still count as a section in the accordion's
  // header stacking, so render nothing at all.
  if (!mapInfo || !regions) return null;

  return h.if(regions.length > 0)(
    ExpansionPanel,
    {
      classes: { root: "regional-panel" },
      title: "Physiography",
      expanded: true,
    },
    [
      regions.map((region, i) => {
        return h("div.region", { key: i }, [
          h("h3", [region.name]),
          h("p.region-group", [region.boundary_group]),
          h("p.region-description", [region.descrip]),
        ]);
      }),
    ]
  );
}

export { Physiography };
