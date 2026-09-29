/** Reload tiles that failed because the tile token had expired.
 *
 * Mapbox does not retry a tile that errored, so a token that lapsed before its
 * refresh -- a laptop asleep through the timer -- would leave holes until the
 * next pan. On a 401 this refreshes the token and resets the source's tiles to
 * the same template, which makes Mapbox request them again with the new one.
 *
 * Bounded both ways: nothing is reloaded if the refresh produced no new token
 * (the server cannot mint, or the static fallback is in use), and a source is
 * retried at most once a minute, so a tileserver rejecting every token cannot
 * turn this into a loop.
 */

import { useMapRef, useMapStatus } from "@macrostrat/mapbox-react";
import { useEffect } from "react";

import { getTileToken, refreshTileToken } from "~/_utils/tile-token";

const RETRY_INTERVAL = 60 * 1000;

export function TileTokenRecovery() {
  const mapRef = useMapRef();
  const { isStyleLoaded } = useMapStatus();
  const map = mapRef.current;

  useEffect(() => {
    if (map == null) return;
    const lastRetry = new Map<string, number>();

    const onError = (event: any) => {
      const sourceId: string | undefined = event?.sourceId;
      if (event?.error?.status !== 401 || sourceId == null) return;
      const last = lastRetry.get(sourceId) ?? 0;
      if (Date.now() - last < RETRY_INTERVAL) return;
      lastRetry.set(sourceId, Date.now());
      void retry(map, sourceId);
    };

    map.on("error", onError);
    return () => {
      map.off("error", onError);
    };
  }, [map, isStyleLoaded]);

  return null;
}

async function retry(map: mapboxgl.Map, sourceId: string) {
  const before = getTileToken();
  const after = await refreshTileToken();
  if (after == null || after === before) return;
  const source = map.getSource(sourceId) as any;
  const tiles = source?.tiles ?? source?._options?.tiles;
  if (source?.setTiles == null || tiles == null) return;
  source.setTiles(tiles);
}
