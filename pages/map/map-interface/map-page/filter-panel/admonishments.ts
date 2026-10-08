import { hyperStyled } from "@macrostrat/hyper";
import { useAppActions, useAppState, MapLayer } from "../../app-state";
import React from "react";
import { Button, Intent, Icon } from "@blueprintjs/core";
import styles from "./filters.module.styl";
import { useAtomValue } from "jotai";
import { compilationsAtom } from "~/_utils/compilations";

const h = hyperStyled(styles);

export function useAdmoinshments(): React.ReactNode[] {
  const isLineSymbolsEnabled = useAppState((state) =>
    state.mapLayers.has(MapLayer.LINE_SYMBOLS)
  );

  const compilation = useAppState((state) => state.compilation);

  const admonishments: React.ReactNode[] = [];

  if (compilation != null) {
    admonishments.push(
      h(CompilationAdmonishment, { key: "compilation", compilation })
    );
  }
  if (isLineSymbolsEnabled) {
    admonishments.push(h(LineSymbolAdmonishment, { key: "line-symbols" }));
  }
  return admonishments;
}

/** The map is drawn from a compilation other than the default, `carto`. */
function CompilationAdmonishment({ compilation }: { compilation: string }) {
  const runAction = useAppActions();
  const compilations = useAtomValue(compilationsAtom);

  let name = compilation;
  if (compilations.state == "hasData") {
    name = compilations.data.find((c) => c.slug == compilation)?.name ?? compilation;
  }

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
      h("span.text", ["Compilation: ", name, " "]),
      h("span.spacer"),
      h(Button, {
        minimal: true,
        intent: Intent.DANGER,
        icon: h(Icon, { icon: "cross", iconSize: 12 }),
        onClick(evt) {
          runAction({ type: "set-compilation", compilation: null });
          evt.stopPropagation();
        },
      }),
    ])
  );
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
        onClick(evt) {
          runAction({ type: "toggle-map-layer", layer: MapLayer.LINE_SYMBOLS });
          evt.stopPropagation();
        },
      }),
    ])
  );
}
