import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import Link from "next/link";
import { ReactChild } from "react";
import styles from "./comp.module.scss";
import { UnitsView, ColSectionI } from "../types";
import { SectionUnitCheckBox } from "./column";
import {
  MinEditorDialog,
  UnitEditorModel,
  UnitLithHelperText,
  UnitRowContextMenu,
  useRowUnitEditor,
} from "./unit";
import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
  DroppableProvided,
  DropResult,
} from "react-beautiful-dnd";
import { ColumnStateI } from "~/components/column/reducer";
import { convertColorNameToHex } from "./helpers";
import { Card, Icon } from "@blueprintjs/core";
import { SectionStateI } from "~/components/section/reducer";

const h = hyperStyled(styles);

interface RowProps {
  children: ReactChild;
  draggableId?: string;
  index: number;
  href?: string;
  drag?: boolean;
}

const getItemStyle = (isDragging: boolean, draggableStyle: any) => ({
  display: isDragging ? "table" : "",
  ...draggableStyle,
});

const RowWrapper = (props: {
  link: string | undefined;
  children: ReactChild;
}) => {
  const { link, children } = props;
  if (typeof link === "undefined") {
    return h(React.Fragment, [children]);
  } else {
    return h(Link, { href: link }, [children]);
  }
};

function Row(props: RowProps) {
  const { draggableId = "", drag = false } = props;
  return h(
    Draggable,
    {
      key: props.index,
      index: props.index,
      isDragDisabled: !drag,
      draggableId,
    },
    [
      (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
        return h(RowWrapper, { link: props.href }, [
          h(
            "tr",
            {
              onClick: (e: MouseEvent) => e.stopPropagation(),
              ref: provided.innerRef,
              ...provided.draggableProps,
              style: getItemStyle(
                snapshot.isDragging,
                provided.draggableProps.style
              ),
            },
            [
              h.if(drag)("td", { ...provided.dragHandleProps, width: "2%" }, [
                h(Icon, { icon: "drag-handle-vertical" }),
              ]),
              props.children,
            ]
          ),
        ]);
      },
    ]
  );
}

interface FeatureCellI {
  text: string;
  children: ReactChild;
  colSpan?: number;
}

function FeatureCell(props: FeatureCellI) {
  return h(React.Fragment, [
    h("td", [h("h4.strat-name", [props.text])]),
    h("td", { colSpan: props.colSpan }, [props.children]),
  ]);
}

interface TableProps {
  interactive: boolean;
  children: ReactChild;
  drag?: boolean;
  onDragEnd?: (result: DropResult) => void;
  headers?: any[];
  droppableId?: string;
  title?: string;
  externalDragContext?: boolean;
}

function Table(props: TableProps) {
  const {
    drag = false,
    onDragEnd = (result) => console.log(result),
    headers = [],
    droppableId = "table-drop-zone",
    externalDragContext = false,
  } = props;
  const baseClass =
    "bp4-html-table .bp4-html-table-condensed .bp4-html-table-bordered";
  let tableClassName = props.interactive
    ? `${baseClass} .bp4-interactive`
    : baseClass;

  return h(Card, { className: "table-container" }, [
    h(
      `table.${tableClassName}`,
      { style: { width: "100%", tableLayout: "auto" } },
      [
        h.if(headers.length > 0)(TableHeader, {
          headers: headers,
          title: props.title,
        }),
        h.if(!externalDragContext)(DragDropContext, { onDragEnd: onDragEnd }, [
          h(TableBody, { drag, droppableId }, [props.children]),
        ]),
        h.if(externalDragContext)(TableBody, { drag, droppableId }, [
          props.children,
        ]),
      ]
    ),
  ]);
}

function TableBody(props: {
  children: ReactChild;
  drag?: boolean;
  droppableId?: string;
}) {
  const { drag = false, droppableId = "table-drop" } = props;
  return h(Droppable, { droppableId: droppableId, isDropDisabled: !drag }, [
    (provided: DroppableProvided) => {
      return h(
        "tbody",
        {
          ...provided.droppableProps,
          ref: provided.innerRef,
        },
        [props.children, provided.placeholder]
      );
    },
  ]);
}

function TableHeader(props: { headers: any[]; title?: string }) {
  return h("thead", [
    h.if(typeof props.title !== "undefined")("tr", [
      h(
        "th",
        {
          colSpan: props.headers.length,
          style: { textAlign: "center", backgroundColor: "#D3D8DE" },
        },
        [props.title]
      ),
    ]),
    h("tr", [
      props.headers.map((head, i) => {
        return h("th", { key: i }, [head]);
      }),
    ]),
  ]);
}

function UnitRowCellGroup(props: {
  unit: UnitsView;
  cellStyles: object;
  onClickDivideCheckBox: (id: number) => void;
}) {
  const { unit, cellStyles } = props;

  const backgroundColor = convertColorNameToHex(unit.color) + "80";
  return h(React.Fragment, [
    h(
      "td",
      { onClick: (e: any) => e.stopPropagation(), style: { width: "0%" } },
      [
        h(SectionUnitCheckBox, {
          data: unit.id,
          onChange: props.onClickDivideCheckBox,
        }),
      ]
    ),
    h("td", { width: "0%", style: { ...cellStyles } }, [
      h(Link, { href: `/unit/${unit.id}/edit` }, [h("a", [unit.id])]),
    ]),
    h(
      "td",
      { width: "50%", style: { background: backgroundColor, ...cellStyles } },
      [
        h("div", [
          unit.strat_name
            ? `${unit.strat_name.strat_name} ${unit.strat_name.rank}`
            : unit.unit_strat_name || "unnamed",
        ]),
        h(UnitLithHelperText, { lith_unit: unit?.lith_unit ?? [] }),
      ]
    ),
    h("td", { style: { ...cellStyles, width: "50%" } }, [
      unit.name_fo !== unit.name_lo
        ? `${unit.name_fo} - ${unit.name_lo}`
        : unit.name_lo,
    ]),
    h("td", { style: { ...cellStyles } }, [
      unit.min_thick != unit.max_thick
        ? `${unit.min_thick} - ${unit.max_thick}`
        : unit.min_thick,
    ]),
    h("td", { width: "0%", style: { ...cellStyles } }, [unit.position_bottom]),
  ]);
}

function ColSectionsTable(props: {
  headers: any[];
  colSections: ColSectionI[];
  onChange: (id: number) => void;
}) {
  const { headers, colSections, onChange } = props;
  return h(Table, { interactive: true, headers }, [
    colSections.map((section, i) => {
      return h(
        Row,
        {
          href: `/section/${section.id}`,
          key: i,
          draggableId: section.id.toString() + " " + section.bottom,
          index: i,
        },
        [
          h(
            "td",
            {
              onClick: (e: React.MouseEvent<HTMLTableCellElement>) =>
                e.stopPropagation(),
            },
            [
              h(SectionUnitCheckBox, {
                data: section.id,
                onChange: onChange,
              }),
            ]
          ),
          h("td", [section.id]),
          h("td", [section.top]),
          h("td", [section.bottom]),
          h("td", [
            h(
              "a",
              { href: `/section/${section.id}` },
              `view ${section.unit_count} units`
            ),
          ]),
        ]
      );
    }),
  ]);
}

/* 
This needs to internally handle context options of... create new unit above, below, edit current, 
copying unit up or down. The differences just position the unit editor above or below, the model,
and the persistChanges function --> some dispatch to the reducer.

State will be this object of section_ids as keys and a list of the respective units.
Or do we only keep track of the indices of the units that below to section, that way
that state is still holding a list of units.. easier for handling state.
*/
function ColSecUnitsTable(props: {
  state: ColumnStateI | SectionStateI;
  onDragEnd: (r: DropResult) => void;
  onClickDivideCheckBox: (id: number) => void;
  addUnitAt: (u: UnitEditorModel, index: number) => void;
  editUnitAt: (u: UnitEditorModel, index: number) => void;
}) {
  const {
    state: { units, sections, drag },
  } = props;
  const { editOpen, triggerEditor, styles, onCancel, index, editMode } =
    useRowUnitEditor();

  const originalIdOrder: number[] = Array.from(
    new Set<number>(units.map((unit) => unit.section_id))
  );

  let headers = [
    "",
    "ID",
    "Strat Name",
    "Interval",
    "Thickness",
    "Pos.(b)",
    "",
  ];
  if (drag) headers = ["", ...headers];

  const onDragEnd = (result: DropResult) => {
    console.log(result);
    props.onDragEnd(result);
  };

  const diaglogTitle =
    editMode.mode == "edit"
      ? `Edit unit #${units[index].id}`
      : `Add unit ${editMode.mode} unit #${units[index].id}`;

  const persistChanges = (e: UnitEditorModel, c: Partial<UnitEditorModel>) => {
    if (editMode.mode == "edit") {
      props.editUnitAt(e, index);
    } else {
      let i = index;
      if (editMode.mode == "below") {
        i++;
      }
      props.addUnitAt(e, i);
    }
  };

  const editingModel =
    editMode.mode == "edit" || editMode.copy
      ? {
          unit: units[index],
        }
      : { unit: { lith_unit: [], environ_unit: [] } };

  return h("div", [
    h(MinEditorDialog, {
      title: diaglogTitle,
      persistChanges,
      open: editOpen,
      model: editingModel,
      onCancel,
    }),
    h(DragDropContext, { onDragEnd }, [
      originalIdOrder.map((id, i) => {
        let units_ = units.slice(sections[id][0], sections[id][1] + 1);
        return h(
          Table,
          {
            key: i,
            interactive: false,
            headers,
            title: `Section #${id}`,
            drag: props.state.drag,
            droppableId: id.toString(),
            externalDragContext: true,
          },
          [
            units_.map((unit, j) => {
              let cellStyles = index == j + sections[id][0] ? styles : {};
              return h(
                Row,
                {
                  key: unit.id,
                  index: j + sections[id][0],
                  drag: props.state.drag,
                  draggableId: unit.unit_strat_name + unit.id.toString(),
                  href: undefined,
                },
                [
                  h(UnitRowCellGroup, {
                    onClickDivideCheckBox: props.onClickDivideCheckBox,
                    unit,
                    key: j,
                    cellStyles,
                  }),
                  h("td", { width: "0%", style: { ...cellStyles } }, [
                    h(UnitRowContextMenu, {
                      unit,
                      index: j + sections[id][0],
                      triggerEditor: triggerEditor,
                    }),
                  ]),
                ]
              );
            }),
          ]
        );
      }),
    ]),
  ]);
}

export {
  Row,
  Table,
  FeatureCell,
  TableHeader,
  UnitRowCellGroup,
  ColSectionsTable,
  ColSecUnitsTable,
};
