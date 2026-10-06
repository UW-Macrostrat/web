/** Finding a place to start from — the main map's own search, confined to
 * places. The v2 `mobile/autocomplete` route returns Who's On First places
 * with a bounding box, so choosing one frames the map there; the person then
 * places the point. No external geocoder, no second request. */
import hyper from "@macrostrat/hyper";
import { useCallback, useEffect, useRef, useState } from "react";
import { InputGroup, Menu, MenuItem, Spinner } from "@blueprintjs/core";
import { apiV2Prefix } from "@macrostrat-web/settings";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export interface PlaceResult {
  name: string;
  place_type: string;
  /** `[west, south, east, north]` */
  bbox: [number, number, number, number];
  center: [number, number];
}

async function searchPlaces(query: string, signal: AbortSignal): Promise<PlaceResult[]> {
  const url = new URL(apiV2Prefix + "/mobile/autocomplete", globalThis.location?.href);
  url.search = new URLSearchParams({ query }).toString();
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) return [];
  const body = await res.json();
  const items: any[] = body?.success?.data ?? [];
  return items.filter((d) => d.category === "place" && Array.isArray(d.bbox));
}

export function PlaceSearch({ onPick }: { onPick: (place: PlaceResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced: a request per settled query, the previous one cancelled
  useEffect(() => {
    abortRef.current?.abort();
    if (query.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const handle = setTimeout(() => {
      searchPlaces(query.trim(), controller.signal)
        .then((places) => {
          if (!controller.signal.aborted) setResults(places.slice(0, 8));
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  const pick = useCallback(
    (place: PlaceResult) => {
      onPick(place);
      setQuery("");
      setResults([]);
    },
    [onPick]
  );

  let rightElement = null;
  if (loading) rightElement = h(Spinner, { size: 16 });

  let menu = null;
  if (results.length > 0) {
    menu = h(
      Menu,
      { className: "place-results" },
      results.map((place, i) =>
        h(MenuItem, {
          key: i,
          icon: "map-marker",
          text: place.name,
          label: place.place_type,
          onClick: () => pick(place),
        })
      )
    );
  }

  return h("div.place-search", [
    h(InputGroup, {
      leftIcon: "search",
      placeholder: "Find a place to start from…",
      value: query,
      rightElement,
      onValueChange: setQuery,
    }),
    menu,
  ]);
}
