import h from "@macrostrat/hyper";
import { hexToRgb } from "../utils";

function IntervalChip(props) {
  const { interval, className } = props;
  return h(
    "div.age-chip",
    {
      className,
      style: { backgroundColor: hexToRgb(interval.color, 0.8) },
    },
    [
      h("div.age-chip-interval", interval.int_name),
      h("div.age-chip-age", [
        h(Age, { age: interval.b_age }),
        " - ",
        h(Age, { age: interval.t_age }),
      ]),
    ]
  );
}

function Age({ age }) {
  return h("span.age", [age, h("span.age-chip-ma", ["Ma"])]);
}

function AgeChip(props) {
  const { t_int, b_int } = props;
  console.log(props);
  return h("div.age-chip-container", [
    h(IntervalChip, { interval: b_int }),
    h.if(b_int.int_id != props.t_int.int_id)(IntervalChip, {
      interval: t_int,
      className: "age-chip-t-int",
    }),
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

export { AgeChip, AttrChip };
