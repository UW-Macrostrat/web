import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { Spinner } from "@blueprintjs/core";
import { usePageTransitionStore } from "~/renderer/transitions";

const h = hyper.styled(styles);

export function ContentPage({ children, className }) {
  const inPageTransition = usePageTransitionStore(
    (state) => state.inPageTransition
  );
  if (inPageTransition) {
    return h("div.page-transition", [h(Spinner)]);
  }

  return h("div.content-page", { className }, children);
}

export function CenteredContentPage({ children }) {
  return h(ContentPage, { className: "centered" }, children);
}
