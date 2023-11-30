import React from 'react';

import {Cell} from "@blueprintjs/table";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

export const h = hyper.styled(styles);


export const BasicCell = (...props) => {
  return h(Cell, {...props});
}