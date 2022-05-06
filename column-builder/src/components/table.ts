import React, { useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import Link from "next/link";
import { ReactChild } from "react";
import styles from "./comp.module.scss";
import { UnitsView, ColSectionI } from "../types";
import { SectionUnitCheckBox } from "./column";
import {
  MinEditorToggle,
  MinUnitEditor,
  UnitLithHelperText,
  UnitRowContextMenu,
  UNIT_ADD_POISITON,
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
import { ColumnStateI } from "pages/column/reducer";
import { convertColorNameToHex } from "./helpers";
import { Card, Icon } from "@blueprintjs/core";

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

function UnitRowCellGroup(props: { unit: UnitsView }) {
  const { unit } = props;

  const backgroundColor = convertColorNameToHex(unit.color) + "80";
  return h(React.Fragment, [
    h("td", { width: "5%" }, [unit.id]),
    h("td", { style: { background: backgroundColor } }, [
      h("div", [
        unit.strat_name
          ? `${unit.strat_name.strat_name} ${unit.strat_name.rank}`
          : unit.unit_strat_name || "unnamed",
      ]),
      h(UnitLithHelperText, { lith_unit: unit.lith_unit }),
    ]),
    h("td", [
      unit.name_fo !== unit.name_lo
        ? `${unit.name_fo} - ${unit.name_lo}`
        : unit.name_lo,
    ]),
    h("td", [
      unit.min_thick != unit.max_thick
        ? `${unit.min_thick} - ${unit.max_thick}`
        : unit.min_thick,
    ]),
    h("td", { width: "0%" }, [unit.position_bottom]),
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
function ColUnitsTable(props: {
  state: ColumnStateI;
  onDragEnd: (r: DropResult) => void;
}) {
  const {
    state: { units, sections, drag },
  } = props;

  const originalIdOrder: number[] = Array.from(
    new Set<number>(units.map((unit) => unit.section_id))
  );

  let headers = ["ID", "Strat Name", "Interval", "Thickness", "Pos.(b)", ""];
  if (drag) headers = ["", ...headers];

  const onDragEnd = (result: DropResult) => {
    console.log(result);
    props.onDragEnd(result);
  };

  return h("div", [
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
            units_.map((unit, i) => {
              const [above, setAbove] = useState<boolean>(false);

              const [below, setBelow] = useState<boolean>(false);

              const triggerEditor = (e: UNIT_ADD_POISITON | number) => {
                console.log(e);
                if (e == UNIT_ADD_POISITON.UP) {
                  setAbove(true);
                } else if (e == UNIT_ADD_POISITON.DOWN) {
                  setBelow(true);
                }
              };

              const closeEditors = () => {
                setAbove(false);
                setBelow(false);
              };

              return h(React.Fragment, [
                h.if(above)("tr", [
                  h("td", { colSpan: headers.length }, [
                    h(MinUnitEditor, {
                      model: { unit: {}, liths: [], envs: [] },
                      persistChanges: (e, c) => {
                        console.log(e, c);
                        closeEditors();
                      },
                      onCancel: () => closeEditors(),
                    }),
                  ]),
                ]),
                h(
                  Row,
                  {
                    key: unit.id,
                    index: i + sections[id][0],
                    drag: props.state.drag,
                    draggableId: unit.unit_strat_name + unit.id.toString(),
                    href: undefined,
                  },
                  [
                    h(UnitRowCellGroup, { unit, key: i }),
                    h("td", { width: "0%" }, [
                      h(UnitRowContextMenu, { unit, triggerEditor }),
                    ]),
                  ]
                ),

                h.if(below)("tr", [
                  h("td", { colSpan: headers.length }, [
                    h(MinUnitEditor, {
                      model: { unit: {}, liths: [], envs: [] },
                      persistChanges: (e, c) => {
                        console.log(e, c);
                        closeEditors();
                      },
                      onCancel: () => closeEditors(),
                    }),
                  ]),
                ]),
              ]);
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
  ColUnitsTable,
};
