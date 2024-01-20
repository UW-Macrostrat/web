import { MacrostratAPIProvider } from "@macrostrat/api-views";
import {
  UnitSelectionProvider,
  useSelectedUnit,
  useUnitSelectionDispatch,
} from "@macrostrat/column-views";
import { C, compose, hyperStyled } from "@macrostrat/hyper";
import { useEffect, useMemo, useState } from "react";

import { Column } from "@macrostrat/column-views";
import { PatternProvider } from "~/_providers";
import styles from "./column-inspector.module.styl";
import ModalUnitPanel from "./modal-panel";

const h = hyperStyled(styles);

function ColumnPage({ columnInfo }) {
  const { col_id, units } = columnInfo;
  //const { unit_id, ...currentColumn } = columnNavArgs;
  const selectedUnit = useSelectedUnit();
  const setSelectedUnit = useUnitSelectionDispatch();

  const unitsA = useMemo(() => units, []);

  console.log("Rendering");

  //const columnFeature = useAPIResult("/columns", colParams)?.features[0];

  /* Harmonize selected unit and column data providers
    TODO: we could link the providers for selecting units and columns,
    but for now we have just nested together current separate state elements
  */

  const [unitSelectionInitialized, setUnitSelectionInitialized] =
    useState(false);

  const unit_id = selectedUnit?.unit_id;

  useEffect(() => {
    // Set initial unit selection
    if (unit_id == null || unitSelectionInitialized || units?.length == 0)
      return;

    const unit = units.find((d) => d.unit_id == unit_id);
    setSelectedUnit(unit);
    setUnitSelectionInitialized(true);
  }, []);

  useEffect(() => {
    if (selectedUnit == null && !unitSelectionInitialized) return;
    setSelectedUnit({ unit_id: selectedUnit?.unit_id });
  }, [selectedUnit, unitSelectionInitialized]);

  // 495
  return h("div.column-ui", [
    h("div.left-column", [
      h("div.column-view", [
        h("h1", columnInfo.col_name),
        h(Column, { data: unitsA }),
      ]),
    ]),
    h("div.right-column", [
      // h.if(selectedUnit == null)(ColumnNavigatorMap, {
      //   className: "column-map",
      //   currentColumn: columnFeature,
      //   setCurrentColumn,
      //   margin: 10,
      //   ...projectParams,
      // }),
      h(ModalUnitPanel, { unitData: units }),
    ]),
  ]);
}

const APIProvider = C(MacrostratAPIProvider, { useDev: false });

const ColumnInspector = compose(
  PatternProvider,
  UnitSelectionProvider,
  APIProvider,
  ColumnPage
);

export default ColumnInspector;
