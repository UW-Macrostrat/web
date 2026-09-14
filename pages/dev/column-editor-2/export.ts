/** Export the edited units as a `units` sheet in the column-ingestion format
 * (https://github.com/Macrostrat/column-ingestion) — the bridge back into
 * the ingestion pipeline until a write API exists. */
import type { UnitLong } from "@macrostrat/api-types";

/** Columns of the ingestion `units` sheet that the v2 API can populate, in
 * the template's order. */
export const INGESTION_UNIT_COLUMNS = [
  "unit_id",
  "col_id",
  "section_id",
  "unit_name",
  "strat_name",
  "b_pos",
  "t_pos",
  "b_int",
  "b_prop",
  "t_int",
  "t_prop",
  "lithology",
  "environment",
  "min_thickness",
  "max_thickness",
  "unit_description",
] as const;

export type IngestionUnitRow = Record<
  (typeof INGESTION_UNIT_COLUMNS)[number],
  string | number | null
>;

export function unitToIngestionRow(unit: UnitLong): IngestionUnitRow {
  return {
    unit_id: unit.unit_id,
    col_id: unit.col_id,
    section_id: unit.section_id,
    unit_name: unit.unit_name ?? "",
    strat_name: stratNameChain(unit),
    b_pos: numberOrNull(unit.b_pos),
    t_pos: numberOrNull(unit.t_pos),
    b_int: unit.b_int_name ?? "",
    b_prop: numberOrNull(unit.b_prop),
    t_int: unit.t_int_name ?? "",
    t_prop: numberOrNull(unit.t_prop),
    lithology: formatLithology(unit.lith),
    environment: (unit.environ ?? []).map((d) => d.name).join("; "),
    min_thickness: numberOrNull(unit.min_thick),
    max_thickness: numberOrNull(unit.max_thick),
    unit_description: unit.notes ?? "",
  };
}

/** The format's name chain: member, formation, group, supergroup, comma
 * separated, child first. */
function stratNameChain(unit: UnitLong): string {
  const parts: string[] = [];
  if (unit.Mbr) parts.push(`${unit.Mbr} Member`);
  if (unit.Fm) parts.push(`${unit.Fm} Formation`);
  if (unit.Gp) parts.push(`${unit.Gp} Group`);
  if (unit.SGp) parts.push(`${unit.SGp} Supergroup`);
  if (parts.length > 0) return parts.join(", ");
  return unit.strat_name_long ?? "";
}

/** `<attribute> <lith> (<proportion>); …` */
function formatLithology(liths: UnitLong["lith"]): string {
  if (liths == null) return "";
  return liths
    .map((d) => {
      const atts = (d.atts ?? []).join(" ");
      let text = d.name;
      if (atts !== "") text = `${atts} ${text}`;
      if (d.prop != null) {
        text += ` (${Math.round(d.prop * 100)}%)`;
      }
      return text;
    })
    .join("; ");
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  return n;
}

export function unitsToCSV(units: UnitLong[]): string {
  const rows = units.map(unitToIngestionRow);
  const header = INGESTION_UNIT_COLUMNS.join(",");
  const lines = rows.map((row) =>
    INGESTION_UNIT_COLUMNS.map((key) => csvCell(row[key])).join(",")
  );
  return [header, ...lines].join("\n") + "\n";
}

function csvCell(value: string | number | null): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Trigger a browser download of a text file */
export function downloadText(
  filename: string,
  text: string,
  type = "text/csv"
) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
