import { Button } from "@blueprintjs/core";
import { UnitDetailsPanel } from "@macrostrat/column-views";
import { useKeyHandler } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";

export function ModalUnitPanel(props) {
  const { unitData, className, selectedUnit, onSelectUnit, features } = props;

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
      console.log("close");
      onSelectUnit(null);
    },
    className,
    actions,
    showLithologyProportions: true,
    onSelectUnit,
    columnUnits: unitData,
    features,
    onClickItem: (e, unit) => {
      if(unit?.lith_id) {
        window.open('/lex/lithology/' + unit.lith_id, '_blank');
      }

      if(unit?.environ_id) {
        window.open('/lex/environments/' + unit.environ_id, '_blank');
      }

      if(e?.data?.int_id) { // fix when new we components release is out
        window.open('/lex/intervals/' + e.data.int_id, '_blank');
      }

      /* // implement when new web components release is out
      if(unit?.strat_name_id) {
        window.open('/lex/strat-names/' + unit.strat_name_id, '_blank');
      }
      */
    },
  });
}
