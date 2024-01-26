import h from "@macrostrat/hyper";
import { usePageContext } from "./page-context";

export function Link(props: {
  href?: string;
  className?: string;
  children: React.ReactNode;
  target?: string;
}) {
  const pageContext = usePageContext();
  const className = [
    props.className,
    pageContext.urlPathname === props.href && "is-active",
  ]
    .filter(Boolean)
    .join(" ");
  return h("a", { ...props, className });
}
