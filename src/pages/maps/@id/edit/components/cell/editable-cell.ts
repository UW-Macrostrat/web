import React from 'react';

import {EditableCell2, EditableCell2Props} from "@blueprintjs/table";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { getTableUpdate } from "~/pages/maps/@id/edit/table-util";

export const h = hyper.styled(styles);


interface EditableCell extends EditableCell2Props {
  columnName: string,
  rowIndex: number
}

export const EditableCell = ({...props}: EditableCell2Props) => {

  return h(EditableCell2, {...props});
}
