import hyper from "@macrostrat/hyper";
import { MacrostratIcon } from "./macrostrat-icon";
import { Link } from "./buttons";
import styles from "./icon.module.sass";

const h = hyper.styled(styles);

export function PageHeader(props) {
  const {
    title = "Macrostrat",
    showSiteName = true,
    children,
    className,
  } = props;
  const siteName = "Macrostrat";
  let _showSiteName = showSiteName;
  if (title == siteName) {
    _showSiteName = false;
  }

  return h("h1.page-title", { className }, [
    h(MacrostratIcon, { size: 24 }),
    h.if(_showSiteName)([
      h(Link, { href: "/", className: "site-name" }, siteName),
      " ",
    ]),
    h("span.title", title),
    " ",
    children,
  ]);
}


export function Icon(props) {
  const {
    title = "",
    showSiteName = true,
    children,
    className,
  } = props;
  const siteName = "";
  let _showSiteName = showSiteName;
  if (title == siteName) {
    _showSiteName = false;
  }

  return h("h1.page-title", { className }, [
    h(MacrostratIcon, { size: 24 }),
    h.if(_showSiteName)([
      h(Link, { href: "/", className: "site-name" }, siteName),
      " ",
    ]),
    h("span.title", title),
    " ",
    children,
  ]);
}
