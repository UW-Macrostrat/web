import { Button, Popover } from "@blueprintjs/core";
import { Cell, EditableCell2Props } from "@blueprintjs/table";
import React, { forwardRef, useEffect } from "react";

import h from "../../hyper";

const LongTextCell = forwardRef((props: EditableCell2Props, forwardRef) => {
  const { value, onConfirm } = props;

  const [localValue, setLocalValue] = React.useState(
    value == null ? "" : value.toString()
  );

  useEffect(() => {
    setLocalValue(value == null ? "" : value.toString());
  }, [value]);

  return h(
    Cell,
    {
      ...props,
      style: { ...props.style, padding: 0 },
    },
    [
      h(Popover, {
        interactionKind: "click",
        placement: "bottom-start",
        minimal: true,
        content: h("div", { style: { padding: "" } }, [
          h("textarea", {
            autoFocus: true,
            onFocus: (e) => {
              e.target.select();
            },
            rows: (localValue.match(/\n/g) || []).length + 2,
            style: {
              width: "100%",
              height: "100%",
              border: "0",
              padding: "5px",
              marginBottom: "-5px",
            },
            value: localValue,
            onWheelCapture: (event) => event.stopPropagation(),
            onKeyDown: (e) => {
              if (e.key == "Enter") {
                setLocalValue(localValue + "\n");
              }
            },
            onChange: (e) => {
              setLocalValue(e.target.value);
              e.preventDefault();
            },
          }),
        ]),
        onClose: () => {
          onConfirm(localValue);
        },
        renderTarget: ({ isOpen, ref, ...targetProps }) =>
          h(
            Button,
            {
              ...targetProps,
              onDoubleClick: (e) => {
                targetProps.onClick(e);
                e.stopPropagation();
              },
              onClick: (e) => {
                e.stopPropagation();
              },
              elementRef: (el) => {
                ref(el);
                forwardRef(el);
              },
              style: {
                backgroundColor: "white",
                fontSize: "12px",
                minHeight: "0px",
                padding: "1.7px 10px",
                boxShadow: "none",
              },
              fill: true,
              alignText: "left",
              text: h(
                "span",
                { style: { overflow: "hidden", textOverflow: "ellipses" } },
                localValue
              ),
              className: "update-input-group",
              placeholder: "Select A Filter",
            },
            []
          ),
      }),
    ]
  );
});

export { LongTextCell };
