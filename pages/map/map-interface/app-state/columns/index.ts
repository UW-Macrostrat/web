import { atom } from "jotai";
import { buildMacrostratAPIURL } from "../utils.ts";
import { appStateAtom } from "../store";
import { infoMarkerPositionAtom } from "../map-data";
import { loadable } from "jotai/utils";
import { findColumnsForLocation, assembleColumnSummary } from "./utils.ts";

export const allColumnsAtom = atom((get) => {
  return get(appStateAtom).allColumns;
});
export const selectedColumnMetadataAtom = atom((get) => {
  const pos = get(infoMarkerPositionAtom);
  const allColumns = get(allColumnsAtom);

  const providedColumns = findColumnsForLocation(allColumns ?? [], pos).map(
    (c) => c.properties
  );
  return providedColumns?.[0];
});
const columnUnitsAtom = atom(async (get, { signal }) => {
  const selectedColumnMetadata = get(selectedColumnMetadataAtom);
  if (selectedColumnMetadata == null) return null;

  const url = buildMacrostratAPIURL("/units", {
    response: "long",
    col_id: selectedColumnMetadata.col_id.toString(),
  });

  const response = await fetch(url, { signal });
  const res = await response.json();
  return assembleColumnSummary(selectedColumnMetadata, res.success.data);
});
export const columnInfoAtom = loadable(columnUnitsAtom);
