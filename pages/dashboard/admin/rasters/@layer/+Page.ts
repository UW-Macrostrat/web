/** One layer's rasters, which can be moved to another layer or the inbox. */
import hyper from "@macrostrat/hyper";
import { AnchorButton, HotkeysProvider } from "@blueprintjs/core";
import { usePageContext } from "vike-react/usePageContext";
import { layerMapURL } from "../api";
import { RastersSheet } from "../rasters-sheet";
import { RequireAdminRole } from "../require-admin";
import styles from "../main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  const ctx = usePageContext();
  const layer = String(ctx.routeParams.layer);
  return h("div.rasters-page", [
    h(RequireAdminRole, { what: "manage rasters" }, [
      h(
        "div.page-links",
        h(AnchorButton, {
          href: layerMapURL(layer),
          icon: "map",
          text: "View map",
        })
      ),
      h(HotkeysProvider, h(RastersSheet, { key: layer, layer })),
    ]),
  ]);
}
