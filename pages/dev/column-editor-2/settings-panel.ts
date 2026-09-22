/** The settings panel behind the toolbar's button: how the column is drawn,
 * and how an edit behaves. The values themselves are atoms in
 * `./state/options` — this is only the controls for them.
 *
 * The same idiom as the column page's `ColumnSettingsButton`
 * (`pages/columns/@column/column-inspector`) — display options sit apart from
 * the editing controls rather than crowding the mode bar. The height scale is
 * the consequential one: see `./scale` for what each mode means.
 */
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue, useSetAtom, type WritableAtom } from "jotai";
import {
  Button,
  ControlGroup,
  FormGroup,
  HTMLSelect,
  PopoverNext,
  SegmentedControl,
  Switch,
} from "@blueprintjs/core";
import { ColumnAxisType } from "@macrostrat/column-components";
import { Parenthetical } from "@macrostrat/data-components";
import { CommittedNumericInput } from "~/components/time-filter";
import {
  heightScaleOptions,
  unconformityCollapseOptions,
  type HeightScaleMode,
  type UnconformityCollapse,
} from "./scale";
import {
  allowOverlappingUnitsAtom,
  columnScaleOptionsAtom,
  editingModeAtom,
  shownTimescalesAtom,
  heightScaleModeAtom,
  overlapsLockedAtom,
  pixelScaleAtom,
  positionAxisAtom,
  preserveSurfacesAtom,
  showSurfaceLinesAtom,
  showTimescaleAtom,
  targetUnitHeightAtom,
  unconformityCollapseAtom,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function DisplaySettingsButton() {
  return h(PopoverNext, {
    minimal: true,
    placement: "bottom-end",
    content: h("div.settings-popover", h(DisplaySettingsPanel)),
    renderTarget: ({ isOpen, ...targetProps }) =>
      h(Button, {
        ...targetProps,
        icon: "settings",
        minimal: true,
        small: true,
        active: isOpen,
        text: "Display",
        title: "Column display settings",
      }),
  });
}

function DisplaySettingsPanel() {
  const mode = useAtomValue(heightScaleModeAtom);
  const hasFixedScale = useAtomValue(pixelScaleAtom) != null;

  let scaleUnit = "pixels/Myr";
  if (mode === "position") {
    scaleUnit = "pixels/m";
  } else if (mode === "equidistant-surfaces") {
    scaleUnit = "pixels/surface";
  }

  return h("div.display-settings-panel", [
    h("h3", "Display"),
    h(HeightScaleControl),
    h(UnconformityControl),
    h(TimescalesControl),
    h(NumberControl, {
      label: labelWithUnit("Fixed scale", scaleUnit),
      valueAtom: pixelScaleAtom,
      placeholder: "auto",
    }),
    h(NumberControl, {
      label: labelWithUnit("Unit height", "px"),
      valueAtom: targetUnitHeightAtom,
      // A fixed scale decides the column's size outright; the library ignores
      // the target unit height then.
      disabled: hasFixedScale,
    }),
    h(SwitchControl, { label: "Timescale", valueAtom: showTimescaleAtom }),
    h(SwitchControl, {
      label: "Surface lines in units mode",
      valueAtom: showSurfaceLinesAtom,
    }),
    h("h3.section", "Editing"),
    h(EditingOptions),
  ]);
}

/** How a boundary edit behaves. These change what an edit *does*, not how the
 * column is drawn, so they sit in their own group. */
function EditingOptions() {
  const overlapsLocked = useAtomValue(overlapsLockedAtom);

  let overlapHint = null;
  if (overlapsLocked) {
    overlapHint = h(
      "p.setting-hint",
      "This column already has overlapping units, so overlap can't be forbidden."
    );
  }

  return h([
    h(SwitchControl, {
      key: "preserve",
      label: "Preserve surfaces",
      valueAtom: preserveSurfacesAtom,
    }),
    h(
      "p.setting-hint",
      { key: "preserve-hint" },
      "Moving a unit's boundary carries every unit that shared it. Turn it off to edit one unit at a time, as the ingestion spreadsheet does."
    ),
    h(SwitchControl, {
      key: "overlap",
      label: "Allow overlapping units",
      valueAtom: allowOverlappingUnitsAtom,
      disabled: overlapsLocked,
    }),
    overlapHint,
  ]);
}

function labelWithUnit(label: string, unit: string) {
  return h("span", [label, " ", h(Parenthetical, { className: "unit" }, unit)]);
}

function HeightScaleControl() {
  const mode = useAtomValue(heightScaleModeAtom);
  const setMode = useSetAtom(heightScaleModeAtom);
  const positionAxis = useAtomValue(positionAxisAtom);

  const options = heightScaleOptions.map((opt) => {
    if (opt.value !== "position") return opt;
    let label = "Measured height";
    if (positionAxis === ColumnAxisType.DEPTH) label = "Measured depth";
    if (positionAxis == null) label = "Measured position";
    // A column whose units carry no `t_pos`/`b_pos` has nothing to draw on a
    // position axis, so the option shows but can't be picked.
    return { label, value: opt.value, disabled: positionAxis == null };
  });

  return h(
    FormGroup,
    { label: "Height scale" },
    h(HTMLSelect, {
      fill: true,
      options,
      value: mode,
      onChange: (evt) => setMode(evt.target.value as HeightScaleMode),
    })
  );
}

const timescaleOptions = [
  { label: "ICS", value: "ics" },
  { label: "Selection", value: "selection" },
  { label: "All referenced", value: "all" },
];

/** Which timescales are drawn beside the column. A surface is calibrated
 * against an interval, and that interval often belongs to a regional set
 * rather than the international one — this is how to see which. Only surfaces
 * mode has a surface to answer for, so the control says so elsewhere. */
function TimescalesControl() {
  const [value, setValue] = useAtom(shownTimescalesAtom);
  const mode = useAtomValue(editingModeAtom);
  const inSurfacesMode = mode === "surfaces";

  let helperText = null;
  if (!inSurfacesMode) {
    helperText = "Referenced timescales are drawn in surfaces mode.";
  }

  return h(
    FormGroup,
    {
      label: "Show timescales",
      helperText,
      disabled: !inSurfacesMode,
    },
    h(SegmentedControl, {
      small: true,
      fill: true,
      options: timescaleOptions,
      value,
      onValueChange: (next: any) => setValue(next),
      disabled: !inSurfacesMode,
    })
  );
}

/** How much of the section structure is drawn as unconformity markers. The
 * library only collapses gaps on a plain scale — a hybrid one has already
 * rewritten the mapping from time to pixels, so there is no gap left to
 * judge — and the control says so rather than doing nothing. */
function UnconformityControl() {
  const [value, setValue] = useAtom(unconformityCollapseAtom);
  const { hybridScale } = useAtomValue(columnScaleOptionsAtom);

  let helperText = null;
  if (hybridScale != null) {
    helperText = "This height scale draws every gap to its own scale.";
  }

  return h(
    FormGroup,
    {
      label: "Collapse unconformities",
      helperText,
      disabled: hybridScale != null,
    },
    h(SegmentedControl, {
      small: true,
      fill: true,
      options: unconformityCollapseOptions,
      value,
      onValueChange: (next: UnconformityCollapse) => setValue(next),
      disabled: hybridScale != null,
    })
  );
}

type NumberAtom = WritableAtom<number | null, [number | null], void>;

function NumberControl({
  label,
  valueAtom,
  placeholder,
  disabled,
}: {
  label: any;
  valueAtom: NumberAtom;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useAtom(valueAtom);
  return h(
    FormGroup,
    { label, inline: true, disabled },
    h(ControlGroup, { fill: false }, [
      h(CommittedNumericInput, {
        value: value ?? null,
        onCommit: setValue,
        minorStepSize: 0.1,
        placeholder,
        disabled,
      }),
      h(Button, {
        minimal: true,
        small: true,
        icon: "cross",
        disabled: disabled || value == null,
        onClick: () => setValue(null),
      }),
    ])
  );
}

function SwitchControl({
  label,
  valueAtom,
  disabled,
}: {
  label: string;
  valueAtom: WritableAtom<boolean, [boolean], void>;
  disabled?: boolean;
}) {
  const [value, setValue] = useAtom(valueAtom);
  return h(Switch, {
    checked: value,
    label,
    disabled,
    onChange: () => setValue(!value),
  });
}
