/** Footer for the content shell's data panel, mirroring
 * `InfiniteScrollPage`'s: load progress (with the paused "Load more" button)
 * above the real site footer, both at the end of the panel's scroll content.
 *
 * Pass as `DataPanel`'s `contentFooter`. It renders inside the panel's
 * provider, so it reads live load state from the store rather than props.
 */

import { Button } from "@blueprintjs/core";
import { LoadProgressIndicator, useLoadControls } from "@macrostrat/data-sheet";
import type { ReactNode } from "react";

import { Footer } from "~/layouts/footer";

import h from "./content-footer.module.sass";

export function HybridContentFooter({ className = null }) {
  const controls = useLoadControls();

  let progress: ReactNode = h(LoadProgressIndicator);
  if (controls.paused) {
    progress = h([
      progress,
      h(
        Button,
        {
          large: true,
          minimal: true,
          intent: "primary",
          onClick: controls.loadMore,
        },
        "Load more"
      ),
    ]);
  }

  return h("div.content-footer", { className }, [
    h("div.load-progress", { key: "progress" }, progress),
    h(Footer, { key: "footer", className: "page-footer" }),
  ]);
}
