import { Tag } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { Link } from "~/renderer/Link";

export function DevLink({ children, tagText = "Beta", ...props }) {
  return h(Link, props, [children, " ", h(Tag, { minimal: true }, [tagText])]);
}

export { Link };
