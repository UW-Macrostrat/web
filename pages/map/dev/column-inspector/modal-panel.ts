import { hyperStyled } from "@macrostrat/hyper";
import { JSONView, ModalPanel, useKeyHandler } from "@macrostrat/ui-components";
import { ButtonGroup, Button } from "@blueprintjs/core";
import {
  useSelectedUnit,
  useUnitSelectionDispatch,
} from "@macrostrat/column-views";
import { useEffect } from "react";
import styles from "./column-inspector.module.styl";

const h = hyperStyled(styles);

function ModalUnitPanel(props) {
  const { unitData } = props;
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

  const headerChildren = h(ButtonGroup, { minimal: true }, [
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

  return h(
    ModalPanel,
    {
      onClose() {
        selectUnit(null);
      },
      title: selectedUnit.unit_name,
      minimal: true,
      headerChildren,
    },
    h(JSONView, { data: selectedUnit, hideRoot: true })
  );
}

export default ModalUnitPanel;
