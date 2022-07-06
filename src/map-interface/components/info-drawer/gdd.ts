import { Spinner } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import Journal from "../gdd/Journal";
import { ExpansionPanel } from "../expansion-panel";

function GddExpansion(props) {
  const { mapInfo, gddInfo, openGdd, fetchingGdd } = props;
  const { mapData } = mapInfo;

  if (!mapData[0] || !mapData[0].strat_name.length) return null;

  return h(
    ExpansionPanel,
    {
      className: "regional-panel",
      onChange: openGdd,
      title: "Primary literature",
      helpText: "via xDD",
    },
    [
      h.if(fetchingGdd)(Spinner),
      h.if(gddInfo.length > 0)([
        gddInfo.map((journal) => {
          return h(Journal, { data: journal, key: journal.name });
        }),
      ]),
    ]
  );
}

export { GddExpansion };
