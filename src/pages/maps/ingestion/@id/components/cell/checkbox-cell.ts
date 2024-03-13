import React, { forwardRef, memo, useEffect } from "react";

import { Button } from "@blueprintjs/core";
import { Cell, EditableCell2Props } from "@blueprintjs/table";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

export const h = hyper.styled(styles);

interface CheckboxCell extends Omit<EditableCell2Props, "value" | "onConfirm"> {
  value: boolean;
  rowIndex: number;
  edited: boolean;
  onConfirm: (value: boolean) => void;
}

let CheckboxCell = forwardRef((props: CheckboxCell, ref) => {
  const [value, setValue] = React.useState<boolean>(props.value);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  return h(
    Cell,
    { ...props, style: { ...props.style, padding: 0 }, truncated: false },
    [
      h(
        Button,
        {
          ref: ref,
          className: "editable-cell",
          text: value ? "Omit" : "Use",
          intent: value ? "danger" : "success",
          onClick: (e) => {
            props.onConfirm(!value);
          },
          onFocus: (e) => {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        []
      ),
    ]
  );
});

CheckboxCell = memo(CheckboxCell);

export default CheckboxCell;
