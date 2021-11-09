import h from "@macrostrat/hyper";
import { hexToRgb } from "../utils";

function LithChip(props) {
  const { lith: lith_ } = props;
  const { color, lith } = lith_;

  return h(
    "div.lith-chip",
    { style: { backgrounColor: hexToRgb(color, 0.6) } },
    [lith]
  );
}

export default LithChip;
