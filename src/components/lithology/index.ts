import { useInDarkMode } from "@macrostrat/ui-components";
import hyper from "@macrostrat/hyper";
import { Tag, Card } from "@blueprintjs/core";
import { asChromaColor } from "@macrostrat/color-utils";
import { Popover2 } from "@blueprintjs/popover2";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function LithologyTag({ data, tooltip = null }) {
  const darkMode = useInDarkMode();
  const luminance = darkMode ? 0.9 : 0.4;
  const color = asChromaColor(data.color);
  const contents = h(
    Tag,
    {
      key: data.id,
      minimal: true,
      style: {
        color: color?.luminance(luminance).hex(),
        backgroundColor: color?.luminance(1 - luminance).hex(),
      },
    },
    data.name
  );

  if (tooltip == true) {
    tooltip = h(DefaultTooltip, { data });
  }

  if (tooltip != null) {
    return h(
      Popover2,
      {
        content: tooltip,
        interactionKind: "click",
        minimal: true,
        className: "lithology-tag-popover-holder",
      },
      contents
    );
  }

  return contents;
}

function DefaultTooltip({ data }) {
  return h(Card, { className: "lithology-tooltip" }, [
    h("div.lithology-swatch", {
      style: {
        backgroundColor: data.color,
      },
    }),
    h("div.header", [
      h("span.name", data.name),
      h("code.lith-id", `${data.lith_id}`),
    ]),
    h("div", [
      h("a", { href: `/map#lithologies=${data.lith_id}` }, "Show on map"),
    ]),
  ]);
}
