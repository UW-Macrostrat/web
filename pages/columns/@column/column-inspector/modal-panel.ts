import { Button, ButtonGroup } from "@blueprintjs/core";
import {
  UnitDetailsPanel,
  useSelectedUnit,
  useUnitSelectionDispatch,
} from "@macrostrat/column-views";
import { JSONView, ModalPanel, useKeyHandler } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";

export function ModalUnitPanel(props) {
  const { unitData, className, selectedUnit, onSelectUnit } = props;

  const ix = unitData?.findIndex(
    (unit) => unit.unit_id === selectedUnit?.unit_id
  );

  const keyMap = {
    38: ix - 1,
    40: ix + 1,
  };

  useKeyHandler(
    (event) => {
      const nextIx = keyMap[event.keyCode];
      if (nextIx == null || nextIx < 0 || nextIx >= unitData.length) return;
      onSelectUnit(unitData[nextIx].unit_id);
      event.stopPropagation();
    },
    [unitData, ix]
  );

  if (selectedUnit == null) return null;

  const actions = h([
    h(Button, {
      icon: "arrow-up",
      disabled: ix === 0,
      onClick() {
        onSelectUnit(unitData[ix - 1]?.unit_id);
      },
    }),
    h(Button, {
      icon: "arrow-down",
      disabled: ix === unitData.length - 1,
      onClick() {
        onSelectUnit(unitData[ix + 1]?.unit_id);
      },
    }),
  ]);

  return h(UnitDetailsPanel, {
    unit: selectedUnit,
    onClose(event) {
      onSelectUnit(null);
    },
    className,
    actions,
    showLithologyProportions: true,
    onSelectUnit,
    columnUnits: unitData,
  });
}
