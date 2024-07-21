import h from "@macrostrat/hyper";
import { useContext } from "react";
import { useColumnData } from "./provider";
import { DetritalGroup } from "./detrital";

import { ColumnContext, NotesColumn } from "@macrostrat/column-components";
//import {INote} from '@macrostrat/column-components/src/notes/index.d.ts'

interface UnitNamesProps {
  left?: number;
  nameForDivision(object): string;
}

const NoteComponent = props => {
  const { note, division, measurement } = props;
  let text = note.note;
  /*if (note.measurement != null) {
    return h(DetritalGroup, {data: note.measurement})
  }*/

  return h("p.col-note-label", text);
};

const UnitNamesColumn = (props: UnitNamesProps) => {
  const { left, nameForDivision, ...rest } = props;
  const { divisions } = useContext(ColumnContext);

  const notes: INote[] = divisions.map((div, i) => {
    return {
      height: div.b_age,
      top_height: div.t_age,
      note: nameForDivision(div),
      division: div,
      //measurement: dz?.get(div.unit_id)
      id: i
    };
  });

  return h(NotesColumn, {
    transform: `translate(${left || 0})`,
    editable: false,
    noteComponent: NoteComponent,
    notes,
    forceOptions: {
      nodeSpacing: 1
    },
    ...rest
  });
};

UnitNamesColumn.defaultProps = {
  nameForDivision: div => {
    return div.unit_name
      .replace("Mbr", "Member")
      .replace("Fm", "Formation")
      .replace("Gp", "Group");
  }
};

export default UnitNamesColumn;
