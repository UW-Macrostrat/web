import h from "@macrostrat/hyper";
import { usePageContext } from "vike-react/usePageContext";

export function useLinkIsActive(href: string) {
  const pageContext = usePageContext();
  // Page context can be null during static rendering, I guess?
  if (pageContext == null) return false;
  return pageContext.urlPathname === href;
}

export function Link(props: {
  href?: string;
  className?: string;
  children: React.ReactNode;
  target?: string;
}) {
  /** Basic link function for navigating the application.
   *
   * TODO: make this work transparently inside React router contexts
   * as well as Vike
   */

  const linkIsActive = useLinkIsActive(props.href);
  const className = [props.className, linkIsActive && "is-active"]
    .filter(Boolean)
    .join(" ");
  return h("a", { ...props, className });
}
