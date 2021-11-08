import h from "@macrostrat/hyper";
import { ExpansionPanel } from "./ExpansionPanel";
import PBDBCollections from "../PBDBCollections";

export function FossilCollections(props) {
  const { data, expanded } = props;

  if (!data || data.length <= 0) {
    return "";
  }
  return h("span", [
    h(
      ExpansionPanel,
      {
        classes: { root: "regional-panel" },
        title: "Fossil collections",
        helpText: "via PBDB",
        expanded,
      },
      [h(PBDBCollections, { data })]
    ),
  ]);
}
