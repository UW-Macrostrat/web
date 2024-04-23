import React, { forwardRef, memo, useEffect, useMemo } from "react";

import { Button } from "@blueprintjs/core";
import { Cell, EditableCell2Props } from "@blueprintjs/table";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

interface CheckboxCell extends Omit<EditableCell2Props, "value" | "onConfirm"> {
  value: boolean | undefined;
  rowIndex: number;
  edited: boolean;
  onConfirm: (value: boolean) => void;
}

let CheckboxCell = forwardRef((props: CheckboxCell, ref) => {
  const [value, setValue] = React.useState<boolean | undefined>(props.value);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  const text = useMemo(() => {
    // Check if value is a string
    if (value == undefined) {
      return "Multiple";
    } else {
      return value ? "Omit" : "Use";
    }
  }, [value]);

  const intent = useMemo(() => {
    if (value == undefined) {
      return "warning";
    } else {
      return value ? "danger" : "success";
    }
  }, [value]);

  return h(
    Cell,
    { ...props, style: { ...props.style, padding: 0 }, truncated: false },
    [
      h(
        Button,
        {
          ref: ref,
          className: "editable-cell",
          text: text,
          intent: intent,
          onClick: (e) => {
            props.onConfirm(!value);
          },
          onFocus: (e) => {
            e.preventDefault();
            e.stopPropagation();
          },
        },
        []
      ),
    ]
  );
});

CheckboxCell = memo(CheckboxCell);

export default CheckboxCell;
