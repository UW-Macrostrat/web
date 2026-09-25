/** The three tables — views only.
 *
 * - **Units** — the guided view: a unit's attributes, positions on a measured
 *   column, lithology and environment through pickers. The age correlation
 *   isn't edited here; that is what the surfaces and unified tables are for.
 * - **Unified** — the [[column-ingestion]] `units` sheet, in that format's own
 *   vocabulary and with its spreadsheet semantics: every field, including the
 *   chronostratigraphic ones, on one row per unit.
 * - **Surfaces** — the age model, one row per surface.
 *
 * Each is a `DataSheet` over the **loaded** rows with the editor's transaction
 * passed in as its overlay, so the edited cells go green, `resetChanges`
 * empties the transaction, and every sheet shows the same edits however they
 * were made. What an edit *means* is in `./state/editing`; what counts as
 * valid is in `./validation`. This file says what the tables look like — and
 * what each value *is*, through the column spec's roles:
 *
 * - a **locked** column (`editable: false`) is an identifier the editor never
 *   writes; **identifiers** are `hidden` unless asked for;
 * - a **derived** column is computed from the record — the ages, which follow
 *   from an interval and a proportion or from a measured position through the
 *   age model — drawn dimmed, and hidden unless asked for;
 * - a **modeled** age is an interpolation rather than a tie point, and is
 *   dimmed too;
 * - a **filled** attribute restates the neighbouring unit's, which the
 *   ingestion sheet would leave blank, and is drawn behind an arrow.
 *
 * Lithology, environment and the boundary intervals are entered through the
 * pickers of `@macrostrat/data-components`, as the columns' cell surfaces
 * (`./cell-surfaces`), so a value is picked from the vocabulary rather than
 * typed.
 */
import hyper from "@macrostrat/hyper";
import { RegionCardinality } from "@blueprintjs/table";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UnitLong } from "@macrostrat/api-types";
import {
  type CellRenderContext,
  type CellValidation,
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
  baseSurfaceIndexAtom,
  baseUnitsAtom,
  editedUnitsAtom,
  columnScaleOptionsAtom,
  editModeAtom,
  editSurfaceCellsAtom,
  editUnitCellsAtom,
  filledRestatementsAtom,
  isModeledStatus,
  positionAxisAtom,
  selectedSurfaceIDAtom,
  selectedUnitIDAtom,
  showAgesAtom,
  showIdentifiersAtom,
  surfaceOverlayFor,
  surfacesAtom,
  unitBoundaryStatusAtom,
  unitEditsAtom,
  unitIssuesAtom,
  unitOverlayFor,
  useIntervalDefs,
} from "./state";
import {
  issueForCell,
  validateAge,
  validateIntervalName,
  validateProportion,
} from "./validation";
import {
  FocusFilterBridge,
  useFocusActions,
  type FocusActions,
} from "./sheet-focus";
import { fillDirection, restatementKey } from "./filling";
import { filledValue, formatAge, modeledValue } from "./render";
import {
  EnvironmentCellDetail,
  LithologyCellDetail,
  intervalCellDetail,
  renderBoundaryPosition,
  renderEnvironmentTags,
  renderLithologyTags,
} from "./cell-surfaces";
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

/** An interval name must resolve to a definition. The definitions arrive
 * after the sheet mounts, so they are read through a ref for the same reason
 * as the issues. */
function useIntervalNameValidator() {
  const intervals = useIntervalDefs();
  const ref = useRef(intervals);
  ref.current = intervals;
  return useCallback(
    (value: any) => validateIntervalName(ref.current)(value),
    []
  );
}

type CellPredicate = (ctx: CellRenderContext | undefined) => boolean;
type FillPredicate = (
  ctx: CellRenderContext | undefined
) => "up" | "down" | null;

interface Presentation {
  /** Whether a unit's top or base age is an interpolation of the age model. */
  isModeled: (side: "top" | "bottom") => CellPredicate;
  /** Whether a unit's attribute restates the neighbouring unit's. */
  isRestated: (field: string) => FillPredicate;
}

/** What the sheets need to know to draw a value as a record, a modeled age
 * or a restatement — through refs, so the specs keep their identity as the
 * transaction changes under them. */
function usePresentation(): Presentation {
  const statuses = useAtomValue(unitBoundaryStatusAtom);
  const restatements = useAtomValue(filledRestatementsAtom);
  const direction = fillDirection(useAtomValue(positionAxisAtom));
  const ref = useRef({ statuses, restatements, direction });
  ref.current = { statuses, restatements, direction };

  return useMemo(
    () => ({
      isModeled: (side) => (ctx) => {
        const unit_id = ctx?.row?.unit_id;
        if (unit_id == null) return false;
        return isModeledStatus(ref.current.statuses.get(unit_id)?.[side]);
      },
      isRestated: (field) => (ctx) => {
        const unit_id = ctx?.row?.unit_id;
        if (unit_id == null) return null;
        if (!ref.current.restatements.has(restatementKey(unit_id, field))) {
          return null;
        }
        return ref.current.direction;
      },
    }),
    []
  );
}

/** Which optional columns are showing, and whether the column is measured.
 * Changing one rebuilds the spec, which is right: the table's shape changed. */
interface ColumnVisibility {
  identifiers: boolean;
  ages: boolean;
  measured: boolean;
}

function useColumnVisibility(): ColumnVisibility {
  const identifiers = useAtomValue(showIdentifiersAtom);
  const ages = useAtomValue(showAgesAtom);
  const measured = useAtomValue(positionAxisAtom) != null;
  return useMemo(
    () => ({ identifiers, ages, measured }),
    [identifiers, ages, measured]
  );
}

/** The properties every one of these sheets shares. The selection feeds the
 * details pane's row editor, so a click selects a cell and a second click
 * opens its surface, rather than a popover opening over the grid on every
 * selection. */
function sheetProps(name: string, itemLabel: string, editable: boolean) {
  return {
    name,
    itemLabel,
    editable,
    enableColumnReordering: false,
    density: DataSheetDensity.MEDIUM,
    selectionModes: SELECTION_MODES,
    cellInteraction: "second-click" as const,
  };
}

const unitIdentity = (row: UnitLong) => row?.unit_id;
const surfaceIdentity = (row: EditorSurface) => row?.id;

/* ------------------------------------------------------------------- units */

/** What the unit-backed sheets are built from. */
interface UnitSheetInputs {
  focus: FocusActions;
  validator: (field: string) => ColumnSpec["validate"];
  intervalValidator: (value: any) => CellValidation | null;
  presentation: Presentation;
  show: ColumnVisibility;
}

function useUnitSheetInputs(focus: FocusActions): UnitSheetInputs {
  const validator = useUnitIssueValidator();
  const intervalValidator = useIntervalNameValidator();
  const presentation = usePresentation();
  const show = useColumnVisibility();
  return useMemo(
    () => ({ focus, validator, intervalValidator, presentation, show }),
    [focus, validator, intervalValidator, presentation, show]
  );
}

/** The identifiers: what a row *is*, never written, shown on request. */
function identifierColumns(
  names: { unit_id: string; section_id: string },
  { focus, show }: UnitSheetInputs
): ColumnSpec[] {
  return [
    {
      key: "unit_id",
      name: names.unit_id,
      dataType: "integer",
      width: 70,
      editable: false,
      hidden: !show.identifiers,
    },
    {
      key: "section_id",
      name: names.section_id,
      dataType: "integer",
      width: 80,
      editable: false,
      hidden: !show.identifiers,
      actions: [focus.sectionAction],
    },
  ];
}

/** The measured positions: the record on a measured column, and shown only
 * there — on a composite column they are at most an ordination. */
function positionColumns(
  { validator, show }: UnitSheetInputs,
  width = 80
): ColumnSpec[] {
  return [
    {
      key: "b_pos",
      name: "b_pos",
      dataType: "number",
      width,
      hidden: !show.measured,
      validate: validator("b_pos"),
    },
    {
      key: "t_pos",
      name: "t_pos",
      dataType: "number",
      width,
      hidden: !show.measured,
      validate: validator("t_pos"),
    },
  ];
}

/** The absolute ages: derived from the calibration through the age model,
 * dimmed further when the age model interpolated them, and hidden unless
 * asked for. */
function ageColumns(
  names: { b_age: string; t_age: string },
  { validator, presentation, show }: UnitSheetInputs
): ColumnSpec[] {
  return [
    {
      key: "b_age",
      name: names.b_age,
      dataType: "number",
      width: 100,
      derived: true,
      hidden: !show.ages,
      valueRenderer: modeledValue(formatAge, presentation.isModeled("bottom")),
      validate: combineValidators(validateAge, validator("b_age")),
    },
    {
      key: "t_age",
      name: names.t_age,
      dataType: "number",
      width: 100,
      derived: true,
      hidden: !show.ages,
      valueRenderer: modeledValue(formatAge, presentation.isModeled("top")),
      validate: combineValidators(validateAge, validator("t_age")),
    },
  ];
}

/** The chronostratigraphic position of each boundary, in the ingestion
 * format's terms: an interval (picked, and checked against the definitions)
 * and a proportion within it. The interval cell shows the interval's tag with
 * the position in it; its surface is the interval editor, which writes both
 * fields and the age they imply. */
function chronoColumns({
  validator,
  intervalValidator,
}: UnitSheetInputs): ColumnSpec[] {
  return [
    {
      key: "b_int_name",
      name: "b_int",
      cellLabel: "base interval",
      dataType: "string",
      width: 170,
      detailPlacement: "bottom-start",
      valueRenderer: renderBoundaryPosition("bottom"),
      cellDetail: intervalCellDetail("bottom"),
      validate: intervalValidator,
    },
    {
      key: "b_prop",
      name: "b_prop",
      dataType: "number",
      width: 80,
      valueRenderer: (d) => formatProportion(d) ?? "",
      validate: combineValidators(validateProportion, validator("b_prop")),
    },
    {
      key: "t_int_name",
      name: "t_int",
      cellLabel: "top interval",
      dataType: "string",
      width: 170,
      detailPlacement: "bottom-start",
      valueRenderer: renderBoundaryPosition("top"),
      cellDetail: intervalCellDetail("top"),
      validate: intervalValidator,
    },
    {
      key: "t_prop",
      name: "t_prop",
      dataType: "number",
      width: 80,
      valueRenderer: (d) => formatProportion(d) ?? "",
      validate: combineValidators(validateProportion, validator("t_prop")),
    },
  ];
}

/** The unit attributes both unit-backed sheets carry, differing only in what
 * they are called: the ingestion format's field names in the unified sheet,
 * readable titles in the units sheet.
 *
 * Lithology and environment are arrays of resolved definitions. They are
 * shown as tags and edited through pickers over the definitions — over
 * several rows at once, when several are selected — and a value that
 * restates the unit before it is drawn as a fill. */
type AttributeLabels = Record<
  | "unit_name"
  | "strat_name"
  | "lithology"
  | "environment"
  | "min_thickness"
  | "max_thickness"
  | "description",
  string
>;

function attributeColumns(
  names: AttributeLabels,
  { presentation }: UnitSheetInputs
): Record<keyof AttributeLabels, ColumnSpec> {
  return {
    unit_name: {
      key: "unit_name",
      name: names.unit_name,
      dataType: "string",
      width: 200,
    },
    strat_name: {
      key: "strat_name_long",
      name: names.strat_name,
      dataType: "string",
      width: 180,
      valueRenderer: filledValue(
        (d) => d,
        presentation.isRestated("strat_name_long")
      ),
    },
    lithology: {
      key: "lith",
      name: names.lithology,
      cellLabel: "lithology",
      dataType: "array",
      width: 260,
      multiCell: true,
      detailPlacement: "bottom-start",
      cellDetail: LithologyCellDetail,
      valueRenderer: filledValue(
        renderLithologyTags,
        presentation.isRestated("lith")
      ),
    },
    environment: {
      key: "environ",
      name: names.environment,
      cellLabel: "environment",
      dataType: "array",
      width: 200,
      multiCell: true,
      detailPlacement: "bottom-start",
      cellDetail: EnvironmentCellDetail,
      valueRenderer: filledValue(
        renderEnvironmentTags,
        presentation.isRestated("environ")
      ),
    },
    min_thickness: {
      key: "min_thick",
      name: names.min_thickness,
      dataType: "number",
      width: 100,
    },
    max_thickness: {
      key: "max_thick",
      name: names.max_thickness,
      dataType: "number",
      width: 100,
    },
    description: {
      key: "notes",
      name: names.description,
      dataType: "text",
      width: 240,
    },
  };
}

/** The guided view's columns. Exported for the details pane's row editor,
 * which shows a unit through the same spec. */
export function unitSheetColumns(inputs: UnitSheetInputs): ColumnSpec[] {
  const attrs = attributeColumns(
    {
      unit_name: "Unit name",
      strat_name: "Strat. name",
      lithology: "Lithology",
      environment: "Environment",
      min_thickness: "Min. thickness",
      max_thickness: "Max. thickness",
      description: "Notes",
    },
    inputs
  );
  return [
    ...identifierColumns({ unit_id: "ID", section_id: "Section" }, inputs),
    attrs.unit_name,
    attrs.strat_name,
    ...positionColumns(inputs, 70),
    ...ageColumns({ b_age: "Base age (Ma)", t_age: "Top age (Ma)" }, inputs),
    attrs.lithology,
    attrs.environment,
    attrs.min_thickness,
    attrs.max_thickness,
    attrs.description,
  ];
}

export function useUnitSheetColumns(): ColumnSpec[] {
  const inputs = useUnitSheetInputs(useUnitFocusActions());
  return useMemo(() => unitSheetColumns(inputs), [inputs]);
}

export function UnitsSheet() {
  const columnSpec = useUnitSheetColumns();
  return h(
    "div.editor-sheet.units-sheet",
    h(UnitBackedSheet, { columnSpec, name: "Units" })
  );
}

/* ----------------------------------------------------------------- unified */

/** The ingestion format's `units` sheet, in its own vocabulary: position,
 * then chronostratigraphic position, then the descriptors. Header names are
 * the format's field names so a row reads the same here and in the template
 * (`b_int` is the API's `b_int_name`, and so on). The ages aren't part of
 * the format — they follow from it — so they sit after the record they
 * follow from, shown on request. */
function unifiedSheetColumns(inputs: UnitSheetInputs): ColumnSpec[] {
  const attrs = attributeColumns(
    {
      unit_name: "unit_name",
      strat_name: "strat_name",
      lithology: "lithology",
      environment: "environment",
      min_thickness: "min_thickness",
      max_thickness: "max_thickness",
      description: "unit_description",
    },
    inputs
  );
  return [
    ...identifierColumns(
      { unit_id: "unit_id", section_id: "section_id" },
      inputs
    ),
    ...positionColumns(inputs),
    ...chronoColumns(inputs),
    ...ageColumns({ b_age: "b_age", t_age: "t_age" }, inputs),
    attrs.unit_name,
    attrs.strat_name,
    attrs.lithology,
    attrs.environment,
    attrs.min_thickness,
    attrs.max_thickness,
    attrs.description,
  ];
}

export function UnifiedSheet() {
  const inputs = useUnitSheetInputs(useUnitFocusActions());
  const columnSpec = useMemo(() => unifiedSheetColumns(inputs), [inputs]);
  return h(
    "div.editor-sheet.unified-sheet",
    h(UnitBackedSheet, { columnSpec, name: "Units and surfaces" })
  );
}

/** The focus actions for a sheet whose rows are units. A selected row comes
 * back as the *loaded* unit, so it is resolved to its edited counterpart by
 * `unit_id` before its age range is read. */
function useUnitFocusActions() {
  const units = useAtomValue(editedUnitsAtom);
  const byID = useMemo(
    () => new Map(units.map((u) => [u.unit_id, u])),
    [units]
  );
  const resolve = useCallback(
    (row: any) => byID.get(row?.unit_id) ?? row ?? null,
    [byID]
  );
  return useFocusActions(units, resolve);
}

/** Units and unified differ only in which columns they show; the data, the
 * overlay and the edit path are one, and the spec says what may be written. */
function UnitBackedSheet({
  columnSpec,
  name,
}: {
  columnSpec: ColumnSpec[];
  name: string;
}) {
  const data = useAtomValue(baseUnitsAtom);
  const edits = useAtomValue(unitEditsAtom);
  const editable = useAtomValue(editModeAtom);
  const editCells = useSetAtom(editUnitCellsAtom);
  const intervals = useIntervalDefs();
  const focus = useUnitFocusActions();

  // `deriveOverlay` rather than a plain `updatedData` prop: the sheet hands it
  // the rows it is currently holding, which is the only way to stay aligned
  // once a filter has narrowed them (see `unitOverlayFor`).
  const deriveOverlay = useCallback(
    (rows: UnitLong[]) => ({
      updatedData: unitOverlayFor(edits, rows),
      rowStatus: [],
    }),
    [edits]
  );

  const onEdit = useCallback(
    (event: EditEvent<UnitLong>) => {
      editCells({ event, intervals, columnSpec });
    },
    [editCells, intervals, columnSpec]
  );

  return h(
    DataSheet<UnitLong>,
    {
      ...sheetProps(name, "unit", editable),
      data,
      columnSpec,
      identity: unitIdentity,
      actions: [focus.rowAction],
      deriveOverlay,
      onEdit,
    },
    [
      h(UnitSelectionBridge, { key: "selection" }),
      h(FocusFilterBridge, { key: "focus" }),
    ]
  );
}

/* ---------------------------------------------------------------- surfaces */

/** The surfaces table. On an age column the editable coordinate is the
 * surface's position in its calibration interval, and the age follows; on a
 * measured one it is its position, and the modeled age comes along read-only
 * — a measured position and the age model that calibrates it are separate
 * records, so moving one doesn't move the other. */
function surfaceColumns(
  isPositionAxis: boolean,
  focus: FocusActions,
  show: ColumnVisibility
): ColumnSpec[] {
  // A `modeled` surface's age is an interpolation between the tie points
  // around it; the status is the row's own, so the predicate reads it there.
  const isModeledSurface: CellPredicate = (ctx) =>
    isModeledStatus(ctx?.row?.status);

  const ageColumn: ColumnSpec = {
    key: "age",
    name: "Age (Ma)",
    dataType: "number",
    width: 110,
    derived: true,
    valueRenderer: modeledValue(formatAge, isModeledSurface),
    validate: validateAge,
  };
  const positionColumn: ColumnSpec = {
    key: "position",
    name: "Position (m)",
    dataType: "number",
    width: 110,
  };
  let coordinate = [ageColumn];
  if (isPositionAxis) {
    coordinate = [positionColumn, { ...ageColumn, name: "Model age (Ma)" }];
  }

  return [
    ...coordinate,
    {
      key: "status",
      name: "Status",
      dataType: "string",
      width: 100,
      editable: false,
      valueRenderer: (d) => surfaceStatusLabels[d] ?? d,
    },
    { key: "type", name: "Contact", dataType: "string", width: 110 },
    {
      key: "calibration",
      name: "Calibration",
      dataType: "object",
      width: 160,
      editable: false,
      valueRenderer: (d) => d?.name ?? "",
    },
    {
      // On an age column this is the editable coordinate: a surface sits at a
      // proportion of its calibration interval, and its age follows.
      key: "proportion",
      name: "Position in interval",
      dataType: "number",
      width: 120,
      editable: !isPositionAxis,
      validate: validateProportion,
      valueRenderer: (d) => formatProportion(d) ?? "",
    },
    {
      key: "section_id",
      name: "Section",
      dataType: "integer",
      width: 80,
      editable: false,
      hidden: !show.identifiers,
      actions: [focus.sectionAction],
    },
    {
      key: "unitsAbove",
      name: "Units above",
      dataType: "array",
      width: 200,
      editable: false,
      valueRenderer: renderUnitNames,
    },
    {
      key: "unitsBelow",
      name: "Units below",
      dataType: "array",
      width: 200,
      editable: false,
      valueRenderer: renderUnitNames,
    },
    {
      key: "boundary",
      name: "Boundary",
      dataType: "object",
      width: 90,
      editable: false,
      hidden: !show.identifiers,
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
  const focus = useFocusActions(surfaces);
  const baseSurfaces = useAtomValue(baseSurfaceIndexAtom);
  const units = useAtomValue(baseUnitsAtom);
  const editable = useAtomValue(editModeAtom);
  const editCells = useSetAtom(editSurfaceCellsAtom);
  const { isPositionAxis } = useAtomValue(columnScaleOptionsAtom);
  const show = useColumnVisibility();

  unitNameLookup = useMemo(
    () => new Map(units.map((u) => [u.unit_id, u.unit_name])),
    [units]
  );

  const columnSpec = useMemo(
    () => surfaceColumns(isPositionAxis, focus, show),
    [isPositionAxis, focus, show]
  );

  // Which column moves the surface follows the axis in force, so the same
  // sheet edits ages on an age column and positions on a measured one.
  const coordinateKey = isPositionAxis ? "position" : "proportion";

  const onEdit = useCallback(
    (event: EditEvent<EditorSurface>) => {
      editCells({ event, coordinateKey });
    },
    [editCells, coordinateKey]
  );

  const deriveOverlay = useCallback(
    (rows: EditorSurface[]) => ({
      updatedData: surfaceOverlayFor(baseSurfaces, rows),
      rowStatus: [],
    }),
    [baseSurfaces]
  );

  return h(
    "div.editor-sheet.surfaces-sheet",
    h(
      DataSheet<EditorSurface>,
      {
        ...sheetProps("Surfaces", "surface", editable),
        // The rows are the *edited* surfaces: a surface an edit split or
        // merged is simply gone or new, which no cell overlay could express.
        data: surfaces,
        columnSpec,
        identity: surfaceIdentity,
        actions: [focus.rowAction],
        deriveOverlay,
        onEdit,
      },
      [
        h(SurfaceSelectionBridge, { key: "selection" }),
        h(FocusFilterBridge, { key: "focus" }),
      ]
    )
  );
}

/* ---------------------------------------------------------------- selection */

/** The sheet's row selection is the editor's selected unit, both ways. */
function UnitSelectionBridge() {
  const selectedUnitID = useAtomValue(selectedUnitIDAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  useSheetSelectionBridge<UnitLong>(
    unitIdentity,
    selectedUnitID,
    setSelectedUnitID
  );
  return null;
}

function SurfaceSelectionBridge() {
  const selectedID = useAtomValue(selectedSurfaceIDAtom);
  const setSelectedID = useSetAtom(selectedSurfaceIDAtom);
  useSheetSelectionBridge<EditorSurface>(
    surfaceIdentity,
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
  identity: (row: T | null | undefined) => string | number | null | undefined,
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
    if (id == null || id === selectedID) return;
    setSelectedID(id);
  }, [selection]);

  // Page → sheet
  useEffect(() => {
    if (selectedID == null || data == null) return;
    const shown = selectedRow();
    if (shown != null && identity(shown) === selectedID) return;

    // `data` is not dense: a row can be missing while a window loads, and for
    // the moment after a mode switch when the incoming sheet's store has been
    // sized but not filled. Reading an id off one of those holes is what used
    // to throw here.
    const baseIndex = data.findIndex(
      (row) => row != null && identity(row) === selectedID
    );
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
