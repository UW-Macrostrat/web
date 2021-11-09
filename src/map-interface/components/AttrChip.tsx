import h from "@macrostrat/hyper";
import { hexToRgb } from "../utils";

function AttrChip(props) {
  const { fill = null, color, name } = props;
  let styles = {};
  if (fill) {
    styles["backgroundImage"] = `url('dist/img/geologic-patterns/${fill}.png')`;
  }
  return h("div.lith-chip", { style: { ...styles } }, [
    h(
      "div.lith-chip-inner",
      { style: { backgroundColor: hexToRgb(color, 0.6) } },
      [name]
    ),
  ]);
}

export default AttrChip;
