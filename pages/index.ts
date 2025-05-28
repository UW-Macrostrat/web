import { onDemand } from "~/_utils";
import h from "./layout.module.sass";
import { MacrostratIcon } from "~/components";
import { SETTINGS } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { DarkModeButton } from "@macrostrat/ui-components";
import { Spinner } from "@blueprintjs/core";
import {
  MapAreaContainer,
  MapView,
} from "@macrostrat/map-interface";
import { useState, useEffect } from 'react'

export function Image({ src, className, width, height }) {
    const srcWithAddedPrefix = "https://storage.macrostrat.org/assets/web/main-page/" + src;
    return h("img", {src: srcWithAddedPrefix, className, width, height})
}

export function Navbar() {
    return h("div", {className: "nav"}, [
            h("a", {className: "nav-link", href: "/"}, h(MacrostratIcon)),
            h("a", {href: "/about"}, "About"),
            h("a", {href: "/publications"}, "Publications"),
            h("a", {href: "/people"}, "People"),
            h("a", {href: "/donate"}, "Donate"),
    ]);
}

export function Footer() {
    return h("div", {className: "footer"}, [
        h("div", {className: "footer-container"}, [
            h("div", {className: "footer-text-container"}, [
                h(Image, {className: "logo_white", src: "logo_white.png", width: "100px"}),
                h("p", {className: "footer-text"}, [
                    "Produced by the ",
                    h("a", {href: "http://strata.geology.wisc.edu", target: "_blank"}, "UW Macrostrat Lab"),
                    h("a", {href: "https://github.com/UW-Macrostrat", target: "_blank"}, h(Image, {className: "git_logo", src: "git-logo.png", width: "18px"})),
                ])
            ]),
            h("div", {className: "footer-nav"}, [
                h(DarkModeButton, { showText: true}),
                h("a", {href: "/dev/test-site/about"}, "About"),
                h("a", {href: "/dev/test-site/publications"}, "Publications"),
                h("a", {href: "/dev/test-site/people"}, "People"),
                h("a", {href: "/dev/test-site/donate"}, "Donate"),
            ]),
            h("div", {className: "footer-text-container"}, [
                h(Image, {className: "funding-logo", src: "nsf.png", width: "100px"}),
                h("div", {className: "funding-line"}, "Current support:"),
                h("div", {className: "funding-line"}, "EAR-1948843"),
                h("div", {className: "funding-line"}, "ICER-1928323"),
                h("div", {className: "funding-line"}, "UW-Madison Dept. Geoscience")
            ])
        ])
    ]);
}

export function useMacrostratAPI(str) {
    return useAPIResult(SETTINGS.apiV2Prefix + str)
}

export function BlankImage({ src, className, width, height }) {
    return h("img", {src, className, width, height})
}

export function Loading() {
    return h("div", {className: "loading"}, [
        h(Spinner),
        h("h3", "Loading..."),
    ]);
}

export function ColumnsMap({columns}) {
  const [mapInstance, setMapInstance] = useState(null); 

  const mapPosition = {
    camera: {
      lat: 39,
      lng: -98,
      altitude: 9000000,
    },
  };

  const handleMapLoaded = (map) => {
    setMapInstance(map);
  };

  useEffect(() => {
    if (!mapInstance || !columns || !columns.features?.length) return;

    if (!mapInstance.isStyleLoaded()) {
      mapInstance.once("style.load", () => addGeoJsonLayer(mapInstance, columns));
    } else {
      addGeoJsonLayer(mapInstance, columns);
    }
  }, [columns, mapInstance]);

  const addGeoJsonLayer = (map, data) => {
    if (map.getLayer("highlight-layer")) {
        map.removeLayer("highlight-layer");
    }
    if (map.getLayer("geojson-layer")) {
        map.removeLayer("geojson-layer");
    }
    if (map.getSource("geojson-data")) {
        map.removeSource("geojson-data");
    }

    map.addSource("geojson-data", {
        type: "geojson",
        data,
    });

    if (!map.getLayer("highlight-layer")) {
      map.addLayer({
        id: "highlight-layer",
        type: "fill",
        source: "geojson-data",
        paint: {
          "fill-color": "#FF0000",
        },
        filter: ["==", "col_id", ""],
      });
    }
    

    if (!map.getLayer("geojson-layer")) {
      map.addLayer({
        id: "geojson-layer",
        type: "fill",
        source: "geojson-data",
        paint: {
          "fill-color": "#FFFFFF",
          "fill-opacity": 0.5,
        },
      });

      map.on("click", "geojson-layer", (e) => {
        const feature = e.features?.[0];
        const col_id = feature?.properties?.col_id;
        if (col_id) {
          window.open(`/columns/${col_id}`, "_blank");
        }
      });

      map.on("mousemove", "geojson-layer", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = e.features?.[0];
        const col_id = feature?.properties?.col_id;
        if (col_id) {
          map.setFilter("highlight-layer", ["==", "col_id", col_id]);
        }
      });

      map.on("mouseleave", "geojson-layer", () => {
        map.getCanvas().style.cursor = "";
        map.setFilter("highlight-layer", ["==", "col_id", ""]);
      });
    }
  };

  return h("div.map-container", 
    h(MapAreaContainer, { 
        className: "map-area-container",
    },
      h(MapView, {
        style: "mapbox://styles/mapbox/dark-v10",
        mapboxToken: SETTINGS.mapboxAccessToken,
        mapPosition,
        onMapLoaded: handleMapLoaded,
      })
    )
  );
}
