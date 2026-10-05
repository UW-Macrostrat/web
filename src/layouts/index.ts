import h from "./main.module.sass";
import { Spinner } from "@blueprintjs/core";
import { usePageTransitionStore } from "~/renderer/usePageTransitionStore";
import classNames from "classnames";
import { PageTitle, SitePageHeader, usePageTitle } from "~/components";
import type { SitePageHeaderProps } from "~/components/navigation/site-header";
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

/** A viewport-filling page under the site header's single row, whose body
 * takes the remaining height: a data sheet, a chart. */
export function FullscreenHeaderPage({ children, className, actions = null }) {
  return h(
    FullscreenPage,
    { className: classNames("fullscreen-header-page", className) },
    [
      h(SitePageHeader, { variant: "compact", actions }),
      h("div.fullscreen-page-body", children),
    ]
  );
}

/** `header` sits outside the content column, so a sticky bar's background
 * and rule span the page while its content keeps the column's measure. */
export function BaseContentPage({ children, className, header = null, ...rest }) {
  return h(
    BasePage,
    { className: classNames("content-page", className), ...rest },
    h(NavigationLinkProvider, [header, h("div.content-page-inner", children)])
  );
}

/** The site header for a content page, spanning the page (see `BaseContentPage`). */
export function ContentPageHeader(props: SitePageHeaderProps) {
  return h(SitePageHeader, {
    width: "constrained",
    ...props,
    className: classNames("content-page-header", props.className),
  });
}

export function DocumentationPage({ children, className, ...rest }) {
  return h(
    CenteredContentPage,
    {
      className: classNames("documentation-page", className),
      header: h(ContentPageHeader, { variant: "hybrid" }),
      ...rest,
    },
    children
  );
}

export function CenteredContentPage({ children, className, header = null }) {
  return h(
    BaseContentPage,
    { className: classNames("centered", className), header },
    children
  );
}

export function ContentPage({ children, className, ...rest }) {
  return h(
    BaseContentPage,
    { className, header: h(ContentPageHeader, { variant: "hybrid" }), ...rest },
    [h("div.main", children), h(Footer)]
  );
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
  return h(
    BaseContentPage,
    { className, header: h(ContentPageHeader, { variant: "compact" }), ...rest },
    [h("div.main", [children]), h(Footer)]
  );
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
  return h(
    BaseContentPage,
    {
      className,
      header: h(ContentPageHeader, { variant: "compact", sticky: true }),
      ...rest,
    },
    [h("div.main", [children]), h(Footer)]
  );
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
