import { Tag, AnchorButton } from "@blueprintjs/core";
import h from "./buttons.module.sass";
import { Link } from "~/components/navigation/Link";
import { Button, ButtonGroup, Alignment, ButtonProps } from "@blueprintjs/core";
import classNames from "classnames";

export function DevLink({ children, tagText = "Beta", ...props }) {
  return h(Link, props, [children, " ", h(Tag, { minimal: true }, [tagText])]);
}

export function DevLinkButton({ children, tagText = "Beta", ...props }) {
  return h(AnchorButton, { ...props, minimal: true }, [
    children,
    " ",
    h(Tag, { minimal: true }, [tagText]),
  ]);
}

/** Button groups harvested from the map page */
export function MenuButton(props: ButtonProps) {
  const { className, ...rest } = props;
  return h(Button, {
    minimal: true,
    className: classNames("menu-button", className),
    ...rest,
  });
}

export function MenuGroup(props) {
  return h(ButtonGroup, {
    className: "menu-group",
    vertical: true,
    minimal: true,
    large: true,
    alignText: Alignment.LEFT,
    ...props,
  });
}

export { Link };
