import h from "@macrostrat/hyper";
import { ExpansionPanel } from "../../expansion-panel";
import PBDBCollections from "./collections";

export function FossilCollections(props) {
  const { data, expanded } = props;

  if (!data || data.length <= 0) {
    return null;
  }
  return h(
    ExpansionPanel,
    {
      classes: { root: "regional-panel" },
      title: "Fossil collections",
      helpText: "via PBDB",
      expanded,
    },
    [h(PBDBCollections, { data })]
  );
}
