import { Children } from "react";
import { Card, Button } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./card.module.styl";

const h = hyper.styled(styles);

const CloseableCardHeader = (props) => h("div.card-header-left", props);

const CloseableCard = (props) => {
  let {
    isOpen,
    onClose,
    title,
    transitionDuration,
    showHeader = true,
    children,
    ...rest
  } = props;
  if (!isOpen) {
    return null;
  }
  rest.className = "closeable-card";

  // Set header from "CloseableCardHeader" unless  not set,
  // otherwise use "title"
  let header = null;
  const newChildren = Children.map(children, function (c) {
    if (c.type === CloseableCardHeader) {
      header = c;
      return null;
    }
    return c;
  });

  if (header == null) {
    if (title != null) {
      title = h("h4", title);
    }
    header = h([title]);
  }

  return h(Card, rest, [
    h.if(showHeader)("div.card-header", [
      header,
      h("div.spacer"),
      h(Button, {
        icon: "small-cross",
        className: "card-close-button",
        minimal: true,
        "aria-label": "Close",
        onClick: onClose,
      }),
    ]),
    h("div.card-content", null, newChildren),
  ]);
};

CloseableCard.Header = CloseableCardHeader;

export { CloseableCard };
