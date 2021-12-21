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

export { AgeChip, AttrChip, MacrostratAgeChip };
