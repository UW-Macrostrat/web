// Import other components
import { Switch } from "@blueprintjs/core";
import { tileserverDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { DevMapPage } from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { useStoredState } from "@macrostrat/ui-components";
import { Select } from "@blueprintjs/select";
import mapboxgl from "mapbox-gl";
import { useMemo } from "react";
import styles from "./main.module.styl";
import {
  replaceSourcesForTileset,
  LineSymbolManager,
} from "~/_utils/map-layers.client";

export const h = hyper.styled(styles);

enum Compilation {
  Carto = "carto",
  Maps = "maps",
}

export function VectorMapInspectorPage({
  overlayStyle = _macrostratStyle,
  title = null,
  headerElement = null,
  tileset,
}: {
  headerElement?: React.ReactElement;
  title?: string;
  overlayStyle?: mapboxgl.Style;
  tileset: string;
}) {
  // A stripped-down page for map development

  const [state, setState] = useStoredState(
    "macrostrat:map-filter-inspector",
    defaultState,
    isStateValid
  );
  const { showLineSymbols } = state;

  const _overlayStyle = useMemo(() => {
    return replaceSourcesForTileset(overlayStyle, tileset);
  }, [tileset, overlayStyle]) as mapboxgl.Style;

  const controls = h([
    h(Switch, {
      checked: showLineSymbols,
      label: "Show line symbols",
      onChange() {
        setState({ ...state, showLineSymbols: !showLineSymbols });
      },
    }),
    h(LineSymbolManager, { showLineSymbols }),
  ]);

  return h(
    DevMapPage,
    {
      headerElement,
      mapboxToken: mapboxAccessToken,
      title: title ?? tileset,
      overlayStyle: _overlayStyle,
    },
    controls
  );
}

function CompilationSelector({ compilation, setCompilation }) {
  return h(Select, {
    items: Object.values(Compilation),
    itemRenderer: (item: any, { handleClick }) => {
      return h("div", { onClick: handleClick }, item);
    },
    onItemSelect: (item) => {
      setCompilation(item);
    },
    filterable: false,
    activeItem: compilation,
  });
}

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain,
}) as mapboxgl.Style;

function isStateValid(state) {
  if (state == null) {
    return false;
  }
  if (typeof state != "object") {
    return false;
  }
  // Must have several specific boolean keys
  for (let k of ["showLineSymbols", "xRay", "showTileExtent"]) {
    if (typeof state[k] != "boolean") {
      return false;
    }
  }

  if (typeof state.compilation != "string") {
    return false;
  }

  return true;
}

const defaultState = {
  showLineSymbols: false,
  compilation: "carto",
};
