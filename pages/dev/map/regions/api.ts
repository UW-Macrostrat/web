/** Regions from API v3. They are stored as `geologic_boundaries` for now; the
 * API already speaks of regions. */

import { apiV3Prefix } from "@macrostrat-web/settings";

export interface Region {
  region_id: number;
  source_id: number;
  name: string | null;
  region_group: string | null;
  region_type: string | null;
  region_class: string | null;
  /** West, south, east, north */
  bounds: [number, number, number, number] | null;
}

export interface RegionSource {
  source_id: number;
  name: string | null;
  url: string | null;
  ref_title: string | null;
  authors: string | null;
  ref_year: string | null;
  ref_source: string | null;
  isbn_doi: string | null;
  license: string | null;
  n_regions?: number;
}

export interface RegionDetail extends Region {
  description: string | null;
  wiki_link: string | null;
  source: RegionSource | null;
}

const base = `${apiV3Prefix}/regions`;

async function getJSON(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

export function fetchRegions(): Promise<Region[]> {
  return getJSON(base);
}

export function fetchRegionSources(): Promise<RegionSource[]> {
  return getJSON(`${base}/sources`);
}

export function fetchRegion(
  id: number,
  signal?: AbortSignal
): Promise<RegionDetail> {
  return getJSON(`${base}/${id}`, signal);
}
