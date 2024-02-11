import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import classNames from "classnames";
import chroma from "chroma-js";
const h = hyper.styled(styles);

export function AttributedLithTag({
  lith,
  candidate = false,
  showAttributes = true,
}) {
  const className = classNames({ candidate });
  const hasAtts = showAttributes && lith.atts?.length > 0;
  const { color } = lith;

  const transparentColor = chroma(color).alpha(0.6).css();

  return h(
    "span.lith-tag-area",
    { className, style: { borderColor: transparentColor } },
    [
      h.if(hasAtts)(
        "span.lith-atts",
        { style: { color } },
        lith.atts?.map((att, i) => {
          return h([h("span.lith-att", att.name)]);
        })
      ),
      h(LithTag, { name: lith.name, color, candidate }),
    ]
  );
}

export function LithTag({ name, color, candidate = false }) {
  const transparentColor = chroma(color).alpha(0.6).css();
  let style = { borderColor: color };
  if (!candidate) {
    style.backgroundColor = transparentColor;
  } else {
    style.borderColor = chroma(color).alpha(0.6).css();
  }

  return h("span.lith-tag", { style }, name);
}
