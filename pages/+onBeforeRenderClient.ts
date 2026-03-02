import { FocusStyleManager } from "@blueprintjs/core";
export function onBeforeRenderClient(pageContext) {
  FocusStyleManager.onlyShowFocusOnTabs();
}
