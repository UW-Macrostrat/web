/** The snapshot route's side of the renderer contract.
 *
 * Mounted inside a `MapView`, this waits for the map to settle and then
 * publishes a handle on `window.__macrostratMapSnapshot`, which the renderer
 * polls and captures through. Settled means Mapbox's `idle` — style, sources
 * and terrain loaded, nothing animating — held for `settleMs` without another
 * frame: style operators (a filter's `setPaintProperty`, a GeoJSON source
 * being filled) run *after* the first `idle` and trigger a second one.
 *
 * That second idle is not guaranteed to come before the first one settles:
 * overlay styles are merged in after the base style loads, and a base style
 * that idles quickly — satellite imagery with no geology yet — can settle and
 * be captured without them. `requiredLayers` names the layers the overlays
 * add; the capture waits until every one of them is in the style.
 *
 * The capture reads the WebGL canvas, so the map must be built with
 * `preserveDrawingBuffer: true`. It is the canvas only: HTML over the map —
 * controls, the Mapbox wordmark, attribution — is not in the image, and the
 * page that shows it draws those itself.
 *
 * Works for any `mapbox-gl` (or `maplibre-gl`) map; it only needs `on`/`off`,
 * `loaded`, `areTilesLoaded` and `getCanvas`. The same idle-then-read loop is
 * what `renderTiledMap` in `@macrostrat/static-map-utils` does per tile, and
 * this is the piece to lift into that package once a second site needs it.
 */
import { useEffect } from "react";
import { useMapInitialized, useMapRef } from "@macrostrat/mapbox-react";

export type MapSnapshotStatus = "loading" | "ready" | "timeout";

export interface MapSnapshotHandle {
  key: string;
  status: MapSnapshotStatus;
  /** On `timeout`: what the map was still waiting on. */
  reason?: string;
  /** Canvas size in device pixels. */
  width: number;
  height: number;
  capture(mimeType: string, quality?: number): string;
}

declare global {
  interface Window {
    __macrostratMapSnapshot?: MapSnapshotHandle;
  }
}

interface ReporterOptions {
  /** The key the server computed for this view. The renderer files the image
   * under it, so the deployed site's idea of the key is the one that counts. */
  snapshotKey: string;
  /** Layers that must exist before the map counts as settled. */
  requiredLayers?: string[];
  settleMs?: number;
  timeoutMs?: number;
}

export function MapSnapshotReporter(props: ReporterOptions) {
  useMapSnapshotReporter(props);
  return null;
}

export function useMapSnapshotReporter({
  snapshotKey,
  requiredLayers = [],
  settleMs = 750,
  timeoutMs = 90_000,
}: ReporterOptions) {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;

    const publish = (status: MapSnapshotStatus, reason?: string) => {
      const canvas = map.getCanvas();
      window.__macrostratMapSnapshot = {
        key: snapshotKey,
        status,
        reason,
        width: canvas.width,
        height: canvas.height,
        capture: (mimeType, quality) => canvas.toDataURL(mimeType, quality),
      };
      document.documentElement.dataset.mapSnapshot = status;
    };

    // Why the map isn't settled yet, for the renderer's error message: the
    // sources still loading, the layers still missing, a camera still moving.
    const unsettled = (): string => {
      const parts: string[] = [];
      if (!map.loaded()) parts.push("map not loaded");
      if (!map.areTilesLoaded()) parts.push("tiles loading");
      if (map.isMoving?.()) parts.push("camera moving");
      const sources = Object.keys(map.getStyle()?.sources ?? {});
      const pending = sources.filter((id) => !map.isSourceLoaded(id));
      if (pending.length > 0)
        parts.push(`sources pending: ${pending.join(", ")}`);
      const missing = requiredLayers.filter((id) => map.getLayer(id) == null);
      if (missing.length > 0)
        parts.push(`layers missing: ${missing.join(", ")}`);
      parts.push(`${idles} idle event(s)`);
      return parts.join("; ");
    };
    let idles = 0;

    publish("loading");

    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelSettle = () => {
      if (settleTimer != null) clearTimeout(settleTimer);
      settleTimer = null;
    };
    const onIdle = () => {
      idles += 1;
      cancelSettle();
      settleTimer = setTimeout(() => {
        if (!map.loaded() || !map.areTilesLoaded()) return;
        if (requiredLayers.some((id) => map.getLayer(id) == null)) return;
        publish("ready");
      }, settleMs);
    };

    const deadline = setTimeout(() => {
      if (window.__macrostratMapSnapshot?.status !== "ready") {
        publish("timeout", unsettled());
      }
    }, timeoutMs);

    map.on("idle", onIdle);
    map.on("render", cancelSettle);
    // In case the map went idle before this mounted: one more frame, and the
    // `idle` after it.
    map.triggerRepaint();
    return () => {
      cancelSettle();
      clearTimeout(deadline);
      map.off("idle", onIdle);
      map.off("render", cancelSettle);
    };
  }, [initialized, snapshotKey, settleMs, timeoutMs, requiredLayers.join(",")]);
}
