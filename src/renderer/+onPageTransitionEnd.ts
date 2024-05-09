// https://vike.dev/onPageTransitionEnd
export { onPageTransitionEnd };
import { usePageTransitionStore } from "./transitions";

function onPageTransitionEnd() {
  document.querySelector("body").classList.remove("in-page-transition");
  usePageTransitionStore.getState().endTransition();
}
