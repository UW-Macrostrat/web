import {Button, MenuItem} from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { Select2, ItemRenderer, ItemPredicate } from "@blueprintjs/select";
import {EditableCell2Props, EditableCell2, Cell} from "@blueprintjs/table";
import React, {useEffect, useMemo} from "react";

// @ts-ignore
import hyper from "@macrostrat/hyper";

import "@blueprintjs/core/lib/css/blueprint.css"
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";
import styles from "../../edit-table.module.sass";


const h = hyper.styled(styles);

const LongTextCell = ({value, onConfirm, intent, ...props} : EditableCell2Props) => {

  const [localValue, setLocalValue] = React.useState(value == null ? "" : value.toString());

  return h(Cell, {
    ...props,
    style: {...props.style, padding: 0},
  }, [
    h(Popover2,
      {
        interactionKind: "click",
        placement: "bottom-start",
        minimal: true,
        content: h("div", {style: {padding: ""}}, [
          h("textarea", {
            autoFocus: true,
            onFocus: (e) => {
              e.target.select()
            },
            rows: (localValue.match(/\n/g) || []).length + 2,
            style: {width: "100%", height: "100%", border: "0", padding: "5px", marginBottom: "-5px"},
            value: localValue,
            onWheelCapture: (event) => event.stopPropagation(),
            onKeyDown: (e) => {
              if(e.key == "Enter"){
                setLocalValue(localValue + "\n")
              }
            },
            onChange: (e) => {
              console.log(e.target.value)
              setLocalValue(e.target.value)
            }
          })
        ]),
        onClose: () => {
          onConfirm(localValue)
        },
        renderTarget: ({isOpen, ref, ...targetProps }) => h(Button, {
          ...targetProps,
          elementRef: ref,
          style: {backgroundColor: "white", fontSize: "12px", minHeight: "0px", padding: "1.7px 10px", boxShadow: "none"},
          fill: true,
          alignText: "left",
          text: h("span", {style: {overflow: "hidden", textOverflow: "ellipses"}}, localValue),
          className: "update-input-group",
          placeholder: "Select A Filter"
        }, [])
      }

    )
  ])
}


export default LongTextCell;
