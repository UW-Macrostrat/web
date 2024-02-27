import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { Spinner } from "@blueprintjs/core";
import { usePageTransitionStore } from "~/renderer/transitions";
import classNames from "classnames";

const h = hyper.styled(styles);

export function BasePage({ children, className }) {
  const inPageTransition = usePageTransitionStore(
    (state) => state.inPageTransition
  );
  if (inPageTransition) {
    return h("div.page-transition", [h(Spinner)]);
  }

  return h("div", { className }, children);
}

export function ContentPage({ children, className }) {
  return h(
    BasePage,
    { className: classNames("content-page", className) },
    children
  );
}

export function CenteredContentPage({ children }) {
  return h(ContentPage, { className: "centered" }, children);
}
