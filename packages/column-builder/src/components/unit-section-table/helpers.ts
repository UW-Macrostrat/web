import React, { useState } from "react";
import {
  Button,
  ButtonGroup,
  Checkbox,
  Menu,
  MenuItem,
  MenuDivider,
} from "@blueprintjs/core";
import { Popover2, Tooltip2 } from "@blueprintjs/popover2";
import { UnitsView } from "@macrostrat-web/column-builder/src";
import styles from "../comp.module.sass";
import { hyperStyled } from "@macrostrat/hyper";
import { useUnitSectionContext } from "./index";

const h = hyperStyled(styles);

function SectionUnitCheckBox(props: {
  data: any;
  onChange: (e: number) => void;
}) {
  const onChange = (e: any) => {
    e.stopPropagation();
    props.onChange(props.data);
  };
  return h(Checkbox, { onChange });
}

function MergeDivideBtn(props: {
  onClick: () => void;
  disabled: boolean;
  text: string;
}) {
  return h(
    Button,
    {
      disabled: props.disabled,
      onClick: props.onClick,
    },
    [props.text]
  );
}

export interface ColBtnMenuI {
  toggleUnitsView?: () => void;
  toggleDrag: () => void;
  onSave: () => void;
  onCancel: () => void;
  state: {
    unitsView: boolean;
    drag: boolean;
    mergeIds: number[];
    moved: { [unit_id: number]: boolean };
  };
  mergeSections: () => void;
  noSectionView: boolean;
}

function ColumnPageBtnMenu(props: ColBtnMenuI) {
  const {
    state: { unitsView, drag, mergeIds, moved },
  } = props;
  return h("div", [
    //@ts-ignore
    h(ButtonGroup, [
      h(
        Button,
        {
          onClick: props.toggleUnitsView,
          intent: unitsView ? "primary" : "none",
          disabled: unitsView,
        },
        ["Unit view"]
      ),
      h.if(!props.noSectionView)(
        Button,
        {
          onClick: props.toggleUnitsView,
          intent: !unitsView ? "primary" : "none",
          disabled: !unitsView,
        },
        ["Section View"]
      ),
      h.if(!unitsView)(MergeDivideBtn, {
        onClick: props.mergeSections,
        disabled: mergeIds.length < 2,
        text: "Merge Sections",
      }),
    ]),
    h.if(unitsView)(ReorderUnitsBtnGrp, {
      drag,
      onClick: props.toggleDrag,
      moved,
      onSave: props.onSave,
      onCancel: props.onCancel,
    }),
  ]);
}

function ReorderUnitsBtnGrp(props: {
  drag: boolean;
  onClick: () => void;
  onCancel: () => void;
  onSave: () => void;
  moved: { [unit_id: number]: boolean };
}) {
  //@ts-ignore
  return h(ButtonGroup, { style: { marginLeft: "20px" } }, [
    h.if(!props.drag)(Button, { onClick: props.onClick }, ["Reorder Units"]),
    h.if(props.drag)(
      Button,
      {
        intent: "success",
        onClick: props.onSave,
        disabled: Object.keys(props.moved).length == 0,
      },
      ["Save"]
    ),
    h.if(props.drag)(Button, { intent: "danger", onClick: props.onCancel }, [
      "Cancel",
    ]),
  ]);
}

enum UNIT_ADD_POISITON {
  ABOVE = "above",
  BELOW = "below",
  EDIT = "edit",
}

export interface UnitRowContextMenuI {
  // either we are adding a new unit above, below or editing the current unit
  // or we are editing the unit inRow
  unit: UnitsView;
  unit_index: number;
  section_index: number;
  copyUnitUp: () => void;
  copyUnitDown: () => void;
  addEmptyUnit: (unit_index: number) => void;
  editUnitAt: (unit_index: number) => void;
}
function UnitRowContextMenu(props: UnitRowContextMenuI) {
  const { state, runAction } = useUnitSectionContext();
  const SubMenu = ({ pos }: { pos: UNIT_ADD_POISITON }) => {
    return h(React.Fragment, [
      h(MenuItem, {
        text: `Copy unit #${props.unit.id}`,
        icon: "duplicate",
        onClick: () => {
          if (pos == UNIT_ADD_POISITON.ABOVE) {
            props.copyUnitUp();
          } else props.copyUnitDown();
        },
      }),
      h(MenuItem, {
        text: `With empty unit`,
        icon: "new-object",
        onClick: () => {
          if (pos == UNIT_ADD_POISITON.ABOVE) {
            props.addEmptyUnit(props.unit_index);
          } else props.addEmptyUnit(props.unit_index + 1);
        },
      }),
    ]);
  };

  const ContextMenu = () =>
    h(Menu, [
      h(
        MenuItem,
        {
          text: "Add Unit Above",
          icon: "circle-arrow-up",
        },
        [h(SubMenu, { pos: UNIT_ADD_POISITON.ABOVE })]
      ),
      h(
        MenuItem,
        {
          text: "Add Unit Below",
          icon: "circle-arrow-down",
        },
        [h(SubMenu, { pos: UNIT_ADD_POISITON.BELOW })]
      ),
      h(MenuItem, {
        text: `Edit unit #${props.unit.id}`,
        icon: "annotation",
        onClick: () => props.editUnitAt(props.unit_index),
      }),
      h(MenuDivider),
      h(MenuItem, {
        text: `Delete unit #${props.unit.id}`,
        icon: "trash",
        intent: "danger",
        onClick: () =>
          runAction({
            type: "remove-unit",
            section_index: props.section_index,
            unit_index: props.unit_index,
          }),
      }),
    ]);

  return h(
    Popover2,
    {
      content: h(ContextMenu),
      minimal: true,
      position: "left-top",
    },
    [h(Button, { minimal: true, icon: "more" })]
  );
}

function AddBtnBetweenRows(props: {
  onClick: (e: any) => void;
  colSpan: number;
}) {
  const [style, setStyle] = useState({ display: "none" });
  return h("tr", [
    h("td", { colSpan: props.colSpan, style: { padding: 0 } }, [
      h(
        Tooltip2,
        {
          content: "add unit",
          fill: true,
          position: "right",
          intent: "success",
        },
        [
          h(
            "div.btwn-row-btn",
            {
              onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
                setStyle({ display: "flex" });
              },
              onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
                setStyle({ display: "none" });
              },
              onClick: props.onClick,
            },
            [
              h(Button, {
                intent: "success",
                fill: true,
                onClick: props.onClick,
                style: { ...style, minHeight: "5px" },
              }),
            ]
          ),
        ]
      ),
    ]),
  ]);
}

export {
  SectionUnitCheckBox,
  MergeDivideBtn,
  ColumnPageBtnMenu,
  AddBtnBetweenRows,
  UNIT_ADD_POISITON,
  UnitRowContextMenu,
};
