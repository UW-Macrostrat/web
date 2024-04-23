import React, { forwardRef, memo, useEffect } from "react";

import { Cell, EditableCell2Props } from "@blueprintjs/table";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

interface EditableCell extends EditableCell2Props {
  columnName: string;
  rowIndex: number;
  edited: boolean;
  onPaste: (e) => Promise<boolean>;
  onCopy: (e) => Promise<boolean>;
}

const _EditableCell = forwardRef((props: EditableCell, ref) => {
  const [value, setValue] = React.useState(props.value);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  ref.value = value;

  return h(
    Cell,
    { ...props, style: { ...props.style, padding: 0 }, truncated: false },
    [
      h(
        "input",
        {
          ref: ref,
          disabled: props.editableTextProps.disabled,
          className: "editable-cell",
          style: {
            width: (value?.length ?? 2) + "ch",
            color: "inherit",
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
            e.target.select();
            e.target.select();
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
});

export const EditableCell = memo(_EditableCell);
