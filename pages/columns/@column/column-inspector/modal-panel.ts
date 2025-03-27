import { Button, ButtonGroup } from "@blueprintjs/core";
import {
  UnitDetailsPanel,
  useSelectedUnit,
  useUnitSelectionDispatch,
} from "@macrostrat/column-views";
import { JSONView, ModalPanel, useKeyHandler } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";

function ModalUnitPanel(props) {
  const { unitData, className } = props;
  const selectedUnit = useSelectedUnit();
  const selectUnit = useUnitSelectionDispatch();

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
      selectUnit(unitData[nextIx]);
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
        selectUnit(unitData[ix - 1]);
      },
    }),
    h(Button, {
      icon: "arrow-down",
      disabled: ix === unitData.length - 1,
      onClick() {
        selectUnit(unitData[ix + 1]);
      },
    }),
  ]);

  return h(UnitDetailsPanel, {
    unit: selectedUnit,
    onClose(event) {
      selectUnit(null, null, event);
    },
    className,
    actions,
    showLithologyProportions: true,
  });
}

export default ModalUnitPanel;
