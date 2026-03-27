import h from "@macrostrat/hyper";

import { SETTINGS } from "@macrostrat-web/settings";
import {
  FloatingNavbar,
  MapAreaContainer,
  MapView,
  PanelCard,
  buildInspectorStyle,
} from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import {
  DarkModeButton,
  Spacer,
  useDarkMode,
} from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useEffect, useState } from "react";

export function Page() {
  return h(MagICMap, { mapboxToken: SETTINGS.mapboxAccessToken });
}

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: SETTINGS.burwellTileDomain,
  fillOpacity: 0.3,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;

function magicStyle() {
  return {
    sources: {
      magicSites: {
        type: "vector",
        tiles: [
          SETTINGS.burwellTileDomain +
            "/integrations/magic/geomag_sites/tiles/{z}/{x}/{y}",
        ],
        minzoom: 0,
        maxzoom: 14,
      },
    },
    layers: [
      {
        id: "magic-sites",
        type: "circle",
        source: "magicSites",
        "source-layer": "default",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            5.5,
            6,
            7,
            10,
            8.5,
            14,
            10.5,
          ],
          "circle-color": "#78088c",
          "circle-opacity": 0.95,
          "circle-stroke-width": 0,
        },
      },
    ],
  };
}

type SelectedSite = Record<string, any> | null;

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null || value === "") return null;

  return h("div", { style: detailRowStyle }, [
    h("div", { style: detailLabelStyle }, label),
    h("div", { style: detailValueStyle }, String(value)),
  ]);
}

function MagICMap({
  title = "MagIC",
  mapboxToken,
}: {
  title?: string;
  mapboxToken?: string;
}) {
  const [isOpen] = useState(true);
  const [selectedSite, setSelectedSite] = useState<SelectedSite>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [mounted, setMounted] = useState(false);

  const style = useMapStyle(mapboxToken);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mapInstance == null || !mounted) return;

    const handleClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (feature == null) return;
      console.log("clicked feature", feature.properties);
      setSelectedSite((feature.properties ?? {}) as Record<string, any>);
    };

    const handleMouseEnter = () => {
      mapInstance.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = "";
    };

    const attachHandlers = () => {
      const hasLayer = mapInstance.getLayer("magic-sites") != null;
      if (!hasLayer) return;

      mapInstance.off("click", "magic-sites", handleClick);
      mapInstance.off("mouseenter", "magic-sites", handleMouseEnter);
      mapInstance.off("mouseleave", "magic-sites", handleMouseLeave);

      mapInstance.on("click", "magic-sites", handleClick);
      mapInstance.on("mouseenter", "magic-sites", handleMouseEnter);
      mapInstance.on("mouseleave", "magic-sites", handleMouseLeave);
    };

    attachHandlers();
    mapInstance.on("idle", attachHandlers);

    return () => {
      mapInstance.off("idle", attachHandlers);

      if (mapInstance.getLayer("magic-sites") != null) {
        mapInstance.off("click", "magic-sites", handleClick);
        mapInstance.off("mouseenter", "magic-sites", handleMouseEnter);
        mapInstance.off("mouseleave", "magic-sites", handleMouseLeave);
      }
    };
  }, [mapInstance, style, mounted]);

  if (!mounted) return null;

  return h("div", { style: pageShellStyle }, [
    h("div", { style: mapWrapperStyle }, [
      h(
        MapAreaContainer,
        {
          navbar: h(FloatingNavbar, [h("h2", title), h(Spacer)]),
          contextPanel: h(PanelCard, [
            h("div", { style: { padding: "0.25rem 0" } }, [
              h("div", { style: { fontWeight: 600, marginBottom: "0.5rem" } }, [
                "Geomagnetic sites",
              ]),
              h(
                "div",
                {
                  style: {
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                    opacity: 0.8,
                  },
                },
                [
                  "Displaying point data from the MagIC database. ",
                  h(
                    "a",
                    {
                      href: "https://www2.earthref.org/MagIC",
                      target: "_blank",
                      rel: "noopener noreferrer",
                      style: {
                        color: "#9f4cc0",
                        textDecoration: "none",
                        fontWeight: 600,
                      },
                    },
                    "Visit MagIC ↗"
                  ),
                ]
              ),
              h(
                "div",
                {
                  style: {
                    marginTop: "0.75rem",
                    fontSize: "0.9rem",
                    opacity: 0.7,
                  },
                },
                "Click a point on the map to view site details."
              ),
            ]),
            h(DarkModeButton, { showText: true, minimal: true }),
          ]),
          contextPanelOpen: isOpen,
        },
        h(MapView, {
          style,
          mapboxToken,
          onMapLoaded: setMapInstance,
        })
      ),

      selectedSite != null
        ? h("div", { style: rightSidebarShellStyle }, [
            h(PanelCard, { style: rightSidebarCardStyle }, [
              h("div", { style: selectedPanelStyle }, [
                h("div", { style: selectedHeaderStyle }, [
                  h(
                    "div",
                    { style: selectedTitleStyle },
                    selectedSite.site_name ?? "Unnamed site"
                  ),
                  h(
                    "button",
                    {
                      style: clearButtonStyle,
                      onClick: () => setSelectedSite(null),
                    },
                    "Close"
                  ),
                ]),

                h("div", { style: selectedSubtleStyle }, "Geomagnetic site details"),

                h(DetailRow, {
                  label: "External ID",
                  value: selectedSite.external_id,
                }),
                h(DetailRow, {
                  label: "Formation",
                  value: selectedSite.formation,
                }),
                h(DetailRow, {
                  label: "Lithologies",
                  value: selectedSite.lithologies,
                }),
                h(DetailRow, {
                  label: "Age",
                  value:
                    selectedSite.age != null
                      ? `${selectedSite.age} ${selectedSite.age_unit ?? ""}`.trim()
                      : null,
                }),
                h(DetailRow, {
                  label: "Latitude",
                  value: selectedSite.lat,
                }),
                h(DetailRow, {
                  label: "Longitude",
                  value: selectedSite.lng,
                }),
                h(DetailRow, {
                  label: "Declination",
                  value: selectedSite.dir_dec,
                }),
                h(DetailRow, {
                  label: "Inclination",
                  value: selectedSite.dir_inc,
                }),
                h(DetailRow, {
                  label: "Alpha95",
                  value: selectedSite.dir_alpha95,
                }),
                h(DetailRow, {
                  label: "k",
                  value: selectedSite.dir_k,
                }),
                h(DetailRow, {
                  label: "Specimens / lines",
                  value: selectedSite.dir_n_specimens_lines,
                }),
                h(DetailRow, {
                  label: "VGP latitude",
                  value: selectedSite.vgp_lat,
                }),
                h(DetailRow, {
                  label: "VGP longitude",
                  value: selectedSite.vgp_lon,
                }),

                selectedSite.citations != null &&
                selectedSite.citations !== ""
                  ? h("div", { style: citationBlockStyle }, [
                      h(
                        "a",
                        {
                          href: selectedSite.citations,
                          target: "_blank",
                          rel: "noopener noreferrer",
                          style: {
                            color: "#9f4cc0",
                            textDecoration: "none",
                            fontWeight: 600,
                          },
                        },
                        "Open citation ↗"
                      ),
                    ])
                  : null,
              ]),
            ]),
          ])
        : null,
    ]),
  ]);
}

function useMapStyle(mapboxToken?: string) {
  const dark = useDarkMode();
  const isEnabled = dark?.isEnabled;

  const baseStyle = isEnabled
    ? "mapbox://styles/mapbox/dark-v10"
    : "mapbox://styles/mapbox/light-v10";

  const [actualStyle, setActualStyle] = useState(baseStyle);

  useEffect(() => {
    const overlayStyle = mergeStyles(_macrostratStyle, magicStyle());
    buildInspectorStyle(baseStyle, overlayStyle, {
      mapboxToken,
      inDarkMode: isEnabled,
    }).then((s) => {
      setActualStyle(s);
    });
  }, [baseStyle, mapboxToken, isEnabled]);

  return actualStyle;
}

const pageShellStyle = {
  width: "100%",
  height: "100%",
};

const mapWrapperStyle = {
  position: "relative" as const,
  width: "100%",
  height: "100vh",
};

const rightSidebarShellStyle = {
  position: "absolute" as const,
  top: "5.5rem",
  right: "1rem",
  width: "360px",
  maxWidth: "calc(100vw - 2rem)",
  zIndex: 30,
};

const rightSidebarCardStyle = {
  maxHeight: "calc(100vh - 7rem)",
  overflowY: "auto" as const,
};

const selectedPanelStyle = {
  padding: "0.25rem 0",
};

const selectedHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  marginBottom: "0.35rem",
};

const selectedTitleStyle = {
  fontWeight: 700,
  fontSize: "1.05rem",
  lineHeight: 1.25,
};

const selectedSubtleStyle = {
  fontSize: "0.85rem",
  opacity: 0.65,
  marginBottom: "0.9rem",
};

const detailRowStyle = {
  marginBottom: "0.7rem",
};

const detailLabelStyle = {
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  opacity: 0.6,
  marginBottom: "0.15rem",
};

const detailValueStyle = {
  fontSize: "0.95rem",
  lineHeight: 1.45,
  opacity: 0.95,
  wordBreak: "break-word" as const,
};

const citationBlockStyle = {
  marginTop: "1rem",
  paddingTop: "0.75rem",
  borderTop: "1px solid rgba(255,255,255,0.12)",
};

const clearButtonStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "6px",
  background: "transparent",
  color: "inherit",
  padding: "0.25rem 0.55rem",
  fontSize: "0.8rem",
  cursor: "pointer",
};
