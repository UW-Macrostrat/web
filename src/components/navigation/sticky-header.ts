import hyper from "@macrostrat/hyper";
import styles from "./sticky-header.module.sass";

const h = hyper.styled(styles);

export function StickyHeader(props) {
  return h("div.sticky-header", props);
}
