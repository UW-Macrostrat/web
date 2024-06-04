import { FocusStyleManager } from "@blueprintjs/core";

export function onBeforeRenderClient() {
  FocusStyleManager.onlyShowFocusOnTabs();
}
