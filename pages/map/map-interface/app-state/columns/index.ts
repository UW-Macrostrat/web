import { atom } from "jotai";
import { buildMacrostratAPIURL } from "../utils.ts";
import { appStateAtom } from "../store";
import { infoMarkerPositionAtom } from "../map-data";
import { loadable } from "jotai/utils";
import { ColumnFootprints, MapLayer } from "../types";
import { findColumnsForLocation, assembleColumnSummary } from "./utils.ts";

export const allColumnsAtom = atom((get) => {
  return get(appStateAtom).allColumns;
});
export const selectedColumnMetadataAtom = atom((get) => {
  const pos = get(infoMarkerPositionAtom);
  if (pos == null) return null;
  const allColumns = get(allColumnsAtom);
  if (allColumns == null) return null;

  const providedColumns = findColumnsForLocation(allColumns ?? [], pos).map(
    (c) => c.properties
  );
  return providedColumns?.[0];
});
const columnUnitsAtom = atom(async (get, { signal }) => {
  const selectedColumnMetadata = get(selectedColumnMetadataAtom);
  if (selectedColumnMetadata == null) return null;

  const col_id = selectedColumnMetadata.col_id.toString();
  const unitsURL = buildMacrostratAPIURL("/units", { response: "long", col_id });
  // The column's own record carries its references and group id
  const columnURL = buildMacrostratAPIURL("/columns", {
    response: "long",
    format: "json",
    col_id,
  });

  const [units, columns] = await Promise.all(
    [unitsURL, columnURL].map((url) => fetchData(url, signal))
  );
  return assembleColumnSummary(
    { ...selectedColumnMetadata, ...columns?.[0] },
    units
  );
});
export const columnInfoAtom = loadable(columnUnitsAtom);

async function fetchData(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  const res = await response.json();
  return res.success.data;
}

export const columnFootprintsAtom = atom<ColumnFootprints>((get) => {
  const state = get(appStateAtom);
  if (state.mapLayers.has(MapLayer.COLUMNS)) return "all";
  if (state.showSelectedColumnFootprint) return "selected";
  return "none";
});
