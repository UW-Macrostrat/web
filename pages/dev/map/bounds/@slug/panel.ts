/** The panel: the boundary's summary, its operation list, and the editors.
 *
 * Every edit goes straight to the API and the returned list replaces the
 * page's copy; nothing is staged locally except the polygon being drawn.
 * Edits change the operation list only — the boundary itself changes when it
 * is built, which is a separate, explicit step (preview first). */
import hyper from "@macrostrat/hyper";
import {
  Button,
  ButtonGroup,
  Callout,
  EditableText,
  FormGroup,
  HTMLSelect,
  Icon,
  InputGroup,
  Switch,
  Tag,
} from "@blueprintjs/core";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useState, type DragEvent } from "react";

import { DataCard } from "@macrostrat/data-sheet";
import { useIsAdmin } from "~/_utils/is-admin";
import {
  appendOperation,
  buildBoundary,
  editOperation,
  fetchBoundary,
  removeOperation,
  type BoundaryOperation,
  type OperationType,
} from "./api";
import {
  boundaryAtom,
  buildReportAtom,
  busyAtom,
  draftAtom,
  drawingAtom,
  errorAtom,
  editedGeometryAtom,
  operationTypesAtom,
  reorderingAtom,
  selectedOpIdAtom,
  selectOpAtom,
  showDataAtom,
  tileVersionAtom,
  useBoundaryEdit,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function BoundaryPanel() {
  const boundary = useAtomValue(boundaryAtom);
  if (boundary == null) {
    return h(Callout, { intent: "warning", title: "No boundary" }, [
      "This map has no boundary to edit, or the API could not be reached.",
    ]);
  }
  return h("div.boundary-panel", [
    h(BoundarySummary),
    h(ErrorCallout),
    h(OperationList),
    h(DrawSection),
    h(ParameterSection),
    h(BuildSection),
  ]);
}

/* ---------------------------------------------------------------- summary */

function BoundarySummary() {
  const boundary = useAtomValue(boundaryAtom)!;
  let area = null;
  if (boundary.area_km != null) {
    area = h(Tag, { minimal: true }, `${formatArea(boundary.area_km)} km²`);
  }
  let stale = null;
  if (boundary.needs_build) {
    stale = h(Tag, { intent: "warning", minimal: true }, "Edited since last build");
  }
  let failure = null;
  if (boundary.boundary_error != null) {
    failure = h(Callout, { intent: "danger", title: "Last build failed" }, boundary.boundary_error);
  }
  return h("div.summary", [
    h("h2.map-title", boundary.name ?? boundary.slug),
    h("div.tags", [h(Tag, { minimal: true }, boundary.slug), area, stale]),
    failure,
    h(ShowDataSwitch),
  ]);
}

function ShowDataSwitch() {
  const [showData, setShowData] = useAtom(showDataAtom);
  return h(Switch, {
    className: "show-data",
    label: "Show map data",
    checked: showData,
    onChange: () => setShowData(!showData),
  });
}

function ErrorCallout() {
  const [error, setError] = useAtom(errorAtom);
  if (error == null) return null;
  return h(Callout, { intent: "danger", className: "error" }, [
    error,
    h(Button, { minimal: true, small: true, icon: "cross", onClick: () => setError(null) }),
  ]);
}

/* --------------------------------------------------------- operation list */

function OperationList() {
  const boundary = useAtomValue(boundaryAtom)!;
  const isAdmin = useIsAdmin();
  const ops = boundary.operations;
  const drag = useDragReorder();

  let body: any = h("p.empty", "No operations yet: the boundary is the map's own.");
  if (ops.length > 0) {
    body = h(
      "ol.operations",
      ops.map((op) => h(OperationRow, { key: op.id, op, drag }))
    );
  }
  let toggle = null;
  if (isAdmin && ops.length > 2) toggle = h(ReorderToggle);
  return h("section.operations-section", [
    h("div.section-header", [h("h3", "Operations"), toggle]),
    h("div.operations-scroll", body),
  ]);
}

/** Reorder mode: rows are dragged rather than selected. */
function ReorderToggle() {
  const [reordering, setReordering] = useAtom(reorderingAtom);
  const select = useSetAtom(selectOpAtom);
  const onClick = () => {
    select(null);
    setReordering(!reordering);
  };
  let label = "Reorder";
  if (reordering) label = "Done";
  return h(
    Button,
    { small: true, minimal: !reordering, icon: "drag-handle-vertical", active: reordering, onClick },
    label
  );
}

function OperationRow({ op, drag }: { op: BoundaryOperation; drag: DragReorder }) {
  const isAdmin = useIsAdmin();
  const reordering = useAtomValue(reorderingAtom);
  const selectedId = useAtomValue(selectedOpIdAtom);
  const select = useSetAtom(selectOpAtom);
  const opening = op.position === 0;
  const selected = selectedId === op.id;
  const editable = selected && isAdmin && !opening;

  const onSelect = () => {
    if (reordering) return;
    if (selected) select(null);
    else select(op.id);
  };

  let handle = null;
  if (reordering && !opening) handle = h(Icon, { icon: "drag-handle-vertical", className: "drag-handle" });
  let remove = null;
  if (editable) remove = h(DeleteButton, { op });
  let note = null;
  if (editable) {
    note = h(NoteEditor, { op });
  } else if (op.note) {
    note = h("div.note", op.note);
  }
  let error = null;
  if (op.error) error = h("div.op-error", op.error);
  let reshape = null;
  if (editable) reshape = h(ReshapeControls, { op });

  return h("li.operation-item", { className: dragClasses(op, drag), ...drag.rowProps(op) }, [
    h(
      DataCard,
      { className: "operation-card", selected, selectable: !reordering, onSelect },
      h("div.op-body", [
        h("div.op-header", [
          handle,
          h("span.op-swatch", { className: op.operation }),
          h("span.position", String(op.position)),
          h("span.op-name", op.operation),
          h("span.params", describeParameters(op)),
          remove,
        ]),
        note,
        error,
        reshape,
      ])
    ),
  ]);
}

function dragClasses(op: BoundaryOperation, drag: DragReorder) {
  const classes = [];
  if (drag.dragging === op.id) classes.push("dragging");
  if (drag.over === op.id && drag.dragging !== op.id) classes.push("drop-target");
  return classes.join(" ");
}

/** The note, editable in place; clicks stay out of the card's selection. */
function NoteEditor({ op }: { op: BoundaryOperation }) {
  const edit = useBoundaryEdit();
  const onConfirm = (note: string) => {
    if (note === (op.note ?? "")) return;
    edit((slug) => editOperation(slug, op.id, { note }));
  };
  return h("div.note", { onClick: stopPropagation }, [
    h(EditableText, { defaultValue: op.note ?? "", placeholder: "Add a note…", onConfirm }),
  ]);
}

/** Save or drop the selected polygon's unsaved reshape. */
function ReshapeControls({ op }: { op: BoundaryOperation }) {
  const busy = useAtomValue(busyAtom);
  const geometry = useSelectedGeometry(op);
  if (!geometry.edited) return null;
  return h("div.reshape", { onClick: stopPropagation }, [
    h(Button, { intent: "primary", small: true, disabled: busy, onClick: geometry.save }, "Save shape"),
    h(Button, { small: true, onClick: geometry.revert }, "Revert"),
  ]);
}

function DeleteButton({ op }: { op: BoundaryOperation }) {
  const busy = useAtomValue(busyAtom);
  const edit = useBoundaryEdit();
  const select = useSetAtom(selectOpAtom);
  const onClick = async (evt: React.MouseEvent) => {
    evt.stopPropagation();
    const ok = await edit((slug) => removeOperation(slug, op.id));
    if (ok) select(null);
  };
  return h(Button, {
    icon: "trash",
    small: true,
    minimal: true,
    intent: "danger",
    disabled: busy,
    title: "Delete operation",
    onClick,
  });
}

/** The selected polygon's unsaved reshape, and saving or dropping it. */
function useSelectedGeometry(op: BoundaryOperation) {
  const [edited, setEdited] = useAtom(editedGeometryAtom);
  const edit = useBoundaryEdit();
  const save = async () => {
    if (edited == null) return;
    const ok = await edit((slug) => editOperation(slug, op.id, { geometry: edited }));
    if (ok) setEdited(null);
  };
  return { edited: edited != null, save, revert: () => setEdited(null) };
}

interface DragReorder {
  dragging: number | null;
  over: number | null;
  rowProps: (op: BoundaryOperation) => Record<string, any>;
}

/** Drag a row onto another to take its position. The opening stays put. */
function useDragReorder(): DragReorder {
  const reordering = useAtomValue(reorderingAtom);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const edit = useBoundaryEdit();

  const end = () => {
    setDragging(null);
    setOver(null);
  };
  const rowProps = (op: BoundaryOperation) => {
    if (!reordering || op.position === 0) return {};
    return {
      draggable: true,
      onDragStart: (evt: DragEvent) => {
        // Firefox starts no drag without data
        evt.dataTransfer.setData("text/plain", String(op.id));
        evt.dataTransfer.effectAllowed = "move";
        setDragging(op.id);
      },
      onDragEnd: end,
      onDragOver: (evt: DragEvent) => {
        if (dragging == null) return;
        evt.preventDefault();
        setOver(op.id);
      },
      onDrop: (evt: DragEvent) => {
        evt.preventDefault();
        const id = dragging;
        end();
        if (id == null || id === op.id) return;
        edit((slug) => editOperation(slug, id, { position: op.position }));
      },
    };
  };
  return { dragging, over, rowProps };
}

function stopPropagation(evt: { stopPropagation: () => void }) {
  evt.stopPropagation();
}

/* ---------------------------------------------------------------- drawing */

function DrawSection() {
  const isAdmin = useIsAdmin();
  const [drawing, setDrawing] = useAtom(drawingAtom);
  const draft = useAtomValue(draftAtom);
  const select = useSetAtom(selectOpAtom);
  if (!isAdmin) return null;

  const toggleDrawing = () => {
    if (drawing) {
      setDrawing(false);
      return;
    }
    // A new polygon replaces whatever was selected for editing
    select(null);
    setDrawing(true);
  };
  let body: any = h(
    Button,
    { icon: "draw", active: drawing, onClick: toggleDrawing },
    "Draw a polygon"
  );
  if (drawing) {
    body = [body, h("p.hint", "Click around the area; click the first point to close.")];
  }
  if (draft != null) body = h(DraftActions);
  return h("section", [h("h3", "Draw"), body]);
}

/** Save the drawn polygon as an `add` or a `subtract`, with a note. */
function DraftActions() {
  const [note, setNote] = useState("");
  const setDraft = useSetAtom(draftAtom);
  const draft = useAtomValue(draftAtom);
  const busy = useAtomValue(busyAtom);
  const edit = useBoundaryEdit();

  const save = async (operation: "add" | "subtract") => {
    const ok = await edit((slug) =>
      appendOperation(slug, { operation, geometry: draft, note: note || null })
    );
    if (!ok) return;
    setDraft(null);
    setNote("");
  };

  return h("div.draft", [
    h(InputGroup, {
      placeholder: "Note, e.g. river gap",
      value: note,
      onChange: (e) => setNote(e.target.value),
    }),
    h(ButtonGroup, { fill: true }, [
      h(Button, { intent: "success", disabled: busy, onClick: () => save("add") }, "Add area"),
      h(Button, { intent: "danger", disabled: busy, onClick: () => save("subtract") }, "Subtract area"),
      h(Button, { onClick: () => setDraft(null) }, "Discard"),
    ]),
  ]);
}

/* ---------------------------------------------- parameter-only operations */

function ParameterSection() {
  const isAdmin = useIsAdmin();
  const types = useAtomValue(operationTypesAtom).filter((t) => !t.geometry);
  const form = useParameterForm(types);
  if (!isAdmin || types.length === 0) return null;

  const fields = Object.entries(form.type?.parameters.properties ?? {}).map(
    ([name, schema]) =>
      h(FormGroup, { key: name, label: name, labelInfo: requiredLabel(form.type, name) }, [
        h(InputGroup, {
          value: form.values[name] ?? "",
          placeholder: schema.description ?? "",
          onChange: (e) => form.setValue(name, e.target.value),
        }),
      ])
  );

  return h("section", [
    h("h3", "Parameter operation"),
    h(HTMLSelect, {
      fill: true,
      value: form.opId,
      onChange: (e) => form.setOpId(e.target.value),
      options: types.map((t) => ({ value: t.op_id, label: t.op_id })),
    }),
    h("p.hint", form.type?.description),
    fields,
    h(Button, { icon: "add", disabled: form.busy, onClick: form.submit }, "Append"),
  ]);
}

function useParameterForm(types: OperationType[]) {
  const [opId, setOpIdState] = useState("fill_holes");
  const [values, setValues] = useState<Record<string, string>>({});
  const busy = useAtomValue(busyAtom);
  const edit = useBoundaryEdit();
  const type = types.find((t) => t.op_id === opId) ?? types[0];

  const setOpId = (id: string) => {
    setOpIdState(id);
    setValues({});
  };
  const setValue = (name: string, value: string) => setValues({ ...values, [name]: value });
  const submit = async () => {
    if (type == null) return;
    // Quantities are sent as typed ("1km2", "500m"); the API parses and validates them
    const parameters = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ""));
    const ok = await edit((slug) => appendOperation(slug, { operation: type.op_id, parameters }));
    if (ok) setValues({});
  };
  return { opId: type?.op_id, type, values, setOpId, setValue, submit, busy };
}

/* ------------------------------------------------------------------ build */

function BuildSection() {
  const isAdmin = useIsAdmin();
  const report = useAtomValue(buildReportAtom);
  const build = useBuild();
  if (!isAdmin) return null;

  let result = null;
  if (report != null) result = h(BuildResult);
  return h("section", [
    h("h3", "Build"),
    h(
      "p.hint",
      "Replays every operation onto the boundary. A large map can take minutes. " +
        "A written boundary is re-noded by the next `macrostrat topo update`."
    ),
    h(ButtonGroup, [
      h(Button, { icon: "eye-open", disabled: build.busy, onClick: build.preview }, "Preview"),
      h(Button, { icon: "build", intent: "primary", disabled: build.busy, onClick: build.write }, "Build"),
    ]),
    result,
  ]);
}

function BuildResult() {
  const report = useAtomValue(buildReportAtom)!;
  if (report.error != null) {
    let where = "";
    if (report.failed_operation_id != null) where = ` (operation ${report.failed_operation_id})`;
    return h(Callout, { intent: "danger", title: `Build failed${where}` }, report.error);
  }
  if (report.skipped != null) {
    return h(Callout, { intent: "warning", title: "Skipped" }, report.skipped);
  }
  let title = "Preview";
  if (!report.dry_run && report.written) title = "Built and written";
  else if (!report.dry_run) title = "Built; within tolerance, not written";
  return h(Callout, { intent: "success", title }, [
    h("div", `Area ${formatArea(report.area_km)} km²`),
    h("div", `Changed by ${formatArea(report.diff_km)} km²`),
  ]);
}

function useBuild() {
  const boundary = useAtomValue(boundaryAtom);
  const [busy, setBusy] = useAtom(busyAtom);
  const setReport = useSetAtom(buildReportAtom);
  const setError = useSetAtom(errorAtom);
  const setBoundary = useSetAtom(boundaryAtom);
  const setVersion = useSetAtom(tileVersionAtom);

  const run = async (dryRun: boolean) => {
    if (boundary == null) return;
    setBusy(true);
    setError(null);
    try {
      const report = await buildBoundary(boundary.slug, dryRun);
      setReport(report);
      if (report.written) {
        setVersion((v) => v + 1);
        setBoundary(await fetchBoundary(boundary.slug));
      }
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, preview: () => run(true), write: () => run(false) };
}

/* ---------------------------------------------------------------- helpers */

function describeParameters(op: BoundaryOperation): string {
  const parts = Object.entries(op.parameters ?? {})
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k} ${formatQuantity(v)}`);
  return parts.join(", ");
}

function formatQuantity(value: any): string {
  if (value != null && typeof value === "object" && "value" in value) {
    return `${value.value} ${value.unit ?? ""}`.trim();
  }
  return String(value);
}

function formatArea(km2: number | null): string {
  if (km2 == null) return "–";
  return km2.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function requiredLabel(type: OperationType | undefined, name: string) {
  if (type?.parameters.required?.includes(name)) return "(required)";
  return undefined;
}
