import hyper from "@macrostrat/hyper";
import { MacrostratIcon } from "./macrostrat-icon";
import styles from "./icon.module.sass";

const h = hyper.styled(styles);

export function PageTitle(props) {
  const { title = "Macrostrat ", children } = props;
  return h("h1.page-title", [
    h(MacrostratIcon, { size: 24 }),
    h("span.title", title),
    " ",
    children,
  ]);
}
