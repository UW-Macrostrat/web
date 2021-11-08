import h from "@macrostrat/hyper";
import { CircularProgress } from "@material-ui/core";
import Journal from "../gdd/Journal";
import { ExpansionPanel } from "./ExpansionPanel";

function GddExpansion(props) {
  const { mapInfo, gddInfo, openGdd, fetchingGdd } = props;
  const { mapData } = mapInfo;

  if (!mapInfo || !mapData || mapData.lenght == 0) return h("div");

  return h("span", [
    h(
      ExpansionPanel,
      {
        classes: { root: "regional-panel" },
        onChange: openGdd,
        title: "Primary Literature",
        helpText: "via GeoDeepDive",
      },
      [
        h("div", { className: fetchingGdd ? "infoDrawer-loading" : "hidden" }, [
          h(CircularProgress, { size: 50 }),
        ]),
        h.if(gddInfo.length > 0)([
          gddInfo.map((journal) => {
            return h(Journal, { data: journal, key: journal.name });
          }),
        ]),
      ]
    ),
  ]);
}

export { GddExpansion };
