import hyper from "@macrostrat/hyper";
import { MacrostratIcon } from "./macrostrat-icon";
import styles from "./icon.module.sass";

const h = hyper.styled(styles);

export function PageHeader(props) {
  const { title = "Macrostrat", showSiteName = true, children } = props;
  const siteName = "Macrostrat";
  let _showSiteName = showSiteName;
  if (title == siteName) {
    _showSiteName = false;
  }

  return h("h1.page-title", [
    h(MacrostratIcon, { size: 24 }),
    h.if(_showSiteName)([
      h("span.site-name", { hidden: !_showSiteName }, siteName),
      " ",
    ]),
    h("span.title", title),
    " ",
    children,
  ]);
}
