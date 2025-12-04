import {
  ColoredUnitComponent,
  Column,
  DetritalColumn,
  ExtUnit,
  FossilDataType,
  HybridScaleType,
  Identifier,
  MacrostratColumnStateProvider,
  MacrostratDataProvider,
  PBDBFossilsColumn,
  ReferencesField,
} from "@macrostrat/column-views";
import { hyperStyled } from "@macrostrat/hyper";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import styles from "./index.module.sass";
import { navigate } from "vike/client/router";

import { SGPMeasurementsColumn, StableIsotopesColumn } from "./facets";
import { ModalUnitPanel } from "./modal-panel";

import { PageBreadcrumbs } from "~/components";
import { onDemand } from "~/_utils";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { DataField } from "@macrostrat/data-components";
import { ColumnAxisType } from "@macrostrat/column-components";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button, FormGroup, HTMLSelect } from "@blueprintjs/core";
import { useHydrateAtoms } from "jotai/utils";

interface ColumnHashState {
  unit?: number;
  t_age?: number;
  b_age?: number;
  t_pos?: number;
  b_pos?: number;
  axis?: string;
  facet?: string;
}

function validateInt(value: string | null): number | undefined {
  if (value == null) return undefined;
  const id = parseInt(value);
  if (isNaN(id)) return undefined;
  return id;
}

function validateNumber(value: string | null): number | undefined {
  if (value == null) return undefined;
  const num = parseFloat(value);
  if (isNaN(num)) return undefined;
  return num;
}

function validateValues<T>(
  value: string | null,
  options: string[]
): T | undefined {
  if (value == null) return undefined;
  if (options.includes(value)) {
    return value as T;
  }
  return undefined;
}

function validateAxis(value: string | null): ColumnAxisType | undefined {
  const validAxes = Object.values(ColumnAxisType);
  return validateValues(value, validAxes);
}

const facets = [
  { label: "None", value: null },
  { label: "Carbon/oxygen isotopes", value: "stable-isotopes" },
  { label: "SGP", value: "sgp-samples" },
  { label: "Fossils (taxa)", value: "fossil-taxa" },
  { label: "Fossils (collections)", value: "fossil-collections" },
  { label: "Detrital zircons", value: "detrital-zircons" },
];

const validFacets = facets.map((d) => d.value).filter((d) => d != null);

function getStateFromHash(): ColumnHashState {
  const hash = document.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const state: ColumnHashState = {};

  state.unit = validateInt(params.get("unit"));
  for (const key in ["t_age", "b_age", "t_pos", "b_pos"]) {
    state[key] = validateNumber(params.get(key));
  }
  state.axis = validateAxis(params.get("axis"));
  state.facet = validateValues<string>(
    params.get("facet"),
    validFacets as string[]
  );
  return state;
}

function setHashFromState(state: ColumnHashState) {
  if (window == null) return;
  let params = new URLSearchParams();
  for (const key in state) {
    const value = state[key];
    if (value == null) {
      params.delete(key);
    } else {
      params.set(key, value.toString());
    }
  }
  let newHash = params.toString();
  let newURL = document.location.pathname;
  if (newHash !== "") {
    newURL += `#${newHash}`;
  }
  newURL += document.location.search;

  if (newHash !== document.location.hash) {
    history.replaceState(null, document.title, newURL);
  }
}

const hashStateAtom = atom<ColumnHashState>(getStateFromHash());

const selectedUnitIDAtom = atom(
  (get) => {
    const hashState = get(hashStateAtom);
    return hashState.unit;
  },
  (get, set, newValue: number | null) => {
    set(hashStateAtom, (prev) => {
      return { ...prev, unit: newValue };
    });
  }
);

const ageRangeAtom = atom<{ t_age: number | null; b_age: number | null }>({
  t_age: null,
  b_age: null,
});

const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

const h = hyperStyled(styles);

export function ColumnPage(props) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ColumnPageInner, props))
  );
}

const heightAxisTypeAtom = atom<ColumnAxisType>();
const facetAtom = atom<string | null>();

function inferHeightAxisType(axisType: ColumnAxisType, units): ColumnAxisType {
  if (axisType !== ColumnAxisType.HEIGHT && axisType !== ColumnAxisType.DEPTH) {
    return axisType;
  }
  // Infer axis type from units
  const u0 = units[0];
  if (u0?.t_pos != null && u0?.b_pos != null) {
    const t_pos = Number(u0.t_pos);
    const b_pos = Number(u0.b_pos);
    const d_pos = t_pos - b_pos;
    if (d_pos > 0) {
      return ColumnAxisType.HEIGHT;
    } else {
      return ColumnAxisType.DEPTH;
    }
  }
  return null;
}

const columnTypeAtom = atom<"section" | "column" | null>();

const unitsAtom = atom<ExtUnit[]>();

const selectedUnitAtom = atom((get) => {
  const units = get(unitsAtom);
  const selectedUnitID = get(selectedUnitIDAtom);
  if (selectedUnitID == null) return null;
  return units.find((d) => d.unit_id == selectedUnitID) ?? null;
});

const inferredAxisTypeAtom = atom((get) => {
  /** Column axis type, inferred from column type if not set by user */
  const columnType = get(columnTypeAtom);
  const heightAxisType = get(heightAxisTypeAtom);
  const isSection = columnType === "section";
  const defaultAxisType = isSection
    ? ColumnAxisType.HEIGHT
    : ColumnAxisType.AGE;
  return heightAxisType ?? defaultAxisType;
});

function ColumnPageInner({ columnInfo, linkPrefix = "/", projectID }) {
  const { units } = columnInfo;

  const isSection = columnInfo.col_type == "section";

  useHydrateAtoms([
    [columnTypeAtom, columnInfo.col_type],
    [unitsAtom, units],
  ]);

  const a0 = useAtomValue(inferredAxisTypeAtom);
  let axisType = inferHeightAxisType(a0, units);

  let facetType = useAtomValue(facetAtom);
  const facetElement = useMemo(() => {
    return facetElements(facetType, columnInfo.col_id);
  }, [facetType, columnInfo.col_id]);

  // Set subsidiary options

  let hybridScale = null;
  let maxInternalColumns = undefined;
  let unconformityLabels = true;
  let showTimescale = true;

  if (isSection) {
    maxInternalColumns = 1;
    if (axisType !== ColumnAxisType.AGE) {
      unconformityLabels = false;
      showTimescale = false;
    }
  } else if (
    axisType == ColumnAxisType.HEIGHT ||
    axisType == ColumnAxisType.DEPTH
  ) {
    // Set up for approximate height column
    hybridScale = { type: HybridScaleType.ApproximateHeight };
    // Show ages on secondary axis
    axisType = ColumnAxisType.HEIGHT;
  }

  if (axisType == ColumnAxisType.ORDINAL) {
    // For ordinal columns, use the fancier "equidistant-surfaces" scale
    axisType = ColumnAxisType.AGE;
    hybridScale = { type: HybridScaleType.EquidistantSurfaces };

    maxInternalColumns = undefined;
  }

  const [selectedUnitID, setSelectedUnitID] =
    useAtom<number>(selectedUnitIDAtom);

  const selectedUnit = useAtomValue(selectedUnitAtom);

  const hashParams = useAtomValue(hashStateAtom);

  useEffect(() => {
    setHashFromState(hashParams);
  }, [hashParams]);

  const onSelectColumn = useCallback(
    (col_id: number) => {
      // do nothing
      // We could probably find a more elegant way to do this
      navigate(`${linkPrefix}columns/${col_id}${window.location.hash}`, {
        overwriteLastHistoryEntry: true,
      });
    },
    [setSelectedUnitID]
  );

  let assistantContent = h(ColumnGlobalModal, { data: columnInfo });

  if (selectedUnit != null) {
    assistantContent = h(ModalUnitPanel, {
      unitData: units,
      className: "unit-details-panel",
      selectedUnit,
      onSelectUnit: setSelectedUnitID,
    });
  }

  let children = null;
  let showLabelColumn = true;
  if (facetElement != null) {
    showLabelColumn = false;
    children = h("div.facet-container", [facetElement]);
  }

  return h("div.page-container", [
    h("div.main", [
      // This is probably too high in the page hierarchy
      h(ErrorBoundary, [
        h(MacrostratColumnStateProvider, { units }, [
          h("div.left-column", [
            h("div.column-header", [
              h("nav", [
                h(PageBreadcrumbs, {
                  showLogo: true,
                  title: columnInfo.col_name,
                }),
              ]),
            ]),
            h("div.column-view", [
              h(
                Column,
                {
                  units,
                  unitComponent: ColoredUnitComponent,
                  unconformityLabels,
                  collapseSmallUnconformities: true,
                  showTimescale,
                  axisType,
                  columnWidth: 300,
                  width: 450,
                  onUnitSelected: setSelectedUnitID,
                  selectedUnit: selectedUnitID,
                  maxInternalColumns,
                  showLabelColumn,
                  hybridScale,
                },
                children
              ),
            ]),
          ]),
          h("div.right-column", [
            h("div.right-column-boxes", [
              h(ColumnMap, {
                className: "column-map",
                inProcess: true,
                projectID,
                selectedColumn: columnInfo.col_id,
                onSelectColumn,
              }),
              assistantContent,
            ]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

function ColumnGlobalModal({ data }) {
  return h("div.column-assistant", [
    h(ColumnBasicInfo, { data }),
    h(ColumnSettingsPanel),
  ]);
}

function ColumnBasicInfo({ data, showColumnID = true }) {
  if (data == null) return null;
  return h("div.column-info", [
    h("div.column-title-row", [
      h("h1", data.col_name),
      h.if(showColumnID)("h2", h(Identifier, { id: data.col_id })),
    ]),
    h(DataField, {
      row: true,
      label: "Project",
      value: data.project_id,
    }),
    h(DataField, { row: true, label: "Group", value: data.col_group }),
    h(ReferencesField, {
      refs: data.refs,
      inline: false,
      row: true,
      className: "column-refs",
    }),
    // Show in Map
  ]);
}

let ageAxisOptions = {
  Height: ColumnAxisType.HEIGHT,
  Age: ColumnAxisType.AGE,
  Ordinal: ColumnAxisType.ORDINAL,
};

function facetElements(facet: string | null, columnID: number) {
  switch (facet) {
    case "stable-isotopes":
      return h(StableIsotopesColumn, { columnID });
    case "sgp-samples":
      return h(SGPMeasurementsColumn, { columnID });
    case "fossil-taxa":
      return h(PBDBFossilsColumn, {
        columnID,
        type: FossilDataType.Occurrences,
      });
    case "fossil-collections":
      return h(PBDBFossilsColumn, {
        columnID,
        type: FossilDataType.Collections,
      });
    case "detrital-zircons":
      return h(DetritalColumn, { columnID, color: "magenta" });
    default:
      return null;
  }
}

function isValidFacet(facet: string | null) {
  if (facet == null) return false;
  for (const d of facets) {
    if (d.value === facet) return true;
  }
  return false;
}

function ColumnSettingsPanel() {
  return h("div.column-settings-panel", [h(AxisTypeControl), h(FacetControl)]);
}

function AxisTypeControl() {
  const optionsValues = Object.entries(ageAxisOptions).map(([k, v]) => {
    return { label: k, value: v };
  });
  const axisType = useAtomValue(inferredAxisTypeAtom);
  const setAxisType = useSetAtom(heightAxisTypeAtom);
  return h(
    FormGroup,
    { label: "Axis type", inline: true },
    h([
      h(HTMLSelect, {
        options: optionsValues,
        value: axisType,
        onChange: (evt) => {
          const value = evt.target.value as ColumnAxisType;
          // set axis type
          setAxisType(value);
        },
      }),
      h(Button, {
        minimal: true,
        small: true,
        icon: "cross",
        disabled: axisType == null,
        onClick: () => setAxisType(null),
      }),
    ])
  );
}

function FacetControl() {
  const [facet, setFacet] = useAtom(facetAtom);
  return h("div.facet-control", [
    h(
      FormGroup,
      { label: "Facet", inline: true },
      h(HTMLSelect, {
        options: facets,
        value: facet,
        onChange: (evt) => {
          const value = evt.target.value;
          setFacet(value);
        },
      })
    ),
  ]);
}
