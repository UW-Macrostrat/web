import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { Spinner } from "@blueprintjs/core";
import { usePageTransitionStore } from "~/renderer/usePageTransitionStore";
import classNames from "classnames";
import { PageBreadcrumbs } from "~/components";
import { useTransition } from "transition-hook";

const h = hyper.styled(styles);

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
    children
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
