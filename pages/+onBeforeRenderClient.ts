import { FocusStyleManager } from "@blueprintjs/core";
import { updatePageMeta } from "~/renderer/updatePageMeta";

export function onBeforeRenderClient(pageContext) {
  // Adjust title and description as needed
  updatePageMeta(pageContext);

  FocusStyleManager.onlyShowFocusOnTabs();
}
