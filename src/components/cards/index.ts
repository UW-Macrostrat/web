import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { Link } from "~/components/navigation/Link";

const h = hyper.styled(styles);

interface LinkCardProps {
  title: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function LinkCard(props: LinkCardProps) {
  const { href, title, children, className } = props;

  return h(
    Link,
    {
      className: `link-card bp6-card ${className}`,
      href,
    },
    [h("h3", title), children]
  );
}
