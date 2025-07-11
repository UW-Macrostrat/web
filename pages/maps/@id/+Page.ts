import {
  Collapse,
  NonIdealState,
  Radio,
  RadioGroup,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import {
  tileserverDomain,
  apiV2Prefix,
  apiDomain,
  darkMapURL,
  baseMapURL,
  satelliteMapURL,
  mapboxAccessToken,
} from "@macrostrat-web/settings";
import {
  DetailPanelStyle,
  InfoDrawerContainer,
  MapAreaContainer,
  MapMarker,
  MapView,
  PanelCard,
} from "@macrostrat/map-interface";
import { buildMacrostratStyleLayers } from "@macrostrat/map-styles";
import { getMapboxStyle, mergeStyles } from "@macrostrat/mapbox-utils";
import {
  JSONView,
  NullableSlider,
  useAPIResult,
  useDarkMode,
  ErrorBoundary,
} from "@macrostrat/ui-components";
import boundingBox from "@turf/bbox";
import { LngLatBoundsLike } from "mapbox-gl";
import { useEffect, useMemo, useState } from "react";
import h from "./main.module.sass";
import { PageBreadcrumbs, MapReference, DevLink } from "~/components";
import { MapNavbar } from "~/components/map-navbar";
import { usePageProps } from "~/renderer/usePageProps";
import { usePageContext } from "vike-react/usePageContext";
import { LithologyList, LithologyTag } from "@macrostrat/data-components";
import { DataField } from "~/components/unit-details";
import { LocationPanel } from "@macrostrat/map-interface";
import InfoDrawerMainPanel from "#/map/map-interface/components/info-drawer/maps";

interface StyleOpts {
  style: string;
  focusedMap: number;
  layerOpacity: {
    vector: number | null;
    raster: number | null;
  };
  rasterURL?: string;
}

const emptyStyle: any = {
  version: 8,
  sprite: "mapbox://sprites/mapbox/bright-v9",
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  sources: {},
  layers: [],
};

function buildMacrostratStyle({
  fillOpacity = 0.4,
  strokeOpacity = 0.2,
  lineOpacity = 1,
  focusedMap = null,
}): mapboxgl.Style {
  const tileURL = `${tileserverDomain}/map/{z}/{x}/{y}?source_id=${focusedMap}`;

  return {
    version: 8,
    sources: {
      burwell: {
        type: "vector",
        tiles: [tileURL],
      },
    },
    layers: buildMacrostratStyleLayers({
      fillOpacity,
      strokeOpacity,
      lineOpacity,
    }),
  };
}

function buildOverlayStyle({
  style,
  focusedMap,
  layerOpacity,
  rasterURL = null,
}: StyleOpts): any {
  let mapStyle = emptyStyle;
  if (layerOpacity.vector != null) {
    mapStyle = buildMacrostratStyle({
      focusedMap,
      fillOpacity: layerOpacity.vector - 0.1,
      strokeOpacity: layerOpacity.vector + 0.2,
      lineOpacity: layerOpacity.vector + 0.4,
    });
  }

  if (rasterURL != null && layerOpacity.raster != null) {
    const rasterStyle = {
      ...emptyStyle,
      sources: {
        raster: {
          type: "raster",
          tiles: [
            tileserverDomain + "/cog/tiles/{z}/{x}/{y}.png?url=" + rasterURL,
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: "raster",
          type: "raster",
          source: "raster",
          minzoom: 0,
          maxzoom: 22,
          layout: {
            visibility: "visible",
          },
          paint: {
            "raster-opacity": layerOpacity.raster,
          },
        },
      ],
    };

    mapStyle = mergeStyles(rasterStyle, mapStyle);
  }

  if (style == null) {
    return mapStyle;
  }

  return mergeStyles(style, mapStyle);
}

function ensureBoxInGeographicRange(bounds: LngLatBoundsLike) {
  if (bounds[1] < -90) bounds[1] = -90;
  if (bounds[3] > 90) bounds[3] = 90;
  return bounds;
}

enum Basemap {
  Satellite = "satellite",
  Basic = "basic",
  None = "none",
}

function basemapStyle(basemap, inDarkMode) {
  switch (basemap) {
    case Basemap.Satellite:
      return satelliteMapURL;
    case Basemap.Basic:
      return inDarkMode ? darkMapURL : baseMapURL;
    case Basemap.None:
      return null;
  }
}

export function Page() {
  const { map } = usePageProps();
  const [isOpen, setOpen] = useState(false);
  const dark = useDarkMode()?.isEnabled ?? false;
  const title = map.properties.name;

  const hasRaster = map.properties.raster_url != null;

  const bounds: LngLatBoundsLike = useMemo(() => {
    return ensureBoxInGeographicRange(boundingBox(map.geometry));
  }, [map.geometry]);

  const [layer, setLayer] = useState(localStorage.getItem('basemap') || Basemap.None);
  const [style, setStyle] = useState(null);
  // Basemap style
  useEffect(() => {
    if (layer == null) setStyle(null);
    const styleURL = basemapStyle(layer, dark);
    getMapboxStyle(styleURL, {
      access_token: mapboxAccessToken,
    }).then(setStyle);
  }, [layer, dark]);

  const [selectedLocation, setSelectedLocation] = useState(null);

  const [layerOpacity, setLayerOpacity] = useState({
    vector: 0.5,
    raster: 0.5,
  });

  // Overlay style
  const [mapStyle, setMapStyle] = useState(null);
  useEffect(() => {
    setMapStyle(
      buildOverlayStyle({
        style,
        focusedMap: map.properties.source_id,
        layerOpacity,
        rasterURL: map.properties.raster_url,
      })
    );
  }, [
    map.properties.source_id,
    style,
    layerOpacity.raster == null,
    layerOpacity.vector == null,
  ]);

  // Layer opacity
  useEffect(() => {
    if (mapStyle == null) return;
    const mergeLayers = buildOverlayStyle({
      style,
      focusedMap: map.properties.source_id,
      layerOpacity,
      rasterURL: map.properties.raster_url,
    }).layers;

    for (const layer of mapStyle.layers) {
      let mergeLayer = mergeLayers.find((l) => l.id == layer.id);
      layer.layout ??= {};
      layer.paint ??= {};
      if (mergeLayer == null) {
        layer.layout.visibility = "none";
        continue;
      } else {
        layer.layout.visibility = "visible";
      }
      for (const prop in ["fill-opacity", "line-opacity", "raster-opacity"]) {
        if (mergeLayer.paint[prop] != null) {
          layer.paint[prop] = mergeLayer.paint[prop];
        }
      }
      setMapStyle({ ...mapStyle, layers: mergeLayers });
    }
  }, [layerOpacity]);

  // useEffect(() => {
  //   if (mapStyle == null) return;
  //   const layers = mapStyle.layers;
  //   const rasterLayer = layers.find((l) => l.id == "raster");
  //   if (rasterLayer == null) return;
  //   rasterLayer.paint ??= {};
  //   rasterLayer.paint["raster-opacity"] = layerOpacity.raster;
  //   setMapStyle({ ...mapStyle, layers });
  // }, [layerOpacity.raster]);

  // useEffect(() => {
  //   if (mapStyle == null) return;
  //   const layers = mapStyle.layers;
  //   const vectorLayers = layers.filter((l) => l.type == "fill");
  //   for (const layer of vectorLayers) {
  //     layer.paint ??= {};
  //     layer.paint["fill-opacity"] = layerOpacity.vector;
  //   }
  //   setMapStyle({ ...mapStyle, layers });
  // }, [layerOpacity.vector]);

  const maxBounds: LatLngBoundsLike = useMemo(() => {
    const dx = bounds[2] - bounds[0];
    const dy = bounds[3] - bounds[1];
    const buf = 1 * Math.max(dx, dy);

    return ensureBoxInGeographicRange([
      bounds[0] - buf,
      bounds[1] - buf,
      bounds[2] + buf,
      bounds[3] + buf,
    ]);
  }, [bounds]);

  if (bounds == null || mapStyle == null) return h(Spinner);

  const contextPanel = h(PanelCard, [
    h("div.map-meta", [
      h("p", map.properties.description),
      h("p", ["Map ID: ", h("code", map.properties.source_id)]),
    ]),
    h("div.vector-controls", [
      h("h3", "Vector map"),
      h(OpacitySlider, {
        opacity: layerOpacity.vector,
        setOpacity(v) {
          setLayerOpacity({ ...layerOpacity, vector: v });
        },
      }),
    ]),
    h.if(hasRaster)("div.raster-controls", [
      h("h3", "Raster map"),
      h(OpacitySlider, {
        opacity: layerOpacity.raster,
        setOpacity(v) {
          setLayerOpacity({ ...layerOpacity, raster: v });
        },
      }),
    ]),
    h(BaseLayerSelector, { layer, setLayer }),
  ]);

  console.log(mapStyle, bounds, maxBounds);

  console.log('selectedLocation', selectedLocation);

  return h(
    MapAreaContainer,
    {
      className: "single-map",
      navbar: h(MapNavbar, { title, parentRoute: "/maps", isOpen, setOpen }),
      contextPanel,
      contextPanelOpen: isOpen,
      contextStackProps: {
        adaptiveWidth: true,
      },
      detailPanelStyle: DetailPanelStyle.FIXED,
      detailPanel: selectedLocation != null ? h(
        LocationPanel,
        {
          className: 'location-panel',
          position: selectedLocation,
          elevation: 10000,
          zoom: map.properties.zoom ?? 2,
          onClose: () => setSelectedLocation(null),
          loading: false,
          showCopyPositionButton: true,
          contentContainer: "div.infodrawer-content-holder",
        },
        [
          h(InfoDrawerMainPanel)
        ]
      ) : h(MapLegendPanel, map.properties),
    },
    [
      h(
        MapView,
        {
          style: mapStyle, //"mapbox://styles/mapbox/satellite-v9",
          mapboxToken: mapboxAccessToken,
          //projection: { name: "globe" },
          bounds,
          mapPosition: null,
          maxBounds,
          fitBoundsOptions: { padding: 50 },
          infoMarkerPosition: selectedLocation,
        },
        [
          h(MapMarker, {
            position: selectedLocation,
            setPosition(lnglat) {
              setSelectedLocation(lnglat);
            },
          }),
        ]
        //[h(FitBoundsManager, { bounds })]
      ),
    ]
  );
}

function BaseLayerSelector({ layer, setLayer }) {
  return h("div.base-layer-selector", [
    h("h3", "Base layer"),
    h(
      RadioGroup,
      {
        selectedValue: layer,
        onChange(e) {
          setLayer(e.currentTarget.value);
        },
      },
      [
        h(Radio, { label: "Satellite", value: Basemap.Satellite, onClick: () => localStorage.setItem('basemap', Basemap.Satellite) }),
        h(Radio, { label: "Basic", value: Basemap.Basic, onClick: () => localStorage.setItem('basemap', Basemap.Basic) }),
        h(Radio, { label: "None", value: Basemap.None, onClick: () => localStorage.setItem('basemap', Basemap.None) }),
      ]
    ),
  ]);
}

function MapLegendPanel(params) {
  return h(
    InfoDrawerContainer,
    h(
      "div.map-legend-container",
      h("div.map-legend", [
        h(PageBreadcrumbs),
        h("div.legend-header", [
          h(ErrorBoundary, [
            h(MapReference, { reference: params, showSourceID: false }),
          ]),
          h(
            "a.global-link",
            { href: "/map/dev/sources/" + params.slug, target: "_blank" },
            "View on global map"
          ),
        ]),
        h("div.flex.row", [
          h("h3", "Legend"),
          h("div.spacer"),
          h("div.dev-links", [
            h(
              DevLink,
              // Not sure why we have to fully construct the URL here, vs. constructing a relative route.
              // Probably lack of a trailing slash in the main page?
              { href: `/maps/${params.source_id}/legend` },
              "Legend table"
            ),
            h(
              DevLink,
              { href: `/maps/${params.source_id}/correlation` },
              "Correlation of units"
            ),
          ]),
        ]),
        h(MapLegendData, params),
      ])
    )
  );
}

function MapLegendData({ source_id }) {
  const legendData = useAPIResult(apiDomain + "/api/pg/new_legend", {
    source_id: 'eq.' + source_id,
  });


  if (legendData == null) return h(Spinner);

  legendData.sort((a, b) => a.t_age - b.t_age);

  return h(
    "div.legend-data",
    legendData.map((d) => h(LegendEntry, { data: d }))
  );
}

function LegendEntry({ data }) {
  const { name, color, ...rest } = data;
  const {
    legend_id,
    source_id, 
    t_interval,
    b_interval,
    //strat_name,
    //strat_name_id,
    unit_id, // need column id
    area, 
    tiny_area, 
    small_area, 
    medium_area, 
    large_area,
    lith,
    // lith_classes,
    // lith_types,
    lith_id,
    scale,
    comments,
    lithologies,
    ...r1
  } = rest;

  const selectedLegend =
    parseInt(usePageContext().urlOriginal?.split("=")[1]) ?? null;
  const [isOpen, setOpen] = useState(selectedLegend === legend_id);

  const title = h(
    "div.legend-title",
    {
      onClick() {
        setOpen(!isOpen);
      },
    },
    [
      h("div.legend-swatch", { style: { backgroundColor: color } }),
      h("div.legend-label", h("h4", name)),
    ]
  );

  const {
    age,
    descrip,
    lith_classes,
    lith_types,
    units,
    strat_names,
    min_age_interval,
    max_age_interval,
  } = r1;

  let AgeTag = null;

  if(!min_age_interval && !max_age_interval) {
    AgeTag = h(LithologyTag, {
      data: {
        name: age,
      },
    });
  } else if (min_age_interval && !max_age_interval) {
    AgeTag = h(LithologyTag, {
      data: {
        name: min_age_interval.name,
        color: min_age_interval.color,
      },
      onClick: () => {
        window.open(`/lex/intervals/${min_age_interval.int_id}`, '_self');
      },
    });
  } else if (!min_age_interval && max_age_interval) {
    AgeTag = h(LithologyTag, {
      data: {
        name: max_age_interval.name,
        color: max_age_interval.color,
      },
      onClick: () => {
        window.open(`/lex/intervals/${max_age_interval.int_id}`, '_self');
      },
    });
  } else {
    AgeTag = h('div.age-interval', [
      h(LithologyTag, {
        data: {
          name: min_age_interval.name,
          color: min_age_interval.color,
        },
        onClick: () => {
          window.open(`/lex/intervals/${min_age_interval.int_id}`, '_self');
        },
      }),
      " - ",
      h(LithologyTag, {
        data: {
          name: max_age_interval.name,
          color: max_age_interval.color,
        },
        onClick: () => {
          window.open(`/lex/intervals/${max_age_interval.int_id}`, '_self');
        },
      }),
    ])
  }

  return h("div.legend-entry", [
    title,
    h(Collapse, { isOpen }, [
      h("div.legend-details", [
        h.if(descrip)("p.legend-description", descrip),
        h.if(strat_names)(
          DataField,
          {
            label: "Stratigraphic names: ",
            value: h(LithologyList, { 
              lithologies: strat_names?.map((sn) => ({ name: sn.strat_name, id: sn.strat_name_id })),
              onClickItem: (e, sn) => window.open(`/lex/strat-names/${sn.id}`, '_self')
            }),
          }
        ),
        h.if(lith_classes?.length > 0)(
          DataField,
          {
            label: "Lithology classes: ",
            value: h(LithologyList, { lithologies: lith_classes?.map((l) => ({ name: l })) })
          }
        ),
        h.if(lith_types?.length > 0)(
          DataField,
          {
            label: "Lithology types: ",
            value: h(LithologyList, { lithologies: lith_types?.map((l) => ({ name: l })) })
          }
        ),
        h.if(units)(
          DataField,
          {
            label: "Units: ",
            value: h(LithologyList, { 
              lithologies: units?.map((unit) => ({ name: unit.name, unit_id: unit.unit_id, col_id: unit.col_id })),
              onClickItem: (e, unit) => window.open(`/columns/${unit.col_id}#unit=${unit.unit_id}`, '_self') 
            })
          }
        ),
        h.if(lithologies)(
          DataField,
          {
            label: "Lithologies: ",
            value: h(LithologyList, { 
              lithologies: lithologies?.map((lith) => ({ name: lith.lith_name, ...lith })),
              onClickItem: (e, lith) => window.open(`/lex/lithology/${lith.lith_id}`, '_self') 
            })
          }
        ),
        h.if(age)(
          DataField,
          {
            label: "Age: ",
            value: AgeTag,
          }
        ),
        h.if(area)(
          DataField,
          {
            label: "Area: ",
            value: area.toLocaleString(),
            unit: "km²",
          }
        ),
      ]),
    ]),
  ]);
}

function OpacitySlider(props) {
  return h("div.opacity-slider", [
    h(NullableSlider, {
      value: props.opacity,
      min: 0.1,
      max: 1,
      labelStepSize: 0.2,
      stepSize: 0.1,
      onChange(v) {
        props.setOpacity(v);
      },
    }),
  ]);
}