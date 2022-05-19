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
import { UnitsView } from "~/index";
import styles from "../comp.module.scss";
import { hyperStyled } from "@macrostrat/hyper";

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
  state: {
    unitsView: boolean;
    drag: boolean;
    divideIds: number[];
    mergeIds: number[];
  };
  divideSection: () => void;
  mergeSections: () => void;
  noSectionView: boolean;
}

function ColumnPageBtnMenu(props: ColBtnMenuI) {
  const {
    state: { unitsView, drag, divideIds, mergeIds },
  } = props;
  //@ts-ignore
  return h(ButtonGroup, [
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
    h(Button, { onClick: props.toggleDrag, disabled: !unitsView }, [
      drag ? "Disable drag" : "Enable drag",
    ]),
    h.if(!unitsView)(MergeDivideBtn, {
      onClick: props.mergeSections,
      disabled: mergeIds.length < 2,
      text: "Merge Sections",
    }),
    h.if(unitsView)(MergeDivideBtn, {
      text: "Divide section",
      onClick: props.divideSection,
      disabled: divideIds.length < 1,
    }),
  ]);
}

enum UNIT_ADD_POISITON {
  ABOVE = "above",
  BELOW = "below",
  EDIT = "edit",
}

export interface UnitRowContextMenuI {
  // either we are adding a new unit above, below or editing the current unit
  triggerEditor: (
    e: UNIT_ADD_POISITON,
    unit_index: number,
    section_index: number,
    copy: boolean
  ) => void;
  unit: UnitsView;
  unit_index: number;
  section_index: number;
}
function UnitRowContextMenu(props: UnitRowContextMenuI) {
  const SubMenu = ({ pos }: { pos: UNIT_ADD_POISITON }) => {
    return h(React.Fragment, [
      h(MenuItem, {
        text: `Copy unit #${props.unit.id}`,
        icon: "duplicate",
        onClick: () =>
          props.triggerEditor(pos, props.unit_index, props.section_index, true),
      }),
      h(MenuItem, {
        text: `With empty unit`,
        icon: "new-object",
        onClick: () =>
          props.triggerEditor(
            pos,
            props.unit_index,
            props.section_index,
            false
          ),
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
        onClick: () =>
          props.triggerEditor(
            UNIT_ADD_POISITON.EDIT,
            props.unit_index,
            props.section_index,
            true
          ),
      }),
      h(MenuDivider),
      h(MenuItem, {
        text: `Delete unit #${props.unit.id}`,
        icon: "trash",
        intent: "danger",
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

function AddBtnBetweenRows(props: { onClick: () => void; colSpan: number }) {
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
                console.log("Enter");
                setStyle({ display: "flex" });
              },
              onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
                console.log("Leave");
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

interface EditModeI {
  mode: UNIT_ADD_POISITON;
  copy: boolean;
}

const useRowUnitEditor = () => {
  const [editOpen, setEditOpen] = useState(false);
  const [unit_index, setUnitIndex] = useState(0);
  const [section_index, setSectionIndex] = useState(0);
  const [editMode, setEditMode] = useState<EditModeI>({
    mode: UNIT_ADD_POISITON.EDIT,
    copy: true,
  });

  const triggerEditor = (
    e: UNIT_ADD_POISITON,
    unit_index: number,
    section_index: number,
    copy: boolean
  ) => {
    setUnitIndex(unit_index);
    setSectionIndex(section_index);
    setEditMode({ mode: e, copy });
    setEditOpen(true);
  };

  const onCancel = () => {
    setEditOpen(false);
  };

  const rowBorderStyles = !editOpen
    ? {}
    : editMode.mode == "edit"
    ? { background: "#0F996040" }
    : editMode.mode == "above"
    ? { borderTop: "solid #0F9960 3px" }
    : { borderBottom: "solid #0F9960 3px" };

  return {
    triggerEditor,
    unit_index,
    section_index,
    editOpen,
    styles: rowBorderStyles,
    editMode,
    onCancel,
  };
};

export {
  SectionUnitCheckBox,
  MergeDivideBtn,
  ColumnPageBtnMenu,
  AddBtnBetweenRows,
  useRowUnitEditor,
  UNIT_ADD_POISITON,
  UnitRowContextMenu,
};
