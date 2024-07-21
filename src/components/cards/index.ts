import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { Link } from "~/components/navigation/Link";

const h = hyper.styled(styles);

interface LinkCardProps {
  title: string;
  href: string;
  children: React.ReactNode;
}

export function LinkCard(props: LinkCardProps) {
  const { href, title, children } = props;

  return h(
    Link,
    {
      className: "link-card bp5-card",
      href,
    },
    [h("h3", title), children]
  );
}
