import h from "@macrostrat/hyper";
import { hexToRgb } from "../utils";

function IntChip(props) {
  const { t_int } = props;
  return h(
    "div.age-chip age-chip-t-int",
    {
      style: { backgroundColor: hexToRgb(t_int.color, 0.8) },
    },
    [
      t_int.int_name,
      h.if(t_int.t_age)("span.age-chip-ma", ["Ma"]),
      " - ",
      t_int.t_age,
      h("span.age-chip-ma", ["Ma"]),
    ]
  );
}

function AgeChip(props) {
  const { t_int, b_int } = props;
  return h("div.age-chip-container", [
    h(
      "div.age-chip",
      {
        style: { backgroundColor: hexToRgb(props.b_int.color, 0.8) },
      },
      [
        b_int.int_name || "Unknown",
        h.if(b_int.b_age)("div.age-chip-age", [
          b_int.b_age,
          h("span.age-chip-ma", ["Ma"]),
          " -  ",
          b_int.t_age,
          h("span.age-chip-ma", ["Ma"]),
        ]),
      ]
    ),

    h.if(b_int.int_id != props.t_int.int_id)(IntChip, { t_int }),
  ]);
}

export default AgeChip;
