import {
  ColumnNavigationMap,
  useMacrostratColumns,
} from "@macrostrat/column-views";
import h from "./map.module.sass";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { ExpansionPanel } from "@macrostrat/map-interface";
import { Icon } from "@blueprintjs/core"
import { useState } from "react";
import { useMapStyleOperator } from "@macrostrat/mapbox-react"
import { satelliteMapURL } from "@macrostrat-web/settings";

export function ColumnsMapContainer(props) {
  /* TODO: integrate this with shared web components */
  return h(ErrorBoundary, h(ColumnsMapInner, props));
}

export function ExpansionPanelContainer(props) {
  return h(ExpansionPanel, props);
}

function ColumnsMapInner({
  columnIDs = null,
  className,
  columns = null,
  lex = false
}) {
  columns = columns.features

  columns = columns.map((col) => {
    // Add a property to each column feature for the column ID
    col.id = col.properties.col_id;
    return col;
  });
  
  return h(
    "div",
    { className },
    h(
      ColumnNavigationMap, 
      {
        columns,
        accessToken: mapboxAccessToken,
        style: {height: "100%"},
        onSelectColumn: (id) => {
          window.open(
            `/columns/${id}`,
            "_self"
          );
        }
      },
      h.if(lex)(LexControls)
    )
  );
}

function LexControls() {
    const [showFossils, setShowFossils] = useState(false);
    const [showSatellite, setShowSatellite] = useState(false);
    const [showOutcrop, setShowOutcrop] = useState(false);

    const handleFossils = () => {
      setShowFossils(!showFossils);
    };

    const handleSatellite = () => {
      setShowSatellite(!showSatellite);
    };

    const handleOutcrop = () => {
      setShowOutcrop(!showOutcrop);
    };

          console.log(showSatellite)


    useMapStyleOperator((map) => {
      const baseStyleURL = "mapbox://styles/your-org/default-style"; // <-- your non-satellite base style

      const currentStyle = map.getStyle().sprite; // a stable part of style for comparison

      const isSatellite = currentStyle.includes("satellite");

      if (showSatellite && !isSatellite) {
        map.setStyle(satelliteMapURL);
      } else if (!showSatellite && isSatellite) {
        map.setStyle(baseStyleURL);
      }
    }, [showSatellite, satelliteMapURL]);


    return h('div.lex-controls', [
      h('div.btn', { onClick: handleFossils }, h(Icon, { icon: "mountain", className: 'icon' })),
      h('div.btn', { onClick: handleSatellite }, h(Icon, { icon: "excavator", className: 'icon' })),
      h('div.btn', { onClick: handleOutcrop }, h(Icon, { icon: "satellite", className: 'icon' })),
    ])
}