import hyper from "@macrostrat/hyper";
import styles from "./sticky-header.module.sass";

const h = hyper.styled(styles);

export function StickyHeader(props) {
  return h("header.sticky-header", props);
}
