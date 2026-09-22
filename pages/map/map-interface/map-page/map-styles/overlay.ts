import { buildCrossSectionLayers } from "~/_utils/map-layers";

/** Add extra types we use in this style... */
interface SourceExt extends mapboxgl.Source {
  cluster?: boolean;
  clusterRadius?: number;
  generateId?: boolean;
  promoteId?: string;
  data?: any;
}

export function buildOverlayStyle() {
  return {
    version: 8,
    layers: buildOverlayLayers(),
    sources: overlaySources,
  };
}

const overlaySources: { [k: string]: SourceExt } = {
  // "pbdb": {
  //     "type": "vector",
  //     "tiles": [
  //       `${SETTINGS.burwellTileDomain}/hexgrid/{z}/{x}/{y}.mvt`
  //     ],
  //     "tileSize": 512,
  //     "maxzoom": 6,
  // },
  "pbdb-points": {
    type: "geojson",
    cluster: true,
    clusterRadius: 50,
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  "pbdb-clusters": {
    type: "geojson",
    generateId: true,
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  // `promoteId` makes `col_id` the feature id, so hover and selection can be
  // set by column id alone — the app only ever knows columns by that.
  columns: {
    type: "geojson",
    promoteId: "col_id",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  filteredColumns: {
    type: "geojson",
    promoteId: "col_id",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  crossSectionEndpoints: {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  crossSectionLine: {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
  elevationMarker: {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  },
};

/** Resolve the first CSS custom property in a chain that is actually set,
 * matching how `@macrostrat/map-views` resolves its column-map colors — the
 * columns here answer to the same variables as the column-navigation map. */
function resolveColor(variables: string[], fallback: string): string {
  const style = getComputedStyle(document.body);
  for (const variable of variables) {
    const value = style.getPropertyValue(variable).trim();
    if (value !== "") return value;
  }
  return fallback;
}

/** Column footprints, drawn the way the column-navigation map draws them: a
 * high-contrast outline that brightens on hover and selection, and no fill of
 * its own, so the geologic map underneath stays readable.
 *
 * The fill layers remain in the style, fully transparent, because they are the
 * hit target — the map click handler queries `column_fill` /
 * `filtered_column_fill` to work out which column was clicked, and a layer is
 * only excluded from that query when its *visibility* is `none`.
 */
function buildColumnLayers(): mapboxgl.Layer[] {
  const columnColor = resolveColor(
    ["--column-map-color", "--text-subtle-color"],
    "black"
  );
  const hoverColor = resolveColor(
    ["--column-map-hover-color", "--pz-accent-color"],
    "purple"
  );
  const selectedColor = resolveColor(
    ["--column-map-selection-color", "--pz-accent-color"],
    hoverColor
  );

  const isSelected = ["boolean", ["feature-state", "selected"], false];
  const isHovered = ["boolean", ["feature-state", "hover"], false];
  const isEmphasized = ["any", isSelected, isHovered];

  const fillPaint = () => ({
    // Invisible at rest; a wash only under the pointer or the selection, which
    // is what makes a large footprint readable as one shape.
    "fill-color": ["case", isSelected, selectedColor, hoverColor],
    "fill-opacity": ["case", isEmphasized, 0.15, 0],
  });

  // A `["zoom"]` expression is only allowed as the input to the outermost
  // `interpolate`, so the emphasis test goes in each stop's output rather than
  // wrapping two zoom ramps in a `case` — that is a style validation error, and
  // one bad layer takes the whole style down.
  const widthForZoom = (base: number, emphasized: number) => [
    "case",
    isEmphasized,
    emphasized,
    base,
  ];

  const linePaint = () => ({
    "line-color": [
      "case",
      isSelected,
      selectedColor,
      isHovered,
      hoverColor,
      columnColor,
    ],
    "line-opacity": ["case", isEmphasized, 1, 0.6],
    "line-width": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      widthForZoom(0.75, 1.5),
      4,
      widthForZoom(1.25, 2.5),
      10,
      widthForZoom(2, 3.5),
    ],
  });

  const hidden = () => ({ visibility: "none" });

  // `columns` carries every column and shows when no filters are set;
  // `filteredColumns` carries the matching set and replaces it when they are.
  // Same styling either way — both are the live column set for their state.
  // Each layer gets its own paint and layout objects: mapbox-gl takes these
  // over, so sharing one between layers is asking for trouble.
  return [
    {
      id: "column_fill",
      type: "fill",
      source: "columns",
      paint: fillPaint(),
      layout: hidden(),
    },
    {
      id: "column_stroke",
      type: "line",
      source: "columns",
      paint: linePaint(),
      layout: hidden(),
    },
    {
      id: "filtered_column_fill",
      type: "fill",
      source: "filteredColumns",
      paint: fillPaint(),
      layout: hidden(),
    },
    {
      id: "filtered_column_stroke",
      type: "line",
      source: "filteredColumns",
      paint: linePaint(),
      layout: hidden(),
    },
  ] as mapboxgl.Layer[];
}

export function buildOverlayLayers(): mapboxgl.Layer[] {
  return [
    ...buildColumnLayers(),
    ...buildCrossSectionLayers(),

    // {
    //   "id": "pbdbCollections",
    //   "type": "fill",
    //   "source": "pbdb",
    //   "source-layer": "hexgrid",
    //   "layout": {
    //     "visibility": "none"
    //   },
    //   "paint": {
    //     "fill-color": ['feature-state', 'color'],
    //     "fill-color": [
    //       'case',
    //       ['==', ['feature-state', 'color'], null],
    //       'rgb(255,255,255)',
    //       ['feature-state', 'color']
    //     ],
    //     "fill-opacity": [
    //       'case',
    //       ['==', ['feature-state', 'color'], null],
    //       0,
    //       0.7
    //     ],
    //     "fill-outline-color": [
    //       'case',
    //       ['==', ['feature-state', 'color'], null],
    //       'rgb(255,255,255)',
    //       ['feature-state', 'color']
    //     ],
    //   }
    // },
    {
      id: "pbdb-points-clustered",
      type: "circle",
      source: "pbdb-points",
      filter: ["has", "point_count"],
      paint: {
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 10, 1],
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#154974",
          [
            "step",
            ["get", "point_count"],
            "#bdd7e7",
            20,
            "#6baed6",
            50,
            "#2171b5",
          ],
        ],
        "circle-radius": ["step", ["get", "point_count"], 20, 20, 30, 50, 40],
        "circle-stroke-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          2,
          0,
        ],
        "circle-stroke-color": "#fff",
      },
    },
    // {
    //   "id": "pbdb-point-cluster-count",
    //   "type": "symbol",
    //   "source": "pbdb-points",
    //   "filter": ["has", "point_count"],
    //   "layout": {
    //     "text-field": "{point_count_abbreviated}",
    //     "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    //     "text-size": 12,
    //     "icon-allow-overlap": true,
    //   }
    // },
    {
      id: "pbdb-points",
      type: "circle",
      source: "pbdb-points",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#154974",
          "#2171b5",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 8, 16, 20],
        "circle-stroke-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          2,
          1,
        ],
        "circle-stroke-color": "#ffffff",
      },
    },
    {
      id: "pbdb-clusters",
      type: "circle",
      source: "pbdb-clusters",
      paint: {
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 6, 1],
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#154974",
          ["step", ["get", "noc"], "#bdd7e7", 100, "#6baed6", 1000, "#2171b5"],
        ],
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          ["interpolate", ["linear"], ["get", "nco"], 0, 0, 1, 2, 1200, 12],
          3,
          ["interpolate", ["linear"], ["get", "nco"], 0, 0, 1, 4, 400, 18],
          6,
          ["interpolate", ["linear"], ["get", "nco"], 0, 0, 1, 10, 400, 50],
        ],
        "circle-stroke-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          2,
          0,
        ],
        "circle-stroke-color": "#fff",
      },
    },
  ];
}
