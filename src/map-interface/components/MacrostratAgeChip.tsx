import h from "@macrostrat/hyper";
import { hexToRgb } from "../utils";

function MacrostratAgeChip(props) {
  const { b_int, t_int, color, b_age, t_age } = props;
  let age = b_int.int_name || "Unknown";
  if (t_int.int_name != age) {
    age += ` - ${t_int.int_name || "Unknown"}`;
  }
  return h("div.age-chip-container", [
    h("div.age-chip", { style: { backgroundColor: hexToRgb(color, 0.8) } }, [
      age,
      h("div.age-chip-age", [
        b_age,
        ,
        h("span.age-chip-ma", ["Ma"]),
        " - ",
        t_age,
        h("span.age-chip-ma", ["Ma"]),
      ]),
    ]),
  ]);
}

export default MacrostratAgeChip;
