import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { Link } from "~/components/navigation/Link";
import classNames from "classnames";
import type { ReactNode } from "react";

const h = hyper.styled(styles);

interface LinkCardProps {
  title?: ReactNode;
  href: string;
  children?: ReactNode;
  className?: string;
  /**
   * Render the card as a block with a full-bleed overlay link rather than an
   * anchor wrapping everything, so the card's own content may contain links.
   *
   * Anchors can't nest — the browser un-nests them — which otherwise rules out
   * the shape a list of stratigraphic concepts needs: the whole card leads to
   * the concept, while the member names inside it lead to their own pages. The
   * overlay sits above the card's text and *below* any link in it, so a click
   * anywhere that isn't one of those inner links follows the card.
   */
  nestedLinks?: boolean;
  /** Label for the overlay link when the title isn't plain text. */
  label?: string;
}

export function LinkCard(props: LinkCardProps) {
  const { href, title, children, className, nestedLinks = false, label } = props;

  let titleNode: ReactNode = null;
  if (title != null) {
    titleNode = h("h3", title);
  }

  if (!nestedLinks) {
    return h(
      Link,
      { className: classNames("link-card", className), href },
      [titleNode, children]
    );
  }

  let ariaLabel = label;
  if (ariaLabel == null && typeof title === "string") {
    ariaLabel = title;
  }

  return h("div.link-card.has-overlay", { className }, [
    h(Link, {
      key: "overlay",
      className: "card-overlay-link",
      href,
      "aria-label": ariaLabel,
    }),
    titleNode,
    children,
  ]);
}
