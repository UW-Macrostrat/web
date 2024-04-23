import React, { forwardRef, memo, useEffect } from "react";

import { Cell, EditableCell2Props } from "@blueprintjs/table";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

interface EditableCellProps extends EditableCell2Props {
  columnName: string;
  rowIndex: number;
  edited: boolean;
  onPaste: (e) => Promise<boolean>;
  onCopy: (e) => Promise<boolean>;
  setValue: (value: any) => void;
  value: string;
}

const _EditableCell = (props: EditableCellProps) => {
  const { value, setValue, style, ...rest } = props;
  return h(
    Cell,
    { ...rest, style: { ...style, padding: 0 }, truncated: false },
    [
      h(
        "input",
        {
          disabled: props.editableTextProps.disabled,
          className: "editable-cell",
          style: {
            width: (value?.length ?? 2) + "ch",
            //backgroundColor: "#ffffff",
          },
          value: value || "",
          onChange: (e) => {
            setValue(e.target.value);
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
          onClick: (e) => {
            e.target.select();
          },
          onFocus: (e) => {
            e.target.select();
            e.preventDefault();
            e.stopPropagation();
          },
          onBlur: (e) => {
            if (value != props.value) {
              props.onConfirm(value);
            }
          },
        },
        []
      ),
    ]
  );
};

export const EditableCell = memo(_EditableCell);
