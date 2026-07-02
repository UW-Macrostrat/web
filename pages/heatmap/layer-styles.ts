/** Mapbox overlay styles for the heatmap page.
 *
 * The headline layer is tile-request density from the tileserver-stats pipeline
 * (`/stats/tileserver/{z}/{x}/{y}`, MVT source-layer `requests`, property
 * `num_requests`); the access-point layers consume the web-usage routes
 * (`/stats/web/...`). Source-layer names are a cross-repo contract with the
 * tileserver.
 */

import { tileserverDomain } from "@macrostrat-web/settings";

/** Diverging blue→red ramp for request density. Shared with the panel legend. */
export const REQUEST_RAMP = [
  "#2c7bb6",
  "#abd9e9",
  "#ffffbf",
  "#fdae61",
  "#d7191c",
];

/** Color domain in requests per z8-equivalent cell. The route aggregates
 * ~4^(8−lz) z8 cells per displayed cell, so raw counts grow by up to
 * log10(256)=2.408 from z4 down to z0; we shift this domain by zoom (below) so
 * density reads consistently across zoom levels. */
const DENSITY_DOMAIN = [1_000, 1_000_000];
const ZOOM_SPAN = 2.408; // log10(4^4): max aggregation offset, at z0

/** Opacity scaling for request density. Cells at/below the cutoff render at a
 * small nonzero floor — so the ~uniform "scraping baseline" (low counts
 * everywhere, even mid-ocean) stays barely visible without dominating — and
 * above it opacity rises *exponentially* so genuine hotspots pop.
 *
 * The thresholds are in requests per z8-equivalent cell. They're shifted by the
 * same zoom offset as the color domain, so in absolute counts the cutoff scales
 * ×4 per zoom level out (exponentially), tracking how the scraping floor
 * aggregates as cells merge. */
const OPACITY_FLOOR = 0.05; // minimum opacity (nonzero) at/below the cutoff
const OPACITY_MAX = 0.8; // opacity once density reaches OPACITY_FULL
// Thresholds in real units — requests per z8-equivalent cell. Below the cutoff
// only the floor shows; opacity ramps up to OPACITY_MAX by OPACITY_FULL.
const OPACITY_CUTOFF = 500_000; // requests/cell below which only the floor shows
const OPACITY_FULL = 10_000_000; // requests/cell at which opacity reaches OPACITY_MAX
const OPACITY_BASE = 2; // exponential steepness of the rise above the cutoff
const OPACITY_RAMP_STEPS = 6; // explicit stops used to draw the exponential curve

const logRequests = [
  "log10",
  ["max", 1, ["to-number", ["get", "num_requests"]]],
];

/** Color ramp over log10(num_requests), with the domain shifted by `offset` (in
 * log units) so the same colors mean the same per-cell density at any zoom. */
function densityRamp(offset: number) {
  // The expression input is log10(requests), so convert the real-unit domain.
  const lo = Math.log10(DENSITY_DOMAIN[0]);
  const hi = Math.log10(DENSITY_DOMAIN[1]);
  const n = REQUEST_RAMP.length;
  const expr: any[] = ["interpolate", ["linear"], logRequests];
  for (let i = 0; i < n; i++) {
    const stop = lo + ((hi - lo) * i) / (n - 1) + offset;
    expr.push(stop, REQUEST_RAMP[i]);
  }
  return expr;
}

/** Opacity ramp: a nonzero floor at/below the (zoom-shifted) cutoff, rising to
 * OPACITY_MAX at the top of the density domain. The rise is an *explicit*
 * exponential — each stop's opacity is OPACITY_FLOOR..OPACITY_MAX scaled by
 * (OPACITY_BASE^t − 1)/(OPACITY_BASE − 1) — built out as discrete stops and
 * interpolated linearly, so the curve is inspectable and tunable. Inputs below
 * the first stop clamp to the floor, so the scraping baseline stays faint. */
function opacityRamp(offset: number) {
  // The expression input is log10(requests), so convert the real-unit
  // thresholds here. `offset` is already in log units (the zoom shift).
  const lo = Math.log10(OPACITY_CUTOFF);
  const hi = Math.log10(OPACITY_FULL);
  const denom = OPACITY_BASE - 1;
  const expr: any[] = ["interpolate", ["linear"], logRequests];
  for (let i = 0; i < OPACITY_RAMP_STEPS; i++) {
    const t = i / (OPACITY_RAMP_STEPS - 1);
    const frac = (Math.pow(OPACITY_BASE, t) - 1) / denom;
    const stop = lo + (hi - lo) * t + offset;
    const opacity = OPACITY_FLOOR + (OPACITY_MAX - OPACITY_FLOOR) * frac;
    expr.push(stop, opacity);
  }
  return expr;
}

/** Tile-request density heatmap from tileserver_stats.location_index. The
 * MVT source-layer (`requests`) and property (`num_requests`) are a contract
 * with the tileserver route /stats/tileserver/{z}/{x}/{y}. */
export function requestStatsStyle(): mapboxgl.Style {
  return {
    version: 8,
    sources: {
      "request-stats": {
        type: "vector",
        tiles: [`${tileserverDomain}/stats/tileserver/{z}/{x}/{y}`],
        // Data caps at the z8 binning; overzoom rather than fetch finer tiles.
        maxzoom: 8,
      },
    },
    layers: [
      {
        id: "request-density",
        type: "fill",
        source: "request-stats",
        "source-layer": "requests",
        paint: {
          // Zoom-and-property ramp: the domain shifts up at low zoom (where each
          // cell aggregates more z8 cells) and back to 0 at z≥4. (zoom must be
          // the outermost interpolate input, so the offset can't be nested in
          // the value expression — hence two pre-built ramps.)
          "fill-color": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            densityRamp(ZOOM_SPAN),
            4,
            densityRamp(0),
          ],
          // Opacity scales with density too, so the low-count scraping floor
          // fades out and real hotspots stand out. Same zoom compensation.
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            opacityRamp(ZOOM_SPAN),
            4,
            opacityRamp(0),
          ],
        },
      },
    ],
  };
}

/** Legacy all-time app-access points. */
export function allAccessStyle(): mapboxgl.Style {
  return {
    version: 8,
    sources: {
      access: {
        type: "vector",
        tiles: [`${tileserverDomain}/stats/web/macrostrat/{z}/{x}/{y}`],
      },
    },
    layers: [
      {
        id: "access-points",
        type: "circle",
        source: "access",
        "source-layer": "default",
        paint: { "circle-color": "#838383", "circle-radius": 4 },
      },
    ],
  };
}

/** Legacy app-access points from the last 24 hours. */
export function todayAccessStyle(): mapboxgl.Style {
  return {
    version: 8,
    sources: {
      today: {
        type: "vector",
        tiles: [
          `${tileserverDomain}/stats/web/macrostrat/{z}/{x}/{y}?today=true`,
        ],
      },
    },
    layers: [
      {
        id: "today-points",
        type: "circle",
        source: "today",
        "source-layer": "default",
        paint: { "circle-color": "#373ec4", "circle-radius": 4 },
      },
    ],
  };
}
