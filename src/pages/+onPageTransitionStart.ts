export { onPageTransitionStart };
import { usePageTransitionStore } from "../renderer/transitions";

async function onPageTransitionStart() {
  // This function is called when a page transition starts.
  // You can use it to add your own logic.
  // For example, you can track page views with Google Analytics.
  // See https://vite-plugin-ssr.com/page-transitions
  document.querySelector("body").classList.add("in-page-transition");
  usePageTransitionStore.getState().startTransition();
}
