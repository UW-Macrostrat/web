// https://vike.dev/onPageTransitionEnd
export { onPageTransitionEnd };
import { usePageTransitionStore } from "./transitions";

function onPageTransitionEnd() {
  console.log("Page transition end");
  document.querySelector("body").classList.remove("in-page-transition");
  usePageTransitionStore.getState().endTransition();
}
