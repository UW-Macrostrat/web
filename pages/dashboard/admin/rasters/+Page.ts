/** Raster layers: what the index serves, and the way in to the rasters of
 * each. Finding rasters is a task of its own; what it finds waits in the
 * inbox until someone places it in a layer.
 */
import hyper from "@macrostrat/hyper";
import { AnchorButton, HotkeysProvider, Tag } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import { countInbox, inboxURL, scanTaskURL } from "./api";
import { LayersSheet } from "./layers-sheet";
import { RequireAdminRole } from "./require-admin";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  return h("div.rasters-page", [
    h(RequireAdminRole, { what: "manage rasters" }, [
      h(PageLinks),
      h(HotkeysProvider, h(LayersSheet)),
      h(
        "p.muted",
        "A layer with rasters can't be deleted; move them out first. " +
          "Colormaps and class vocabularies are set from the command line."
      ),
    ]),
  ]);
}

function useInboxCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    countInbox()
      .then((n) => {
        if (!cancelled) setCount(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return count;
}

function PageLinks() {
  const count = useInboxCount();
  return h("div.page-links", [
    h(AnchorButton, {
      href: inboxURL,
      icon: "inbox",
      text: "Inbox",
      rightIcon: h.if(count != null)(
        Tag,
        { minimal: true, round: true },
        count
      ),
    }),
    h(AnchorButton, {
      href: scanTaskURL,
      icon: "search",
      text: "Find rasters",
    }),
  ]);
}
