import { C, compose, hyperStyled } from "@macrostrat/hyper";
import { useAPIResult, useElementSize } from "@macrostrat/ui-components";
import { geoNaturalEarth1 } from "d3-geo";
import { APIProvider } from "@macrostrat/ui-components";
import ColumnMap from "./column-picker";
import Column from "./column";
import {
  ColumnNavProvider,
  useColumnNav,
  UnitSelectionProvider,
  useSelectedUnit,
} from "@macrostrat/column-views";
import ModalUnitPanel from "./modal-panel";
import { preprocessUnits } from "./process-data";
import { ColumnAxisType } from "@macrostrat/column-components";
import {
  ThreeColumnLayout,
  useLayoutDispatch,
} from "@macrostrat/ui-components";
import { NonIdealState, Spinner, Button, ButtonGroup } from "@blueprintjs/core";
import { useEffect, useState, useRef } from "react";
import { PatternProvider } from "~/_providers.client";
import { apiV2Prefix } from "@macrostrat-web/settings";
import styles from "./age-model.module.styl";

const h = hyperStyled(styles);

const ColumnTitle = (props) => {
  return h.if(props.data != null)([
    " – ",
    h("span.column-title", props.data?.col_name),
  ]);
};

function ColumnView({ unitData, mode }) {
  if (unitData == null)
    return h(NonIdealState, { title: "Loading" }, h(Spinner));
  if (unitData.length === 0)
    return h(NonIdealState, {
      title: "Data unavailable",
      icon: "inbox",
      description: "No units have yet been captured for this core",
    });

  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref) ?? {};

  return h("div.column-view", { ref }, [
    h.if(unitData != null)(Column, {
      data: unitData,
      width,
      axisType: ColumnAxisType.HEIGHT,
      mode,
    }),
  ]);
}

//macrostrat.org/api/units?col_id=5156&status_code=in%20process&show_position=true&response=long

function UnitDetailPanel({ units, selectedUnit }) {
  const dispatch = useLayoutDispatch();

  useEffect(() => {
    dispatch({
      type: "show-panel",
      panel: ThreeColumnLayout.Panels.Detail,
      shouldShow: selectedUnit != null,
    });
  }, [selectedUnit]);

  return h(ModalUnitPanel, {
    className: "unit-details",
    unitData: units,
    setIsShown: () => {},
  });
}

function PageTitle({ children }) {
  const [currentColumn, setCurrentColumn] = useColumnNav();
  const shouldLinkTitle =
    currentColumn?.col_id != null && setCurrentColumn != null;
  let titleEl = "eODP column viewer";
  if (shouldLinkTitle) {
    titleEl = h(
      "a.title-link",
      {
        onClick: () => setCurrentColumn(defaultArgs),
      },
      titleEl
    );
  }
  return h("span.title", [titleEl, children]);
}

function ColumnMapPanel(props) {
  return h(ColumnMap, {
    margin: 0,
    color: "dodgerblue",
    apiRoute: "/defs/columns",
    filterColumns(col) {
      return col.properties.t_units > 0;
    },
    ...props,
  });
}

enum DetailMode {
  AgeModel = "age-model",
  Fossils = "fossils",
}

function DetailSelector({ mode, setMode }) {
  return h(ButtonGroup, { minimal: true }, [
    h(
      Button,
      {
        active: mode === DetailMode.AgeModel,
        onClick: () => setMode(DetailMode.AgeModel),
      },
      "Age model"
    ),
    h(
      Button,
      {
        active: mode === DetailMode.Fossils,
        onClick: () => setMode(DetailMode.Fossils),
      },
      "Nanofossils"
    ),
  ]);
}

function AppDetailView({ currentColumn, setCurrentColumn }) {
  const selectedUnit = useSelectedUnit();
  const { col_id, ...projectParams } = currentColumn;

  const colParams = { ...currentColumn, format: "geojson" };
  const unitParams = {
    ...currentColumn,
    show_position: true,
    all: true,
    response: "long",
  };
  const columnFeature = useAPIResult("/defs/columns", colParams, [
    currentColumn,
  ])?.features[0];

  const [mode, setMode] = useState<DetailMode>(DetailMode.AgeModel);

  const unitData = useAPIResult("/units", unitParams, [currentColumn]);

  const units = preprocessUnits(unitData ?? []);

  const detailPanel = h(UnitDetailPanel, { units, selectedUnit });
  // 495
  const contextPanel = h(ColumnMapPanel, {
    currentColumn: columnFeature,
    setCurrentColumn,
    ...projectParams,
    filterColumns(col) {
      return col.properties.t_units > 0;
    },
  });

  return h(
    ThreeColumnLayout,
    {
      title: h(PageTitle, { setCurrentColumn, currentColumn }, [
        h(ColumnTitle, { data: columnFeature?.properties }),
      ]),
      contextPanel,
      detailPanel,
      headerActions: h(DetailSelector, { mode, setMode }),
      panelState: {
        detail: selectedUnit != null,
      },
      contextButtonPlacement: "right",
    },
    h(ColumnView, { unitData, mode })
  );
}

const defaultArgs = {
  status_code: "in process",
  project_id: 3,
};

function MainMapPanel({ currentColumn, setCurrentColumn, ...projectParams }) {
  const ref = useRef();
  // Size to fit the Natural Earth projection
  const { width, height } = useElementSize(ref) ?? {};
  const scale = Math.min(width / 5.6, height / 3);

  return h(ColumnMap, {
    ref,
    currentColumn: null,
    setCurrentColumn,
    margin: 0,
    color: "dodgerblue",
    apiRoute: "/defs/columns",
    ...projectParams,
    filterColumns(col) {
      return col.properties.t_units > 0;
    },
    projection: geoNaturalEarth1(),
    allowZoom: false,
    center: [-120, 0],
    scale,
  });
}

function AppMain() {
  const selectedUnit = useSelectedUnit();
  const [currentColumn, setCurrentColumn] = useColumnNav();
  const { col_id, ...projectParams } = currentColumn;

  if (col_id != null) {
    return h(AppDetailView, { currentColumn, setCurrentColumn });
  }
  return h(
    ThreeColumnLayout,
    {
      title: h(PageTitle, { setCurrentColumn, currentColumn }),
    },
    h(MainMapPanel, {
      currentColumn: null,
      setCurrentColumn,
      ...projectParams,
    })
  );
}

function MacrostratAPIProvider(props) {
  return h(
    APIProvider,
    {
      baseURL: apiV2Prefix,
      unwrapResponse: (res) => res.success.data,
    },
    props.children
  );
}

export const Page = compose(
  //DarkModeProvider,
  PatternProvider,
  UnitSelectionProvider,
  C(ColumnNavProvider, { ...defaultArgs }),
  C(MacrostratAPIProvider, { useDev: false }),
  AppMain
);
