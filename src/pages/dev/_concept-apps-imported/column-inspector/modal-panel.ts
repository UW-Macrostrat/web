import h from "@macrostrat/hyper";
import { JSONView, ModalPanel } from "@macrostrat/ui-components";
import { ButtonGroup, Button } from "@blueprintjs/core";
import {
  useSelectedUnit,
  useUnitSelectionDispatch,
} from "@macrostrat/column-views";
import { useEffect } from "react";

const ColumnTitle = (props) => {
  return h.if(props.data != null)("h1", props.data?.col_name);
};

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

  // Keyboard column selector
  useEffect(() => {
    const listener = (event) => {
      const nextIx = keyMap[event.keyCode];
      if (nextIx < 0 || nextIx >= unitData.length) return;
      selectUnit(unitData[nextIx]);
      event.stopPropagation();
    };

    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [unitData, ix]);

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
    h(JSONView, { data: selectedUnit })
  );
}

export default ModalUnitPanel;
