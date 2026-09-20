import h from "./main.module.sass";
import { Spinner } from "@blueprintjs/core";
import { usePageTransitionStore } from "~/renderer/usePageTransitionStore";
import classNames from "classnames";
import { PageBreadcrumbs, PageTitle, StickyHeader, usePageTitle } from "~/components";
import { useTransition } from "transition-hook";
import { NavigationLinkProvider } from "~/_providers";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { usePageContext } from "vike-react/usePageContext";

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
    h("div.main", [h(PageTitle), children]),
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

/** Host for the hybrid content/map frame (`~/layouts/hybrid`). Deliberately
 * bare: that frame supplies its own containment — normal document flow in its
 * content presentation, a fixed viewport-locked grid in its fullscreen one —
 * so imposing `fit-viewport` here would break the scrolling case. */
export function HybridFramePage({ children, className, ...rest }) {
  return h(
    BasePage,
    { className: classNames("hybrid-frame-page", className), ...rest },
    h(NavigationLinkProvider, children)
  );
}

/** The site ("meta") pages — About, Community, Publications and the rest of
 * `pages/(site)`. Same shape as `IndexPage`, except that the header stays with
 * the reader: these pages are long prose, and the trail back out of them
 * shouldn't scroll away. */
export function SitePage({ children, className, ...rest }) {
  return h(BaseContentPage, { className, ...rest }, [
    h(
      StickyHeader,
      { className: "site-page-header" },
      h(PageBreadcrumbs, { separateTitle: false })
    ),
    h("div.main", [children]),
    h(Footer),
  ]);
}

/** The homepage: no breadcrumb bar (the page carries the site title itself),
 * the shared content width, and the one footer. */
export function HomePage({ children, className, ...rest }) {
  return h(BaseContentPage, { className: classNames("home-page", className), ...rest }, [
    h("div.main", children),
    h(Footer),
  ]);
}

export const pageLayouts = {
  home: HomePage,
  fullscreen: FullscreenPage,
  hybrid: HybridFramePage,
  content: ContentPage,
  content2: ContentPage,
  index: IndexPage,
  site: SitePage,
  meta: MetaPage,
};
export { NavListItem } from "~/layouts/navbar.ts";
