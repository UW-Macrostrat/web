/** The inspector beside the sheet: the selected unit or surface, else a
 * summary of the column and how the editor works. */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { useAtomValue, useSetAtom } from "jotai";
import {
  MacrostratColumnStateProvider,
  SurfaceDetailsPanel,
  UnitDetailsPanel,
} from "@macrostrat/column-views";
import { DataField, Identifier } from "@macrostrat/data-components";
import {
  columnScaleOptionsAtom,
  editingModeAtom,
  selectedSurfaceAtom,
  selectedSurfaceIDAtom,
  selectedUnitAtom,
  selectedUnitIDAtom,
  snapshotAtom,
  surfacesAtom,
  editedUnitsAtom,
} from "./state";
import type { EditorSurface } from "./surfaces";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function EditorInspector() {
  const mode = useAtomValue(editingModeAtom);
  const selectedUnit = useAtomValue(selectedUnitAtom);
  const selectedSurface = useAtomValue(selectedSurfaceAtom);

  if (mode === "surfaces" && selectedSurface != null) {
    return h(SurfaceInspector, { surface: selectedSurface });
  }
  if (mode !== "surfaces" && selectedUnit != null) {
    return h(UnitInspector, { unit: selectedUnit });
  }
  return h(EditorHelp, { mode });
}

function UnitInspector({ unit }) {
  const units = useAtomValue(editedUnitsAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  // The panel resolves adjacent units' names through the column state scope
  return h(
    MacrostratColumnStateProvider,
    { units },
    h(UnitDetailsPanel, {
      unit,
      className: "inspector-panel unit-inspector",
      onClose: () => setSelectedUnitID(null),
      onSelectUnit: setSelectedUnitID,
      showLithologyProportions: true,
    } as any)
  );
}

/** The library's surface panel, wired to the editor's selection. It resolves
 * the units a surface separates through the column scope, so it sees the
 * edited units rather than the ones as loaded. */
function SurfaceInspector({ surface }: { surface: EditorSurface }) {
  const units = useAtomValue(editedUnitsAtom);
  const setSelectedSurfaceID = useSetAtom(selectedSurfaceIDAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  const setMode = useSetAtom(editingModeAtom);

  const selectUnit = (id: number) => {
    setSelectedUnitID(id);
    setMode("units");
  };

  return h(
    MacrostratColumnStateProvider,
    { units },
    h(
      SurfaceDetailsPanel,
      {
        surface,
        className: "inspector-panel surface-inspector",
        onClose: () => setSelectedSurfaceID(null),
        onSelectUnit: selectUnit,
      },
    ),
  );
}

function EditorHelp({ mode }) {
  const snapshot = useAtomValue(snapshotAtom);
  const units = useAtomValue(editedUnitsAtom);
  const surfaces = useAtomValue(surfacesAtom);
  const { isPositionAxis } = useAtomValue(columnScaleOptionsAtom);
  const info = snapshot?.columnInfo;

  const calibrated = surfaces.filter((s) => s.status !== "derived").length;

  // What a surface *is* follows the height scale, so the hint has to say
  // which coordinate an edit writes.
  let coordinate = "age";
  if (isPositionAxis) coordinate = "measured position";

  let hint =
    "Select a unit in the column or the table to inspect it. Edit ages, names and thicknesses in the table; the column redraws as you go.";
  if (mode === "surfaces") {
    hint = `Select a surface (a line on the column, or a row) to inspect it. Editing a surface's ${coordinate} moves every unit whose top or base sits on it.`;
  } else if (mode === "unified") {
    hint =
      "The column-ingestion units sheet: each unit carries its own boundaries and the surfaces are implicit. Whether editing one carries the units that shared it is the “preserve surfaces” setting.";
  }

  return h("div.inspector-panel.editor-help", [
    h("h3", [
      info?.col_name ?? "Column",
      " ",
      h(Identifier, { id: snapshot?.col_id }),
    ]),
    h(DataField, { label: "Group", value: info?.col_group, row: true }),
    h(DataField, { label: "Units", value: units.length, row: true }),
    h(DataField, {
      label: "Surfaces",
      value: `${surfaces.length} (${calibrated} in the age model)`,
      row: true,
    }),
    h("p.inspector-hint", { className: classNames(mode) }, hint),
  ]);
}
