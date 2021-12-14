import { Spinner } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import Journal from "../gdd/Journal";
import { ExpansionPanel } from "../expansion-panel";

function GddExpansion(props) {
  const { mapInfo, gddInfo, openGdd, fetchingGdd } = props;
  const { mapData } = mapInfo;

  if (!mapInfo || !mapData || mapData.length == 0) return h("div");

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
        h.if(fetchingGdd)(Spinner),
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
