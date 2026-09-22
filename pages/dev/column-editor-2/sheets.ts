/** The three editing tables — views only.
 *
 * - **Units** — the column's units as attributes: names, lithology, thickness.
 * - **Surfaces** — the age model, one row per surface.
 * - **Unified** — the [[column-ingestion]] `units` sheet, in that format's own
 *   vocabulary. It has no surfaces table, because a surface there is just two
 *   units sharing a value.
 *
 * Each is a `DataSheet` over the **loaded** rows with the editor's transaction
 * passed in as `updatedData`. That puts the sheet's overlay under our control:
 * the edited cells go green, `resetChanges` empties the transaction, and every
 * sheet shows the same edits however they were made. What an edit *means* is
 * in `./state/editing`; what counts as valid is in `./validation`. This file
 * only says what the tables look like.
 */
import hyper from "@macrostrat/hyper";
import { RegionCardinality } from "@blueprintjs/table";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UnitLong } from "@macrostrat/api-types";
import {
  type ColumnSpec,
  DataSheet,
  DataSheetDensity,
  type EditEvent,
  useSelector,
  useStoreAPI,
} from "@macrostrat/data-sheet";
import {
  formatProportion,
  surfaceStatusLabels,
} from "@macrostrat/column-views";
import {
  baseSurfacesAtom,
  baseUnitsAtom,
  columnScaleOptionsAtom,
  editSurfaceCellsAtom,
  editUnitCellsAtom,
  selectedSurfaceIDAtom,
  selectedUnitIDAtom,
  surfaceOverlayAtom,
  surfacesAtom,
  unitIssuesAtom,
  unitOverlayAtom,
  useIntervalDefs,
} from "./state";
import { issueForCell, validateAge, validateProportion } from "./validation";
import type { EditorSurface } from "./surfaces";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** Everything but the whole table. Selecting every cell at once (the corner
 * above the row headers) means nothing here — the selection addresses one
 * record, which the column and the details panel follow — and it would read
 * as row 0 being picked. */
const SELECTION_MODES = [
  RegionCardinality.CELLS,
  RegionCardinality.FULL_ROWS,
  RegionCardinality.FULL_COLUMNS,
];

/* --------------------------------------------------------- shared pieces */

function renderLithology(value: UnitLong["lith"]): string {
  if (value == null) return "";
  return value
    .map((d) => {
      let text = d.name;
      if (d.prop != null) text += ` (${Math.round(d.prop * 100)}%)`;
      return text;
    })
    .join("; ");
}

function renderNames(value: { name: string }[] | null | undefined): string {
  if (value == null) return "";
  return value.map((d) => d.name).join("; ");
}

/**
 * A `ColumnSpec.validate` that reports the transaction's issues for this cell.
 *
 * The issues are a property of the whole edited column — a unit overlaps
 * *another* unit — so they can't be worked out from the one value a validator
 * is handed. They are computed once in `unitIssuesAtom` and read here through
 * a ref, which keeps the column spec's identity stable: rebuilding the spec on
 * every keystroke would re-initialize the sheet's provider.
 */
function useUnitIssueValidator() {
  const issues = useAtomValue(unitIssuesAtom);
  const ref = useRef(issues);
  ref.current = issues;
  return useCallback(
    (field: string) => (_value: any, row: any) =>
      issueForCell(ref.current, row?.unit_id, field),
    []
  );
}

/** The properties every one of these sheets shares. */
function sheetProps(name: string, itemLabel: string) {
  return {
    name,
    itemLabel,
    editable: true,
    enableColumnReordering: false,
    density: DataSheetDensity.MEDIUM,
    selectionModes: SELECTION_MODES,
  };
}

const unitIdentity = (row: UnitLong) => row?.unit_id;
const surfaceIdentity = (row: EditorSurface) => row?.id;

/* ------------------------------------------------------------------- units */

/** Non-boundary columns the units sheet lets through. `b_pos`, `t_pos`,
 * `b_age` and `t_age` are editable too, but as *boundaries* — see
 * `./state/editing`. */
const EDITABLE_UNIT_FIELDS = new Set([
  "unit_name",
  "min_thick",
  "max_thick",
  "notes",
]);
const NUMERIC_UNIT_FIELDS = new Set(["min_thick", "max_thick"]);

function useUnitColumnSpec(): ColumnSpec[] {
  const validator = useUnitIssueValidator();
  return useMemo(
    () => [
      { key: "unit_id", name: "ID", dataType: "integer", width: 70 },
      { key: "section_id", name: "Section", dataType: "integer", width: 80 },
      { key: "unit_name", name: "Unit name", dataType: "string", width: 200 },
      {
        key: "strat_name_long",
        name: "Strat. name",
        dataType: "string",
        width: 180,
      },
      {
        key: "b_pos",
        name: "b_pos",
        dataType: "number",
        width: 70,
        validate: validator("b_pos"),
      },
      {
        key: "t_pos",
        name: "t_pos",
        dataType: "number",
        width: 70,
        validate: validator("t_pos"),
      },
      { key: "b_int_name", name: "b_int", dataType: "string", width: 120 },
      {
        key: "b_age",
        name: "b_age (Ma)",
        dataType: "number",
        width: 100,
        validate: combineValidators(validateAge, validator("b_age")),
      },
      { key: "t_int_name", name: "t_int", dataType: "string", width: 120 },
      {
        key: "t_age",
        name: "t_age (Ma)",
        dataType: "number",
        width: 100,
        validate: combineValidators(validateAge, validator("t_age")),
      },
      {
        key: "lith",
        name: "Lithology",
        dataType: "array",
        width: 220,
        valueRenderer: renderLithology,
      },
      {
        key: "environ",
        name: "Environment",
        dataType: "array",
        width: 160,
        valueRenderer: renderNames,
      },
      {
        key: "min_thick",
        name: "Min. thickness",
        dataType: "number",
        width: 90,
      },
      {
        key: "max_thick",
        name: "Max. thickness",
        dataType: "number",
        width: 90,
      },
      { key: "notes", name: "Notes", dataType: "text", width: 240 },
    ],
    [validator]
  );
}

export function UnitsSheet() {
  return h(
    "div.editor-sheet.units-sheet",
    h(UnitBackedSheet, {
      columnSpec: useUnitColumnSpec(),
      name: "Units",
      editableFields: EDITABLE_UNIT_FIELDS,
      numericFields: NUMERIC_UNIT_FIELDS,
    })
  );
}

/* ----------------------------------------------------------------- unified */

const EDITABLE_UNIFIED_FIELDS = new Set([
  "unit_name",
  "strat_name_long",
  "notes",
  "min_thick",
  "max_thick",
]);
const NUMERIC_UNIFIED_FIELDS = new Set(["min_thick", "max_thick"]);

/** The ingestion format's `units` sheet, in its own vocabulary: position,
 * then chronostratigraphic position, then the descriptors. Header names are
 * the format's field names so a row reads the same here and in the template
 * (`b_int` is the API's `b_int_name`, and so on). */
function useUnifiedColumnSpec(): ColumnSpec[] {
  const validator = useUnitIssueValidator();
  return useMemo(
    () => [
      { key: "unit_id", name: "unit_id", dataType: "integer", width: 70 },
      { key: "section_id", name: "section_id", dataType: "integer", width: 80 },
      {
        key: "b_pos",
        name: "b_pos",
        dataType: "number",
        width: 80,
        validate: validator("b_pos"),
      },
      {
        key: "t_pos",
        name: "t_pos",
        dataType: "number",
        width: 80,
        validate: validator("t_pos"),
      },
      { key: "b_int_name", name: "b_int", dataType: "string", width: 130 },
      {
        key: "b_prop",
        name: "b_prop",
        dataType: "number",
        width: 80,
        validate: validateProportion,
      },
      { key: "t_int_name", name: "t_int", dataType: "string", width: 130 },
      {
        key: "t_prop",
        name: "t_prop",
        dataType: "number",
        width: 80,
        validate: validateProportion,
      },
      { key: "unit_name", name: "unit_name", dataType: "string", width: 200 },
      {
        key: "strat_name_long",
        name: "strat_name",
        dataType: "string",
        width: 180,
      },
      {
        key: "lith",
        name: "lithology",
        dataType: "array",
        width: 220,
        valueRenderer: renderLithology,
      },
      {
        key: "environ",
        name: "environment",
        dataType: "array",
        width: 160,
        valueRenderer: renderNames,
      },
      {
        key: "min_thick",
        name: "min_thickness",
        dataType: "number",
        width: 100,
      },
      {
        key: "max_thick",
        name: "max_thickness",
        dataType: "number",
        width: 100,
      },
      { key: "notes", name: "unit_description", dataType: "text", width: 240 },
    ],
    [validator]
  );
}

export function UnifiedSheet() {
  return h(
    "div.editor-sheet.unified-sheet",
    h(UnitBackedSheet, {
      columnSpec: useUnifiedColumnSpec(),
      name: "Units and surfaces",
      editableFields: EDITABLE_UNIFIED_FIELDS,
      numericFields: NUMERIC_UNIFIED_FIELDS,
    })
  );
}

/** Units and unified differ only in which columns they show and which plain
 * fields they let through; the data, the overlay and the edit path are one. */
function UnitBackedSheet({
  columnSpec,
  name,
  editableFields,
  numericFields,
}: {
  columnSpec: ColumnSpec[];
  name: string;
  editableFields: Set<string>;
  numericFields: Set<string>;
}) {
  const data = useAtomValue(baseUnitsAtom);
  const updatedData = useAtomValue(unitOverlayAtom);
  const editCells = useSetAtom(editUnitCellsAtom);
  const intervals = useIntervalDefs();

  const onEdit = useCallback(
    (event: EditEvent<UnitLong>) => {
      editCells({ event, intervals, editableFields, numericFields });
    },
    [editCells, intervals, editableFields, numericFields]
  );

  return h(
    DataSheet<UnitLong>,
    {
      ...sheetProps(name, "unit"),
      data,
      updatedData,
      columnSpec,
      identity: unitIdentity,
      onEdit,
    },
    h(UnitSelectionBridge)
  );
}

/* ---------------------------------------------------------------- surfaces */

/** The surfaces table. On an age column the editable coordinate is the
 * surface's age; on a measured one it is its position, and the modeled age
 * comes along read-only — a measured position and the age model that
 * calibrates it are separate records, so moving one doesn't move the other. */
function surfaceColumnSpec(isPositionAxis: boolean): ColumnSpec[] {
  const ageColumn: ColumnSpec = {
    key: "age",
    name: "Age (Ma)",
    dataType: "number",
    width: 110,
    validate: validateAge,
  };
  const positionColumn: ColumnSpec = {
    key: "position",
    name: "Position (m)",
    dataType: "number",
    width: 110,
  };
  const coordinate = isPositionAxis
    ? [positionColumn, { ...ageColumn, name: "Model age (Ma)" }]
    : [ageColumn];

  return [
    ...coordinate,
    {
      key: "status",
      name: "Status",
      dataType: "string",
      width: 100,
      valueRenderer: (d) => surfaceStatusLabels[d] ?? d,
    },
    { key: "type", name: "Contact", dataType: "string", width: 110 },
    {
      key: "calibration",
      name: "Calibration",
      dataType: "object",
      width: 160,
      valueRenderer: (d) => d?.name ?? "",
    },
    {
      key: "proportion",
      name: "Position in interval",
      dataType: "number",
      width: 120,
      valueRenderer: (d) => formatProportion(d) ?? "",
    },
    {
      key: "unitsAbove",
      name: "Units above",
      dataType: "array",
      width: 200,
      valueRenderer: renderUnitNames,
    },
    {
      key: "unitsBelow",
      name: "Units below",
      dataType: "array",
      width: 200,
      valueRenderer: renderUnitNames,
    },
    {
      key: "boundary",
      name: "Boundary",
      dataType: "object",
      width: 90,
      valueRenderer: (d) => d?.boundary_id ?? "",
    },
  ];
}

/** Unit ids resolved to names, through a row-render context we don't have: the
 * spec is static, so the renderer reads a module-level map kept current by
 * `SurfacesSheet`. */
let unitNameLookup = new Map<number, string>();
function renderUnitNames(ids: number[] | null | undefined): string {
  if (ids == null) return "";
  return ids.map((id) => unitNameLookup.get(id) ?? `#${id}`).join("; ");
}

export function SurfacesSheet() {
  const surfaces = useAtomValue(surfacesAtom);
  const updatedData = useAtomValue(surfaceOverlayAtom);
  const units = useAtomValue(baseUnitsAtom);
  const editCells = useSetAtom(editSurfaceCellsAtom);
  const { isPositionAxis } = useAtomValue(columnScaleOptionsAtom);

  unitNameLookup = useMemo(
    () => new Map(units.map((u) => [u.unit_id, u.unit_name])),
    [units]
  );

  const columnSpec = useMemo(
    () => surfaceColumnSpec(isPositionAxis),
    [isPositionAxis]
  );

  // Which column moves the surface follows the axis in force, so the same
  // sheet edits ages on an age column and positions on a measured one.
  const coordinateKey = isPositionAxis ? "position" : "age";

  const onEdit = useCallback(
    (event: EditEvent<EditorSurface>) => {
      editCells({ event, coordinateKey });
    },
    [editCells, coordinateKey]
  );

  return h(
    "div.editor-sheet.surfaces-sheet",
    h(
      DataSheet<EditorSurface>,
      {
        ...sheetProps("Surfaces", "surface"),
        // The rows are the *edited* surfaces: a surface an edit split or
        // merged is simply gone or new, which no cell overlay could express.
        data: surfaces,
        updatedData,
        columnSpec,
        identity: surfaceIdentity,
        onEdit,
      },
      h(SurfaceSelectionBridge)
    )
  );
}

/* ---------------------------------------------------------------- selection */

/** The sheet's row selection is the editor's selected unit, both ways. */
function UnitSelectionBridge() {
  const selectedUnitID = useAtomValue(selectedUnitIDAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  useSheetSelectionBridge<UnitLong>(
    (row) => row.unit_id,
    selectedUnitID,
    setSelectedUnitID
  );
  return null;
}

function SurfaceSelectionBridge() {
  const selectedID = useAtomValue(selectedSurfaceIDAtom);
  const setSelectedID = useSetAtom(selectedSurfaceIDAtom);
  useSheetSelectionBridge<EditorSurface>(
    (row) => row.id,
    selectedID,
    setSelectedID
  );
  return null;
}

/** Keep the sheet's selected row and the page's selection atom on the same
 * record, in both directions. Must be rendered inside the sheet, where its
 * store is in scope.
 *
 * Both directions matter: picking a row in the table inspects that unit or
 * surface, and picking one in the column — a unit box, a surface line, a
 * label tag — scrolls the table to its row. The two effects can't chase each
 * other, because each checks whether the other side already holds the record
 * before writing.
 *
 * The sheet indexes rows by position in the *filtered* view, so both
 * directions go through `filteredRowIndices` to reach the underlying row. */
function useSheetSelectionBridge<T>(
  identity: (row: T) => string | number,
  selectedID: string | number | null,
  setSelectedID: (id: any) => void
) {
  const store = useStoreAPI<T>();
  const selection = useSelector((state) => state.selection);
  const data = useSelector((state) => state.data) as T[] | undefined;
  const filteredRowIndices = useSelector(
    (state) => state.filteredRowIndices
  ) as number[] | null | undefined;

  /** The record the sheet is showing as selected, if any. */
  function selectedRow(): T | null {
    const viewIndex = selection?.[0]?.rows?.[0];
    if (viewIndex == null || data == null) return null;
    const baseIndex = filteredRowIndices?.[viewIndex] ?? viewIndex;
    return data[baseIndex] ?? null;
  }

  // Sheet → page
  useEffect(() => {
    const row = selectedRow();
    if (row == null) return;
    const id = identity(row);
    if (id !== selectedID) setSelectedID(id);
  }, [selection]);

  // Page → sheet
  useEffect(() => {
    if (selectedID == null || data == null) return;
    const shown = selectedRow();
    if (shown != null && identity(shown) === selectedID) return;

    const baseIndex = data.findIndex((row) => identity(row) === selectedID);
    if (baseIndex === -1) return;
    let viewIndex = baseIndex;
    if (filteredRowIndices != null) {
      viewIndex = filteredRowIndices.indexOf(baseIndex);
      // Filtered out of the view: there is no row to select.
      if (viewIndex === -1) return;
    }

    const { setSelection, scrollToRow } = store.getState();
    setSelection([{ rows: [viewIndex, viewIndex] } as any]);
    scrollToRow?.(viewIndex);
  }, [selectedID, data, filteredRowIndices]);
}

/** Run several validators in order, first complaint wins. */
function combineValidators(...validators: any[]) {
  return (value: any, row: any, ctx: any) => {
    for (const validate of validators) {
      const result = validate(value, row, ctx);
      if (result != null) return result;
    }
    return null;
  };
}
