import h from "./main.module.sass";
import { Spinner } from "@blueprintjs/core";
import { usePageTransitionStore } from "~/renderer/usePageTransitionStore";
import classNames from "classnames";
import { Footer, PageBreadcrumbs } from "~/components";
import { useTransition } from "transition-hook";
import { NavigationLinkProvider } from "~/_providers";

export function BasePage({ children, className, fitViewport = false }) {
  const inPageTransition = usePageTransitionStore(
    (state) => state.inPageTransition
  );

  const loadingTransition = useTransition(inPageTransition, 300);

  return h(
    "div",
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

export function ContentPage({ children, className, ...rest }) {
  return h(
    BasePage,
    { className: classNames("content-page", className), ...rest },
    h(NavigationLinkProvider, children)
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
    ContentPage,
    { className: classNames("centered", className) },
    children
  );
}

export function ContentPage2({ children, className, ...rest }) {
  return h(
    ContentPage,
    { className: classNames("content-page-2", className), ...rest },
    [
      h(PageBreadcrumbs, { separateTitle: true }),
      h("div.main", [children]),
      h(Footer),
    ]
  );
}

export const pageLayouts = {
  fullscreen: FullscreenPage,
  content: ContentPage,
  content2: ContentPage2,
};
