import hyper from "@macrostrat/hyper";
import { hexToRgb } from "../utils";
import styles from "./info-blocks.module.styl";
import { useDarkMode } from "@macrostrat/ui-components";
import chroma from "chroma-js";

const h = hyper.styled(styles);

function getColor(color, darkenAmount) {
  try {
    return chroma(color).darken(darkenAmount).hex();
  } catch (err) {
    return color;
  }
}

function IntervalChip(props) {
  const { interval, className } = props;
  const darkMode = useDarkMode();
  const darkenAmount = darkMode.isEnabled ? 2 : 0;

  return h('a.chip-link', 
    {
      href: `/lex/intervals/${interval.int_id}`,
    }, 
    h(
      "div.chip.age-chip",
      {
        className,
        style: {
          backgroundColor: getColor(interval.color, darkenAmount),
        },
      },
      [
        h("div.age-chip-interval", interval.int_name),
        h("div.age-chip-age", [
          h(Age, { age: interval.b_age }),
          " - ",
          h(Age, { age: interval.t_age }),
        ]),
      ]
    )
  );
}

function Age({ age }) {
  return h("span.age", [age, h("span.age-chip-ma", ["Ma"])]);
}

function AgeChip(props) {
  const { t_int, b_int } = props;
  return h("div.age-chip-container", [
    h(IntervalChip, { interval: b_int }),
    h.if(b_int.int_id != props.t_int.int_id)(IntervalChip, {
      interval: t_int,
      className: "age-chip-t-int",
    }),
  ]);
}

function AttrChip(props) {
  const {
    fill = null,
    color,
    name,
    className,
    emphasized = true,
    style,
  } = props;

  // Deactivated for now
  // if (fill) {
  //   styles["backgroundImage"] = `url('dist/img/geologic-patterns/${fill}.png')`;
  // }
  return h("div.lith-chip", { style, className }, [
    h(
      "div.lith-chip-inner.chip",
      {
        style: { backgroundColor: hexToRgb(color, 0.6) },
        className: emphasized ? "emphasized" : null,
      },
      [name]
    ),
  ]);
}

export { AgeChip, AttrChip, IntervalChip };
