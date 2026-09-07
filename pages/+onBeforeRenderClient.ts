import { FocusStyleManager } from "@blueprintjs/core";
import { loadAllBlueprintIcons } from "~/_utils/blueprint-icons";

/** Runs in the browser before the page is hydrated (vike-react hook).
 * Icons must be registered before hydration so the client renders the same
 * SVG paths the server did. */
export async function onBeforeRenderClient() {
  FocusStyleManager.onlyShowFocusOnTabs();
  await loadAllBlueprintIcons();
}
