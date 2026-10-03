import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { Link } from "~/components/navigation/Link";
import classNames from "classnames";
import type { ReactNode } from "react";

const h = hyper.styled(styles);

interface LinkCardProps {
  title?: ReactNode;
  /** A small label above the title naming *what* the card links to — "Concept",
   * "Name". For a card that sits among cards of another kind, where the title
   * alone doesn't say which kind of thing you're about to open. */
  kind?: ReactNode;
  /**
   * Where the card leads. `null` renders it as a plain block with no link at
   * all — the card for the thing you are already looking at, which has nowhere
   * to go. It keeps the card's shape so it still reads as one of a set.
   */
  href?: string | null;
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
  /**
   * Click handler on the card's link. For a card that is *usually* a plain
   * navigation but sometimes something else — a list row that selects instead
   * of opening while the list is in selection mode. Call `preventDefault()` to
   * suppress the navigation; leaving the event alone lets the anchor behave
   * like any other link (middle-click, copy link, the client router).
   */
  onClick?: (event: React.MouseEvent) => void;
  /**
   * `list` is the card for a flat list or grid of many: tighter padding and no
   * page-level margin, with the shadow and hover lift kept. `compact` is for a
   * nested tree only: it also drops the shadow and the lift, since a tree of
   * cards that each lifted under the pointer would be a page that moves as you
   * read it. In both, the caller owns the spacing (a grid gap, a tree's indent).
   */
  density?: "default" | "list" | "compact";
}

export function LinkCard(props: LinkCardProps) {
  const {
    href,
    title,
    kind,
    children,
    className,
    nestedLinks = false,
    label,
    onClick,
    density = "default",
  } = props;

  // Built here rather than passed as a tag class, because a variant selected by
  // the caller's `className` would be scoped by the *caller's* style module —
  // which doesn't define it — and so would never match this module's rule.
  const cardClass = classNames(
    "link-card",
    { list: density === "list", compact: density === "compact" },
    className
  );

  let titleNode: ReactNode = null;
  if (title != null) {
    titleNode = h("h3", title);
  }

  let kindNode: ReactNode = null;
  if (kind != null) {
    kindNode = h("div.card-kind", kind);
  }

  if (href == null) {
    return h("div", { className: classNames(cardClass, "no-link") }, [
      kindNode,
      titleNode,
      children,
    ]);
  }

  if (!nestedLinks) {
    return h(Link, { className: cardClass, href, onClick }, [
      kindNode,
      titleNode,
      children,
    ]);
  }

  let ariaLabel = label;
  if (ariaLabel == null && typeof title === "string") {
    ariaLabel = title;
  }

  return h("div.has-overlay", { className: cardClass }, [
    h(Link, {
      key: "overlay",
      className: "card-overlay-link",
      href,
      onClick,
      "aria-label": ariaLabel,
    }),
    kindNode,
    titleNode,
    children,
  ]);
}
