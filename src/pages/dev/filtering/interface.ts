// Import other components
import { Switch, Button, MenuItem } from "@blueprintjs/core";
import { tileserverDomain, mapboxAccessToken } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { DevMapPage } from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { useStoredState } from "@macrostrat/ui-components";
import { Select, Omnibar } from "@blueprintjs/select";
import mapboxgl from "mapbox-gl";
import { useMemo, useState, useEffect } from "react";
import styles from "./main.module.styl";
import {
  replaceSourcesForTileset,
  LineSymbolManager,
} from "~/_utils/map-layers.client";
import {
  LithologyMultiSelect
} from "./lithology-selector";

export const h = hyper.styled(styles);

enum Compilation {
  Carto = "v2/carto",
  Maps = "v2/maps",
}

export function VectorMapInspectorPage({
  overlayStyle = _macrostratStyle,
  title = null,
  headerElement = null
}: {
  headerElement?: React.ReactElement;
  title?: string;
  overlayStyle?: mapboxgl.Style;
}) {
  // A stripped-down page for map development

  const [state, setState] = useState(defaultState);
  const { showLineSymbols } = state;

  const _overlayStyle = useMemo(() => {
    return replaceSourcesForTileset(overlayStyle, state.compilation, {lithology: state.lithologies});
  }, [overlayStyle, state.lithologies, state.compilation]) as mapboxgl.Style;

  const controls = h([
    h(Switch, {
      checked: showLineSymbols,
      label: "Show line symbols",
      onChange() {
        setState({ ...state, showLineSymbols: !showLineSymbols });
      },
    }),
    h(LineSymbolManager, { showLineSymbols }),
    h(CompilationSelector, {
      compilation: state.compilation,
      setCompilation: (compilation) => {
        setState({ ...state, compilation });
      }
    }),
    h(LithologyMultiSelect, {
      selectedLithologyNames: state.lithologies,
      onChange: (lithologies) => {
        setState({ ...state, lithologies });
      }
    })
  ]);

  return h(
    DevMapPage,
    {
      headerElement,
      mapboxToken: mapboxAccessToken,
      title: title ?? state.compilation,
      overlayStyle: _overlayStyle,
    },
    controls
  );
}

const CompilationSelector = ({ compilation, setCompilation }) => {
  return h(Select, {
    items: Object.values(Compilation),
    itemRenderer: (item: any, { handleClick }) => {
      return h(MenuItem, { onClick: handleClick, text: item });
    },
    onItemSelect: (item) => {
      setCompilation(item);
    },
    filterable: false,
    activeItem: compilation,
  }, [
    h(Button, {text: compilation, rightIcon: "double-caret-vertical", placeholder: "Select a film" })
  ]);
}

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain
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
  compilation: "v2/carto",
  lithologies: []
};
