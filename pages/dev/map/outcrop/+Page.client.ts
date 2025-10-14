import h from "@macrostrat/hyper";

import {
  MapAreaContainer,
  MapView,
  buildInspectorStyle
} from "@macrostrat/map-interface";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { useEffect, useState } from "react";
import { useDarkMode, FlexRow } from "@macrostrat/ui-components";
import { FullscreenPage } from "~/layouts";
import { MultiSelect } from "@blueprintjs/select"
import { MenuItem, Switch, Divider, Icon } from "@blueprintjs/core";
import { tileserverDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchPGData } from "~/_utils";
import { Measurement } from "./measurement";
import { usePageContext } from "vike-react/usePageContext";
import { Loading } from "~/components";
import { buildMacrostratStyle } from "@macrostrat/map-styles";

export function Page() {
    return  h(FullscreenPage, h(Map))
}

function Map() {



    const style = buildMacrostratStyle({
    tileserverDomain,
    fillOpacity: 0.3,
    strokeOpacity: 0.1,
  }) as mapboxgl.Style;

    if(style == null) return null;

    const mapPosition = {
            camera: {
                lat: 39, 
                lng: -98, 
                altitude: 6000000,
            },
        };


    return h(
        "div.map-container",
        [
        // The Map Area Container
        h(
            MapAreaContainer,
            {
                className: 'map-area-container',
            },
            [
                h(MapView, { 
                    style, 
                    mapboxToken: mapboxAccessToken, 
                    mapPosition,
                }),
            ]
        ),
        ]
    );
}