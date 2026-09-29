import { FocusStyleManager } from "@blueprintjs/core";
import type { PageContextClient } from "vike/types";
import { loadAllBlueprintIcons } from "~/_utils/blueprint-icons";
import { ensureTileToken } from "~/_utils/tile-token";

/** Runs in the browser before the page is hydrated, and before each client-side
 * render (vike-react hook). Icons must be registered before hydration so the
 * client renders the same SVG paths the server did. The tile token arrives with
 * every page context, so each navigation hands over a fresh one. */
export async function onBeforeRenderClient(pageContext: PageContextClient) {
  ensureTileToken(pageContext.tileToken);
  FocusStyleManager.onlyShowFocusOnTabs();
  await loadAllBlueprintIcons();
}
