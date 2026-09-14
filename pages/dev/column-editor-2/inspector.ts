/** The inspector beside the sheet: the selected unit or surface, else a
 * summary of the column and how the editor works. */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { useAtomValue, useSetAtom } from "jotai";
import { Button, Tag } from "@blueprintjs/core";
import {
  MacrostratColumnStateProvider,
  UnitDetailsPanel,
} from "@macrostrat/column-views";
import { DataField, Identifier, Value } from "@macrostrat/data-components";
import {
  editingModeAtom,
  selectedSurfaceAtom,
  selectedSurfaceIDAtom,
  selectedUnitAtom,
  selectedUnitIDAtom,
  snapshotAtom,
  surfacesAtom,
  unitsAtom,
} from "./state";
import {
  type EditorSurface,
  formatAge,
  formatProportion,
  surfaceStatusLabels,
} from "./surfaces";
import { surfaceClasses } from "./surfaces-overlay";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function EditorInspector() {
  const mode = useAtomValue(editingModeAtom);
  const selectedUnit = useAtomValue(selectedUnitAtom);
  const selectedSurface = useAtomValue(selectedSurfaceAtom);

  if (mode === "surfaces" && selectedSurface != null) {
    return h(SurfaceInspector, { surface: selectedSurface });
  }
  if (mode === "units" && selectedUnit != null) {
    return h(UnitInspector, { unit: selectedUnit });
  }
  return h(EditorHelp, { mode });
}

function UnitInspector({ unit }) {
  const units = useAtomValue(unitsAtom);
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

function SurfaceInspector({ surface }: { surface: EditorSurface }) {
  const units = useAtomValue(unitsAtom);
  const setSelectedSurfaceID = useSetAtom(selectedSurfaceIDAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  const setMode = useSetAtom(editingModeAtom);

  const unitName = (id: number) =>
    units.find((u) => u.unit_id === id)?.unit_name ?? `#${id}`;

  const selectUnit = (id: number) => {
    setSelectedUnitID(id);
    setMode("units");
  };

  let calibration = h(DataField, { label: "Calibration", value: "None" });
  if (surface.calibration != null) {
    calibration = h(DataField, { label: "Calibration" }, [
      h("div", [
        h("strong", surface.calibration.name),
        " ",
        h(
          "span.subtle",
          `(${surface.calibration.b_age}–${surface.calibration.t_age} Ma)`
        ),
      ]),
      h("div", [
        h(Value, { value: formatProportion(surface.proportion) }),
        " above the base of the interval",
      ]),
    ]);
  }

  let boundaryField = null;
  if (surface.boundary_id != null) {
    boundaryField = h(
      DataField,
      { label: "Age-model boundary" },
      h(Identifier, { id: surface.boundary_id })
    );
  }

  return h(
    "div.inspector-panel.surface-inspector",
    { className: surfaceClasses(surface) },
    [
      h("div.inspector-header", [
        h("h3", "Surface"),
        h(
          Tag,
          { minimal: true, className: "surface-status-tag" },
          surfaceStatusLabels[surface.status] ?? surface.status
        ),
        h.if(surface.type !== "")(Tag, { minimal: true }, surface.type),
        h("div.spacer"),
        h(Button, {
          icon: "cross",
          minimal: true,
          small: true,
          onClick: () => setSelectedSurfaceID(null),
        }),
      ]),
      h(DataField, { label: "Age", value: formatAge(surface.age) }),
      calibration,
      h(UnitLinks, {
        label: "Units above",
        ids: surface.unitsAbove,
        unitName,
        onSelect: selectUnit,
      }),
      h(UnitLinks, {
        label: "Units below",
        ids: surface.unitsBelow,
        unitName,
        onSelect: selectUnit,
      }),
      boundaryField,
      h(
        "p.inspector-hint",
        "Edit the age in the surfaces table to move every unit hung on this surface."
      ),
    ]
  );
}

function UnitLinks({ label, ids, unitName, onSelect }) {
  if (ids.length === 0) {
    return h(DataField, { label, value: "None" });
  }
  return h(
    DataField,
    { label },
    h(
      "ul.unit-links",
      ids.map((id) =>
        h(
          "li",
          { key: id },
          h(
            "a.unit-link",
            {
              href: "#",
              onClick(evt) {
                evt.preventDefault();
                onSelect(id);
              },
            },
            [unitName(id), " ", h("span.subtle", `#${id}`)]
          )
        )
      )
    )
  );
}

function EditorHelp({ mode }) {
  const snapshot = useAtomValue(snapshotAtom);
  const units = useAtomValue(unitsAtom);
  const surfaces = useAtomValue(surfacesAtom);
  const info = snapshot?.columnInfo;

  const calibrated = surfaces.filter((s) => s.status !== "derived").length;

  let hint =
    "Select a unit in the column or the table to inspect it. Edit ages, names and thicknesses in the table; the column redraws as you go.";
  if (mode === "surfaces") {
    hint =
      "Select a surface (a line on the column, or a row) to inspect it. Editing a surface's age moves every unit whose top or base sits on it.";
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
