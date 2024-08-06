// https://vike.dev/onPageTransitionEnd
export { onPageTransitionEnd };
import { usePageTransitionStore } from "~/renderer/usePageTransitionStore";

function onPageTransitionEnd() {
  document.querySelector("body").classList.remove("in-page-transition");
  usePageTransitionStore.getState().endTransition();
}
