import hyper from "@macrostrat/hyper";
import styles from "./unconformity-line.module.sass";

const h = hyper.styled(styles);

export function UnconformityLine({ width }) {
  return h("div.unconformity-line", [h(UnconformityLineSVG, { width })]);
}

function UnconformityLineSVG({ width }) {
  // Path with a repeating squiggly stroke filling width

  let d = "M0 5 Q2.5 2 5 5";

  for (let i = 10; i < width; i += 5) {
    d += ` T${i} 5`;
  }

  return h("svg", { width, height: 10 }, [
    h("path", {
      d,
      fill: "none",
    }),
  ]);
}
