import { compose, hyperStyled } from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import {
  MacrostratAPIProvider,
  UnitSelectionProvider,
} from "../../../../deps/web-components/packages/common/src";
import { GeologicPatternProvider } from "@macrostrat/column-components";
import Column from "../../../../deps/web-components/concept-apps/column-inspector/column";
import { preprocessUnits } from "@macrostrat/concept-app-helpers";

import styles from "./main.module.styl";
const h = hyperStyled(styles);

function _StratColumn() {
  const col_id = 102;
  const unitData = useAPIResult("/units", {
    all: true,
    response: "long",
    col_id,
  });
  if (unitData == null) {
    return null;
  }

  return h(
    "div.strat-column-container",
    h(Column, { data: preprocessUnits(unitData) })
  );
}

function resolvePattern(id) {
  return `//visualization-assets.s3.amazonaws.com/geologic-patterns/png/${id}.png`;
}

function PatternProvider({ children }) {
  return h(GeologicPatternProvider, { resolvePattern }, children);
}

export const StratColumn = compose(
  MacrostratAPIProvider,
  UnitSelectionProvider,
  PatternProvider,
  _StratColumn
);
