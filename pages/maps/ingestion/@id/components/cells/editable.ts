import React, { forwardRef, memo, useEffect } from "react";

import { Cell, EditableCell2Props } from "@blueprintjs/table";

import h from "../../hyper";
import classNames from "classnames";

interface EditableCellProps extends EditableCell2Props {
  columnName: string;
  rowIndex: number;
  edited: boolean;
  onPaste: (e) => Promise<boolean>;
  onCopy: (e) => Promise<boolean>;
  onConfirm: (value: any) => void;
  value: string;
}

const _EditableCell = forwardRef((props: EditableCellProps, ref) => {
  const { style, disabled, ...rest } = props;

  // Keep an optimistic value so that the ui is responsive in case of slow onConfirm
  const [optimisticValue, setOptimisticValue] = React.useState(props.value);
  useEffect(() => {
    setOptimisticValue(props.value);
  }, [props.value]);

  return h(
    Cell,
    { ...rest, style: { ...style, padding: 0 }, truncated: false },
    [
      h(
        "input",
        {
          ref,
          disabled: disabled ?? props?.editableTextProps?.disabled,
          className: classNames("editable-cell", { disabled }),
          style: {
            width: (props.value?.length ?? 2) + "ch",
            color: "inherit", // Necessary so changed cells have the correct color text
          },
          value: optimisticValue || "",
          onChange: (e) => {
            setOptimisticValue(e.target.value);
            props.onConfirm(e.target.value);
            e.target.style.width = e.target.value.length + 8 + "ch";
          },
          onPaste: async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await props.onPaste(e);
          },
          onCopy: async (e) => {
            await props.onCopy(e);
          },
          onDoubleClick: (e) => {
            e.target.select();
          },
          onFocus: (e) => {
            e.preventDefault();
            e.stopPropagation();
          },
          onBlur: (e) => {
            props.onConfirm(e.target.value);
          },
        },
        []
      ),
    ]
  );
});

export const EditableCell = memo(_EditableCell);
