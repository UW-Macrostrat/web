import { Tag, AnchorButton } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { Link } from "~/components/navigation/link-component";

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

export { Link };
