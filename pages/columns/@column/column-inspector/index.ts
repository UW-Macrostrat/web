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
  SGPMeasurementsColumn,
} from "@macrostrat/column-views";
import { hyperStyled } from "@macrostrat/hyper";
import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import styles from "./index.module.sass";
import { navigate } from "vike/client/router";

import { StableIsotopesColumn } from "./facets";
import { ModalUnitPanel } from "./modal-panel";

import { AlphaTag, BetaTag, PageBreadcrumbs } from "~/components";
import { onDemand } from "~/_utils";
import { CollapsePanel, ErrorBoundary } from "@macrostrat/ui-components";
import { DataField, Parenthetical } from "@macrostrat/data-components";
import { ColumnAxisType } from "@macrostrat/column-components";
import { atom, useAtom, useAtomValue, useSetAtom, WritableAtom } from "jotai";
import {
  Button,
  Collapse,
  ControlGroup,
  FormGroup,
  HTMLSelect,
  NumericInput,
} from "@blueprintjs/core";
import { useHydrateAtoms } from "jotai/utils";

interface ColumnHashState {
  unit?: number;
  t_age?: number;
  b_age?: number;
  t_pos?: number;
  b_pos?: number;
  axis?: string;
  facet?: string;
  scale?: number;
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
  { label: "None", value: "none" },
  { label: "Carbon/oxygen isotopes", value: "stable-isotopes" },
  { label: "SGP", value: "sgp-samples" },
  { label: "Fossils (taxa)", value: "fossil-taxa" },
  { label: "Fossils (collections)", value: "fossil-collections" },
  { label: "Detrital zircons", value: "detrital-zircons" },
];

const validFacets = facets.map((d) => d.value).filter((d) => d != "none");

function getStateFromHash(): ColumnHashState {
  const hash = document.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const state: ColumnHashState = {};

  state.facet = validateValues<string>(
    params.get("facet"),
    validFacets as string[]
  );
  state.axis = validateAxis(params.get("axis"));
  state.unit = validateInt(params.get("unit"));
  for (const key of ["t_age", "b_age", "t_pos", "b_pos", "scale"]) {
    state[key] = validateNumber(params.get(key));
  }

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

function atomWithHashParam<T>(key: keyof ColumnHashState) {
  return atom(
    (get) => {
      const hashState = get(hashStateAtom);
      return hashState[key] as T;
    },
    (get, set, newValue: number | null) => {
      set(hashStateAtom, (prev) => {
        console.log("Updating hash state", key, newValue);
        return { ...prev, [key]: newValue };
      });
    }
  );
}

const selectedUnitIDAtom = atomWithHashParam<number | null>("unit");
const selectedUnitAtom = atom((get) => {
  const units = get(unitsAtom);
  const selectedUnitID = get(selectedUnitIDAtom);
  if (selectedUnitID == null) return null;
  return units.find((d) => d.unit_id == selectedUnitID) ?? null;
});

const validateSelectedUnitIDAtom = atom(null, (get, set) => {
  const units = get(unitsAtom);
  const selectedUnitID = get(selectedUnitIDAtom);
  const unitIDs = units.map((d) => d.unit_id);
  if (!unitIDs.includes(selectedUnitID)) {
    // Clear invalid selection
    set(selectedUnitIDAtom, null);
  }
});

const axisTypeAtom = atomWithHashParam<ColumnAxisType>("axis");
const facetAtom = atomWithHashParam<string | null>("facet");

const t_ageAtom = atomWithHashParam<number>("t_age");
const b_ageAtom = atomWithHashParam<number>("b_age");
const t_posAtom = atomWithHashParam<number>("t_pos");
const b_posAtom = atomWithHashParam<number>("b_pos");

const pixelScaleAtom = atomWithHashParam<number>("scale");

const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

const h = hyperStyled(styles);

export function ColumnPage(props) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ColumnPageInner, props))
  );
}

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

interface ColumnInfo {
  col_id: number;
  col_type: "section" | "column";
  units: ExtUnit[];
}

const columnInfoAtom = atom<ColumnInfo>();

const columnTypeAtom = atom<"section" | "column">((get) => {
  return get(columnInfoAtom).col_type;
});

const unitsAtom = atom<ExtUnit[]>((get) => {
  return get(columnInfoAtom).units;
});

const defaultAxisTypeAtom = atom<ColumnAxisType>((get) => {
  const columnType = get(columnTypeAtom);
  const isSection = columnType === "section";
  return isSection ? ColumnAxisType.HEIGHT : ColumnAxisType.AGE;
});

const inferredAxisTypeAtom = atom((get) => {
  /** Column axis type, inferred from column type if not set by user */
  return get(axisTypeAtom) ?? get(defaultAxisTypeAtom);
});

const heightAxisTypeAtom = atom<ColumnAxisType>((get) => {
  const inferredAxisType = get(inferredAxisTypeAtom);
  const units = get(unitsAtom);
  return inferHeightAxisType(inferredAxisType, units);
});

function useUpdateAtoms(atomsWithValues: [WritableAtom<any, any, any>, any][]) {
  useHydrateAtoms(atomsWithValues);
  const setAtoms = atomsWithValues.map(([atom]) => useSetAtom(atom));
  useEffect(
    () => {
      atomsWithValues.forEach(([atom, value], i) => {
        setAtoms[i](value);
      });
    },
    atomsWithValues.map(([, value]) => value)
  );
}

function ColumnPageInner({ columnInfo, linkPrefix = "/", projectID }) {
  const { units, col_id } = columnInfo;

  const isSection = columnInfo.col_type == "section";

  useUpdateAtoms([[columnInfoAtom, columnInfo]]);

  const validateSelectedUnitID = useSetAtom(validateSelectedUnitIDAtom);

  const pixelScale = useAtomValue(pixelScaleAtom);

  useEffect(() => {
    validateSelectedUnitID();
  }, [col_id]);

  let axisType = useAtomValue(heightAxisTypeAtom);

  let facetType = useAtomValue(facetAtom);
  const facetElement = useMemo(() => {
    return facetElements(facetType, columnInfo.col_id);
  }, [facetType, columnInfo.col_id]);

  // Set subsidiary options

  let hybridScale = null;
  let maxInternalColumns = undefined;
  let showTimescale = true;

  if (isSection) {
    maxInternalColumns = 1;
    if (axisType !== ColumnAxisType.AGE) {
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
    // We should be able to use height-based scale for height-based columns, but that isn't supported yet
    axisType = ColumnAxisType.AGE;
    hybridScale = { type: HybridScaleType.EquidistantSurfaces };

    maxInternalColumns = undefined;
  }

  const { t_age, b_age, t_pos, b_pos } = useAtomValue(hashStateAtom);

  const [selectedUnitID, setSelectedUnitID] =
    useAtom<number>(selectedUnitIDAtom);

  const selectedUnit = useAtomValue(selectedUnitAtom);

  const hashParams = useAtomValue(hashStateAtom);

  useEffect(() => {
    setHashFromState(hashParams);
  }, [hashParams]);

  const onSelectColumn = useCallback((col_id: number) => {
    // do nothing
    // We could probably find a more elegant way to do this
    navigate(`${linkPrefix}columns/${col_id}${window.location.hash}`, {
      overwriteLastHistoryEntry: true,
    });
  }, []);

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
        h(
          MacrostratColumnStateProvider,
          {
            units,
            onUnitSelected: setSelectedUnitID,
            selectedUnit: selectedUnitID,
          },
          [
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
                    /**  TODO: we ideally would not have to force a re-render like this.
                     * It is very expensive given the complexity of the column view.
                     * However, not doing this results in artifacts (particularly with
                     * label rendering) when columns are switched.
                     */
                    units,
                    unitComponent: ColoredUnitComponent,
                    unconformityLabels: "minimal",
                    collapseSmallUnconformities: true,
                    showTimescale,
                    axisType,
                    columnWidth: 300,
                    width: 450,
                    maxInternalColumns,
                    showLabelColumn,
                    hybridScale,
                    pixelScale,
                    t_age: t_age ?? 0,
                    b_age: b_age ?? 4500,
                    t_pos,
                    b_pos,
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
          ]
        ),
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

function ColumnSettingsPanel() {
  const axisType = useAtomValue(heightAxisTypeAtom);
  const isHeightAxis =
    axisType === ColumnAxisType.HEIGHT || axisType === ColumnAxisType.DEPTH;

  let unit = "pixels/Myr";
  if (isHeightAxis) {
    unit = "pixels/m";
  } else if (axisType === ColumnAxisType.ORDINAL) {
    unit = "pixels/surface";
  }

  let heightAxisLabel = "Height";
  if (axisType === ColumnAxisType.DEPTH) {
    heightAxisLabel = "Depth";
  }

  return h("div.column-settings-panel", [
    h("h3", "Settings"),
    h(AxisTypeControl),
    h(FacetControl),
    h(RangeControl, {
      label: "Age range",
      unit: "Ma",
      topAtom: t_ageAtom,
      bottomAtom: b_ageAtom,
    }),
    h.if(isHeightAxis)(RangeControl, {
      label: heightAxisLabel + " range",
      unit: "m",
      topAtom: t_posAtom,
      bottomAtom: b_posAtom,
    }),
    h(NumericAtomControl, {
      label: h("span", [
        "Fixed scale",
        " ",
        h(Parenthetical, { className: "unit" }, unit),
      ]),
      atom: pixelScaleAtom,
    }),
  ]);
}

function ClearButton({ value, setValue, disabled = null }) {
  return h(Button, {
    minimal: true,
    small: true,
    icon: "cross",
    disabled: disabled ?? value == null,
    onClick: () => setValue(null),
  });
}

function AtomClearButton({ atom, disabled }) {
  const [value, setValue] = useAtom(atom);
  return h(ClearButton, { value, setValue, disabled });
}

function NumericAtomControl({
  label,
  atom,
  placeholder,
}: {
  label: string;
  atom: typeof t_ageAtom;
  placeholder?: string;
}) {
  const [value, setValue] = useAtom(atom);
  return h(
    FormGroup,
    { label, inline: true },
    h(ControlGroup, { fill: false }, [
      h(AtomNumericInput, {
        atom,
        placeholder,
      }),
      h(AtomClearButton, { atom }),
    ])
  );
}

function RangeControl({
  label,
  unit,
  topAtom,
  bottomAtom,
  disabled,
}: {
  label: string;
  topAtom: WritableAtom<any, any, any>;
  bottomAtom: WritableAtom<any, any, any>;
  disabled?: boolean;
  placeholder?: string;
  unit?: string;
}) {
  const bothSetAtom = useRef(
    atom(
      (get) => {
        return get(topAtom) ?? get(bottomAtom);
      },
      (get, set) => {
        set(bottomAtom, null);
        set(topAtom, null);
      }
    )
  );
  let labelEl: ReactNode = label;
  if (unit != null) {
    labelEl = h("span", [
      label,
      " ",
      h(Parenthetical, { className: "unit" }, unit),
    ]);
  }

  return h(
    FormGroup,
    { label: labelEl, inline: false, className: "range-control", disabled },
    h(ControlGroup, { fill: true }, [
      h(AtomNumericInput, {
        atom: bottomAtom,
        placeholder: "Bottom",
      }),
      h(AtomNumericInput, {
        atom: topAtom,
        placeholder: "Top",
      }),
      h(AtomClearButton, {
        atom: bothSetAtom.current,
      }),
    ])
  );
}

function AtomNumericInput({ atom, ...rest }) {
  const [value, setValue] = useAtom(atom);
  return h(NumericInput, {
    value: value ?? "",
    onValueChange: setValue,
    ...rest,
  });
}

function AxisTypeControl() {
  const optionsValues = Object.entries(ageAxisOptions).map(([k, v]) => {
    return { label: k, value: v };
  });
  const axisType = useAtomValue(inferredAxisTypeAtom);
  const defaultAxisType = useAtomValue(defaultAxisTypeAtom);
  const setAxisType = useSetAtom(axisTypeAtom);
  return h(
    FormGroup,
    { label: "Axis type", inline: true },
    h(ControlGroup, { fill: true }, [
      h(HTMLSelect, {
        options: optionsValues,
        value: axisType,
        onChange: (evt) => {
          const value = evt.target.value as ColumnAxisType;
          // set axis type
          setAxisType(value);
        },
      }),
      h(ClearButton, {
        value: axisType,
        setValue: setAxisType,
        disabled: axisType === defaultAxisType,
      }),
    ])
  );
}

function FacetControl() {
  const [facet, setFacet] = useAtom(facetAtom);
  return h("div.facet-control", [
    h(
      FormGroup,
      {
        label: h("span.facet-label", [
          "Facet ",
          h(AlphaTag, { content: "This feature is in early development" }),
        ]),
        inline: true,
      },
      h(ControlGroup, { fill: true }, [
        h(HTMLSelect, {
          options: facets,
          value: facet ?? "none",
          className: facet == null ? "unset" : null,
          onChange: (evt) => {
            const value = evt.target.value;
            setFacet(value === "none" ? null : value);
          },
        }),
        h(ClearButton, { value: facet, setValue: setFacet }),
      ])
    ),
  ]);
}
