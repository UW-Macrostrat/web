import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import Link from "next/link";
import { ReactChild } from "react";
import styles from "./comp.module.scss";
import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
  DroppableProvided,
  DropResult,
} from "react-beautiful-dnd";
import { Card, Icon, Button } from "@blueprintjs/core";

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

function Row(props: { href: string; children: ReactChild }) {
  return h(RowWrapper, { link: props.href }, [h("tr", [props.children])]);
}

function DraggableRow(props: RowProps) {
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
              h.if(drag)(
                "td",
                {
                  ...provided.dragHandleProps,
                  width: "2%",
                  style: { verticalAlign: "middle" },
                },
                [h(Icon, { icon: "drag-handle-vertical" })]
              ),
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
  headers?: any[];
  title?: string;
}

function Table(props: TableProps) {
  const { headers = [] } = props;
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
        h("tbody", [props.children]),
      ]
    ),
  ]);
}

interface DnDTableProps {
  interactive: boolean;
  children: ReactChild;
  drag?: boolean;
  headers?: any[];
  droppableId?: string;
  draggableId?: string;
  title?: string;
  index: number;
}

function DnDTable(props: DnDTableProps) {
  const { drag = false, headers = [], droppableId = "table-drop-zone" } = props;
  const baseClass =
    "bp4-html-table .bp4-html-table-condensed .bp4-html-table-bordered .base-table";
  let tableClassName = props.interactive
    ? `${baseClass} .bp4-interactive`
    : baseClass;

  return h(
    Draggable,
    {
      key: props.index,
      index: props.index,
      isDragDisabled: !drag,
      draggableId: props.draggableId ?? "",
    },
    [
      (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
        return h(
          `table.${tableClassName}`,
          {
            ref: provided.innerRef,
            ...provided.draggableProps,
          },
          [
            h.if(headers.length > 0)(TableHeader, {
              dragProps: provided.dragHandleProps,
              headers: headers,
              title: props.title,
            }),
            h(TableBody, { drag, droppableId }, [props.children]),
          ]
        );
      },
    ]
  );
}

function TableBody(props: {
  children: ReactChild;
  drag?: boolean;
  droppableId?: string;
}) {
  const { drag = false, droppableId = "table-drop" } = props;
  return h(
    Droppable,
    { droppableId: droppableId, isDropDisabled: !drag, type: "table-body" },
    [
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
    ]
  );
}

function TableHeader(props: {
  headers: any[];
  title?: string;
  dragProps?: any;
}) {
  return h("thead", [
    h.if(typeof props.title !== "undefined")("tr", [
      h(
        "th",
        {
          ...props.dragProps,
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

export { Row, Table, DnDTable, FeatureCell, TableHeader, DraggableRow };
