import React, { useCallback } from "react";
import { ReactChild } from "react";
import h from "./comp.module.sass";
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
  DroppableProvided,
} from "react-beautiful-dnd";
import { Card, Icon } from "@blueprintjs/core";
import { useNavigate } from "../components";

interface RowProps {
  children: ReactChild;
  draggableId?: string;
  index: number;
  href?: string;
  drag?: boolean;
  isMoved?: boolean;
  onDoubleClick?: () => void;
}

const routePrefix = "/dev/column-editor";

const getItemStyle = (isDragging: boolean, draggableStyle: any) => ({
  display: isDragging ? "table" : "",
  ...draggableStyle,
});

const RowWrapper = (props: {
  link: string | undefined;
  children: ReactChild;
}) => {
  const { link, children } = props;

  return children;
  // TODO: row links break things, now that links are not ephemeral items
  /*
  if (typeof link === "undefined") {
    return h(React.Fragment, [children]);
  } else {
    return h(Link, { href: link }, [children]);
  }
   */
};

function Row(props: { href: string; children: ReactChild }) {
  const { href, children } = props;
  const navigate = useNavigate();

  const onClick = useCallback(
    (evt) => {
      navigate(href);
    },
    [href]
  );

  return h("tr", { onClick }, children);
}

function DraggableRow(props: RowProps) {
  const {
    draggableId = "",
    drag = false,
    onDoubleClick = () => console.log("double clicked!"),
    href,
    isMoved,
  } = props;

  const className = isMoved ? "unit-moved" : null;

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
        return h(
          `tr`,
          {
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              if (e.detail == 2) {
                onDoubleClick();
                if (href != null) {
                  navigate(href);
                }
              }
            },
            className,
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
        );
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
    "bp5-html-table .bp5-html-table-condensed .bp5-html-table-bordered";
  let className = props.interactive
    ? `${baseClass} .bp5-interactive`
    : baseClass;

  return h(Card, { className: "table-container" }, [
    h(`table`, { style: { width: "100%", tableLayout: "auto" }, className }, [
      h.if(headers.length > 0)(TableHeader, {
        headers: headers,
        title: props.title,
      }),
      h("tbody", [props.children]),
    ]),
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
  widths?: number[];
}

function DnDTable(props: DnDTableProps) {
  const {
    drag = false,
    headers = [],
    widths,
    droppableId = "table-drop-zone",
  } = props;
  const baseClass =
    "bp5-html-table .bp5-html-table-condensed .bp5-html-table-bordered .base-table .full-width";
  let tableClassName = props.interactive
    ? `${baseClass} .bp5-interactive`
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
              widths,
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
  widths?: number[];
  title?: string;
  dragProps?: any;
}) {
  return h(React.Fragment, [
    h.if(props.title != null)("thead", [
      h("tr.table-header-row", [
        h(
          "th.table-header",
          {
            ...props.dragProps,
            colSpan: props.headers.length,
          },
          [props.title]
        ),
      ]),
    ]),
    h("colgroup", [
      props.widths?.map((width, i) => {
        return h("col", {
          key: i,
          width: `${typeof width != "undefined" ? width : ""}%`,
        });
      }),
    ]),
    h("thead", [
      h("tr", [
        props.headers.map((head, i) => {
          return h(
            "th",
            {
              key: i,
            },
            [head]
          );
        }),
      ]),
    ]),
  ]);
}

export { Row, Table, DnDTable, FeatureCell, TableHeader, DraggableRow };
