import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { Link } from "~/renderer/Link";
import { Card } from "@blueprintjs/core";
import { navigate as nav } from "vike/client/router";

const h = hyper.styled(styles);

interface LinkCardProps {
  title: string;
  href: string;
  children: React.ReactNode;
}

export function LinkCard(props: LinkCardProps) {
  const { href, title, children } = props;

  return h(
    Card,
    {
      className: "link-card",
      interactive: true,
      onClick() {
        nav(href);
      },
    },
    [h("h3", h(Link, { href }, title)), h("p", children)]
  );
}
