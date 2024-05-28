import h, { compose, C } from "@macrostrat/hyper";
import { useAPIResult, DarkModeProvider } from "@macrostrat/ui-components";
import { MacrostratAPIProvider } from "common";
import {
  UnitSelectionProvider,
  useSelectedUnit,
} from "@macrostrat/column-views";

import { ColumnMapNavigator } from "packages/column-views/src/map";
import { Column } from "@macrostrat/column-views";
import GeologicPatternProvider from "../pattern-provider";
import { useColumnNav } from "common/macrostrat-columns";
import ModalUnitPanel from "./modal-panel";
import { preprocessUnits } from "@macrostrat/concept-app-helpers";

const ColumnTitle = (props) => {
  return h.if(props.data != null)("h1", props.data?.col_name);
};

function ColumnManager() {
  const defaultArgs = { col_id: 495 };
  const [currentColumn, setCurrentColumn] = useColumnNav(defaultArgs);
  const selectedUnit = useSelectedUnit();
  const { col_id, ...projectParams } = currentColumn;

  const colParams = { ...currentColumn, format: "geojson" };
  const unitParams = { ...currentColumn, all: true, response: "long" };
  const columnFeature = useAPIResult("/columns", colParams, [currentColumn])
    ?.features[0];

  const unitData = useAPIResult("/units", unitParams, [currentColumn]);

  if (unitData == null) return null;

  const units = preprocessUnits(unitData);

  // 495
  return h("div.column-ui", [
    h("div.left-column", [
      h("div.column-view", [
        h(ColumnTitle, { data: columnFeature?.properties }),
        h.if(unitData != null)(Column, { data: units }),
      ]),
    ]),
    h("div.right-column", [
      h.if(selectedUnit == null)(ColumnMapNavigator, {
        className: "column-map",
        currentColumn: columnFeature,
        setCurrentColumn,
        margin: 0,
        ...projectParams,
      }),
      h(ModalUnitPanel, { unitData: units }),
    ]),
  ]);
}

const APIProvider = C(MacrostratAPIProvider, { useDev: false });

const App = compose(
  DarkModeProvider,
  GeologicPatternProvider,
  UnitSelectionProvider,
  APIProvider,
  ColumnManager
);

export default App;
