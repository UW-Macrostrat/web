import h from "@macrostrat/hyper";
import { usePageContext } from "./page-context";

export function useLinkIsActive(href: string) {
  const pageContext = usePageContext();
  return pageContext.urlPathname === href;
}

export function Link(props: {
  href?: string;
  className?: string;
  children: React.ReactNode;
  target?: string;
}) {
  const linkIsActive = useLinkIsActive(props.href);
  const className = [props.className, linkIsActive && "is-active"]
    .filter(Boolean)
    .join(" ");
  return h("a", { ...props, className });
}
