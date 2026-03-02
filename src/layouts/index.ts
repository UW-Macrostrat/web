import h from "./main.module.sass";
import { Spinner } from "@blueprintjs/core";
import { usePageTransitionStore } from "~/renderer/usePageTransitionStore";
import classNames from "classnames";
import { PageBreadcrumbs } from "~/components";
import { useTransition } from "transition-hook";
import { NavigationLinkProvider } from "~/_providers";
import { Footer } from "./footer";
import { Navbar } from "./navbar";

export { Footer, Navbar };

export function BasePage({ children, className, fitViewport = false }) {
  const inPageTransition = usePageTransitionStore(
    (state) => state.inPageTransition
  );

  const loadingTransition = useTransition(inPageTransition, 300);

  return h(
    "div.base-page",
    {
      className: classNames(className, { "fit-viewport": fitViewport }),
    },
    [
      children,
      // A global admin console that can be opened with shift+alt+I
      h.if(loadingTransition.shouldMount)(
        "div.page-transition",
        { className: `page-transition-${loadingTransition.stage}` },
        h("div.page-transition-content", h(Spinner))
      ),
    ]
  );
}

export function FullscreenPage({ children, className, ...rest }) {
  return h(
    BasePage,
    {
      className: classNames("fullscreen-page", className),
      fitViewport: true,
      ...rest,
    },
    children
  );
}

export function BaseContentPage({ children, className, ...rest }) {
  return h(
    BasePage,
    { className: classNames("content-page", className), ...rest },
    h(NavigationLinkProvider, h("div.content-page-inner", children))
  );
}

export function DocumentationPage({ children, className, ...rest }) {
  return h(
    CenteredContentPage,
    { className: classNames("documentation-page", className), ...rest },
    h([h(PageBreadcrumbs), children])
  );
}

export function CenteredContentPage({ children, className }) {
  return h(
    BaseContentPage,
    { className: classNames("centered", className) },
    children
  );
}

export function ContentPage({ children, className, ...rest }) {
  return h(BaseContentPage, { className, ...rest }, [
    h(PageBreadcrumbs, { separateTitle: true }),
    h("div.main", children),
    h(Footer),
  ]);
}

export function MetaPage({ children, className, ...rest }) {
  return h(BaseContentPage, { className, ...rest }, [
    h(Navbar),
    h("div.main", children),
    h(Footer),
  ]);
}

export function IndexPage({ children, className, ...rest }) {
  /** Similar to an index page, but with breadcrumbs that are not separated from the title, leading to easier mechanics for
   * content where the interior is not the focus */
  return h(BaseContentPage, { className, ...rest }, [
    h(PageBreadcrumbs, { separateTitle: false }),
    h("div.main", [children]),
    h(Footer),
  ]);
}

export const pageLayouts = {
  fullscreen: FullscreenPage,
  content: ContentPage,
  content2: ContentPage,
  index: IndexPage,
  meta: MetaPage,
};
