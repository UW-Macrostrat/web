/** Rasters registered but in no layer: found by a scan, served nowhere. */
import hyper from "@macrostrat/hyper";
import { HotkeysProvider } from "@blueprintjs/core";
import { RastersSheet } from "../rasters-sheet";
import { RequireAdminRole } from "../require-admin";
import styles from "../main.module.sass";

const h = hyper.styled(styles);

export function Page() {
  return h("div.rasters-page", [
    h(RequireAdminRole, { what: "manage rasters" }, [
      h(
        "p.muted",
        "Select rasters by their row headers, then choose a layer to move them to."
      ),
      h(HotkeysProvider, h(RastersSheet, { layer: null })),
    ]),
  ]);
}
