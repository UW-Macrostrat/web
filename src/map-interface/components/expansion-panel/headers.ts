import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";

const h = hyper.styled(styles);

export function PanelSubhead(props) {
  const { title, children, ...rest } = props;
  return h("div.panel-subhead", rest, [h("h3.title", null, title), children]);
}
