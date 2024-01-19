import React, { forwardRef, useEffect } from "react";

import {Cell, EditableCell2Props} from "@blueprintjs/table";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { getTableUpdate } from "~/pages/maps/@id/edit/table-util";

export const h = hyper.styled(styles);


interface EditableCell extends EditableCell2Props {
  columnName: string,
  rowIndex: number
}

export const EditableCell = forwardRef((props: EditableCell2Props, ref) => {

  const [value, setValue] = React.useState(props.value);

  useEffect(() => {
    setValue(props.value)
  }, [props.value])

  return h(Cell,
    {...props,
      style: {...props.style, padding: 0},
      truncated: false
    },
    [
      h("input", {
        ref: ref,
        className: "editable-cell",
        style: {
          width: (value?.length ?? 2) + "ch"
        },
        value: value || "",
        onChange: (e) => {
          setValue(e.target.value)
          e.target.style.width = (e.target.value.length + 8) + "ch"
          console.log(e.target.value.length)
        },
        onClick: (e) => {
          e.target.select()
        },
        onFocus: (e) => {
          console.log("Focus")
          e.target.select()
          e.target.select()
          e.target.select()
          e.target.select()
          e.preventDefault()
          e.stopPropagation()

        },
        onBlur: (e) => {
          if(value != props.value) {
            props.onConfirm(value)
          }
        }
      }, [])
    ]
  )
})
