/** The column's own fields — name, group, project, kind, status, notes —
 * edited on the overview page, as a transaction over the loaded summary in
 * the same manner as the units: only the fields that differ are held. */
import { atom } from "jotai";
import { snapshotAtom } from "./column";

/** The fields a person edits. Everything else on the summary is derived or
 * the database's. */
export interface ColumnMetadata {
  col_name: string;
  col_group: string | null;
  project_id: number | null;
  /** The format's `col_type`: `section` (measured) or `column` (composite). */
  col_type: "section" | "column";
  /** `height`, `depth` or `age`. */
  axis_type: "height" | "depth" | "age";
  status_code: "in process" | "active" | "obsolete";
  description: string | null;
}

export const METADATA_FIELDS: (keyof ColumnMetadata)[] = [
  "col_name",
  "col_group",
  "project_id",
  "col_type",
  "axis_type",
  "status_code",
  "description",
];

/** The loaded summary's fields, read for editing. */
export function metadataFromColumnInfo(info: any): ColumnMetadata {
  let col_type: ColumnMetadata["col_type"] = "column";
  if (info?.col_type === "section") col_type = "section";
  let axis_type: ColumnMetadata["axis_type"] = col_type === "section" ? "height" : "age";
  if (info?.axis_type === "height" || info?.axis_type === "depth" || info?.axis_type === "age") {
    axis_type = info.axis_type;
  }
  let status_code: ColumnMetadata["status_code"] = "in process";
  if (info?.status_code === "active" || info?.status_code === "obsolete") {
    status_code = info.status_code;
  }
  return {
    col_name: info?.col_name ?? "",
    col_group: info?.col_group ?? null,
    project_id: info?.project_id ?? null,
    col_type,
    axis_type,
    status_code,
    description: info?.description ?? info?.notes ?? null,
  };
}

export const loadedMetadataAtom = atom<ColumnMetadata>((get) =>
  metadataFromColumnInfo(get(snapshotAtom)?.columnInfo)
);

/** The fields that differ from the loaded column. */
export const metadataEditsAtom = atom<Partial<ColumnMetadata>>({});

export const metadataAtom = atom<ColumnMetadata>((get) => ({
  ...get(loadedMetadataAtom),
  ...get(metadataEditsAtom),
}));

export const isMetadataDirtyAtom = atom(
  (get) => Object.keys(get(metadataEditsAtom)).length > 0
);

/** Record one field; a field typed back to its loaded value leaves the
 * transaction. */
export const editMetadataAtom = atom(
  null,
  (get, set, changes: Partial<ColumnMetadata>) => {
    const loaded = get(loadedMetadataAtom);
    const next: Partial<ColumnMetadata> = { ...get(metadataEditsAtom), ...changes };
    for (const key of Object.keys(next) as (keyof ColumnMetadata)[]) {
      if (sameValue(next[key], loaded[key])) delete next[key];
    }
    set(metadataEditsAtom, next);
  }
);

export const resetMetadataAtom = atom(null, (_get, set) => {
  set(metadataEditsAtom, {});
});

/** The column summary as edited: the loaded one with the metadata over it,
 * which is what the submission and the column graphic read. */
export const editedColumnInfoAtom = atom((get) => {
  const info = get(snapshotAtom)?.columnInfo ?? {};
  return { ...info, ...get(metadataAtom) };
});

function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === "" || v === undefined ? null : v);
  return norm(a) === norm(b);
}
