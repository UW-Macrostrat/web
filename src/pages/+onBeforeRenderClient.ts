import { FocusStyleManager } from "@blueprintjs/core";
import { updatePageMeta } from "~/renderer/page-meta";

export function onBeforeRenderClient(pageContext) {
  // Adjust title and description as needed
  updatePageMeta(pageContext);

  FocusStyleManager.onlyShowFocusOnTabs();
}
