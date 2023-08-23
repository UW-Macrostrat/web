import { hyperStyled, compose, C } from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { MacrostratAPIProvider } from "@macrostrat/api-views";
import { useEffect, useState } from "react";
import {
  UnitSelectionProvider,
  useSelectedUnit,
  useUnitSelectionDispatch,
} from "@macrostrat/column-views";

import { Column, useColumnNav } from "@macrostrat/column-views";
import { PatternProvider } from "~/_providers";
import ModalUnitPanel from "./modal-panel";
import { ColumnNavigatorMap, preprocessUnits } from "@macrostrat/column-views";
import styles from "./column-inspector.module.styl";

const h = hyperStyled(styles);

const ColumnTitle = (props) => {
  return h.if(props.data != null)("h1", props.data?.col_name);
};

function ColumnManager() {
  const defaultArgs = { col_id: 495 };
  const [columnNavArgs, setCurrentColumn] = useColumnNav(defaultArgs);
  const { unit_id, ...currentColumn } = columnNavArgs;
  const selectedUnit = useSelectedUnit();
  const setSelectedUnit = useUnitSelectionDispatch();

  const { col_id, ...projectParams } = currentColumn;

  const colParams = { ...currentColumn, format: "geojson" };
  const unitParams = { ...currentColumn, all: true, response: "long" };
  const columnFeature = useAPIResult("/columns", colParams)?.features[0];
  const unitData = useAPIResult("/units", unitParams);

  const units = preprocessUnits(unitData ?? []);

  /* Harmonize selected unit and column data providers
    TODO: we could link the providers for selecting units and columns,
    but for now we have just nested together current separate state elements
  */
  const [unitSelectionInitialized, setUnitSelectionInitialized] =
    useState(false);

  useEffect(() => {
    // Set initial unit selection
    if (unit_id == null || unitSelectionInitialized || units?.length == 0)
      return;

    const unit = units.find((d) => d.unit_id == unit_id);
    setSelectedUnit(unit);
    setUnitSelectionInitialized(true);
  }, [units]);

  useEffect(() => {
    if (selectedUnit == null && !unitSelectionInitialized) return;
    setCurrentColumn({ ...currentColumn, unit_id: selectedUnit?.unit_id });
  }, [selectedUnit, unitSelectionInitialized]);

  if (unitData == null) return null;

  // 495
  return h("div.column-ui", [
    h("div.left-column", [
      h("div.column-view", [
        h(ColumnTitle, { data: columnFeature?.properties }),
        h.if(unitData != null)(Column, { data: units }),
      ]),
    ]),
    h("div.right-column", [
      h.if(selectedUnit == null)(ColumnNavigatorMap, {
        className: "column-map",
        currentColumn: columnFeature,
        setCurrentColumn,
        margin: 10,
        ...projectParams,
      }),
      h(ModalUnitPanel, { unitData: units }),
    ]),
  ]);
}

const APIProvider = C(MacrostratAPIProvider, { useDev: true });

const App = compose(
  PatternProvider,
  UnitSelectionProvider,
  APIProvider,
  ColumnManager
);

export default App;
