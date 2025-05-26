import { useInDarkMode } from "@macrostrat/ui-components";
import hyper from "@macrostrat/hyper";
import { Tag, Card, Popover } from "@blueprintjs/core";
import { asChromaColor } from "@macrostrat/color-utils";
import styles from "./main.module.sass";
import classNames from "classnames";

const h = hyper.styled(styles);

export function LithologyTag({
  data,
  className = null,
  tooltip = null,
  tooltipProps = {},
  expandOnHover = false,
}) {
  const darkMode = useInDarkMode();
  const luminance = darkMode ? 0.9 : 0.4;
  const color = asChromaColor(data.color);
  const contents = h(
    Tag,
    {
      key: data.id,
      className: classNames("lithology-tag", className),
      minimal: true,
      style: {
        color: color?.luminance(luminance).hex(),
        backgroundColor: color?.luminance(1 - luminance).hex(),
      },
    },
    h("span.contents", [
      h("span.name", data.name),
      h.if(expandOnHover)("code.lithology-id", `${data.lith_id}`),
    ])
  );

  if (tooltip == true) {
    tooltip = h(DefaultTooltip, { data });
  }

  if (tooltip != null) {
    return h(
      Popover,
      {
        content: tooltip,
        interactionKind: "click",
        minimal: true,
        className: "lithology-tag-popover-holder",
        ...tooltipProps,
      },
      contents
    );
  }

  return contents;
}

function DefaultTooltip({ data, showExternalLinks = false }) {
  return h("div.lithology-tooltip", [
    h("div.lithology-swatch", {
      style: {
        backgroundColor: data.color,
      },
    }),
    h("div.header", [
      h("span.name", data.name),
      h("code.lithology-id", `${data.lith_id}`),
    ]),
    h("ul.tight-list", [
      h(LinkItem, { href: `/map#lithologies=${data.lith_id}` }, "Filter map"),
      h(LinkItem, { href: `/lex/lithology/${data.lith_id}` }, "View details"),
      h.if(showExternalLinks)([
        h(
          LinkItem,
          { href: `https://www.mindat.org/search.php?search=${data.name}` },
          "Mindat.org"
        ),
        h(
          LinkItem,
          { href: `https://en.wikipedia.org/wiki/${data.name}` },
          "Wikipedia"
        ),
      ]),
    ]),
  ]);
}

function LinkItem({ href, children }) {
  return h("li", h("a", { href }, children));
}
