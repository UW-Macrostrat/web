import { hyperStyled } from "@macrostrat/hyper";
import { useAppActions, useAppState, MapLayer } from "../../app-state";
import React from "react";
import { Button, Intent, Icon } from "@blueprintjs/core";
import styles from "./filters.module.styl";

const h = hyperStyled(styles);

export function useAdmoinshments(): React.ReactNode[] {
  const isLineSymbolsEnabled = useAppState((state) =>
    state.core.mapLayers.has(MapLayer.LINE_SYMBOLS)
  );

  const admonishments: React.ReactNode[] = [];

  if (isLineSymbolsEnabled) {
    admonishments.push(h(LineSymbolAdmonishment, { key: "line-symbols" }));
  }
  return admonishments;
}

function LineSymbolAdmonishment() {
  const runAction = useAppActions();

  return h(
    Button,
    {
      className: "admonishment",
      intent: Intent.WARNING,
      minimal: true,
      small: true,
      onClick() {
        runAction({ type: "go-to-experiments-panel" });
      },
    },
    h("span.button-contents", [
      h(Icon, { icon: "warning-sign", iconSize: 12 }),
      h("span.text", "Experimental line symbols "),
      h("span.spacer"),
      h(Button, {
        minimal: true,
        intent: Intent.DANGER,
        icon: h(Icon, { icon: "cross", iconSize: 12 }),
        onClick() {
          runAction({ type: "toggle-map-layer", layer: MapLayer.LINE_SYMBOLS });
        },
      }),
    ])
  );
}
