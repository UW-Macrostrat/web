import { hyperStyled } from "@macrostrat/hyper";
import { UnitEditorModel, UnitsView } from "~/index";
import { DnDTable } from "../table";
import { UNIT_ADD_POISITON, EditModeI } from "./helpers";
import { UnitRow } from "./unit";
import styles from "~/components/comp.module.scss";

const h = hyperStyled(styles);

interface SectionTableProps {
  index: number;
  section: { [section_id: number | string]: UnitsView[] };
  drag: boolean;
  unit_index: number;
  section_index: number;
  editMode: EditModeI;
  editOpen: boolean;
  triggerEditor: (
    u: UNIT_ADD_POISITON,
    unit_index: number,
    section_number: number,
    copy: boolean
  ) => void;
  onCancel: () => void;
  dialogTitle: string;
  editingModel: { unit: any };
  persistChanges: (e: UnitEditorModel, c: Partial<UnitEditorModel>) => void;
  moved: { [unit_id: number]: boolean };
}

function SectionTable(props: SectionTableProps) {
  const {
    index,
    drag,
    section_index,
    unit_index,
    editMode,
    editOpen,
    triggerEditor,
    onCancel,
    editingModel,
    dialogTitle,
  } = props;

  let headers = ["", "ID", "Strat Name", "Interval", "Thickness", ""];
  if (drag) headers = ["", ...headers];

  const units: UnitsView[] = Object.values(props.section)[0];
  const id = Object.keys(props.section)[0];
  return h(
    DnDTable,
    {
      index,
      interactive: false,
      headers,
      title: `Section #${id}`,
      draggableId: `${id} ${index}`,
      drag,
      droppableId: index.toString() + " " + id.toString(),
    },
    [
      units.map((unit, j) => {
        const isEditing = unit_index == j && section_index == index && editOpen;
        const openBottom = isEditing && editMode.mode === "below";
        const openTop = isEditing && editMode.mode !== "below";

        const cellStyles =
          isEditing && editMode.mode == "edit"
            ? { background: "#0F996040" }
            : {};

        return h(UnitRow, {
          drag,
          unit,
          isMoved: unit.id in props.moved,
          unit_index: j,
          section_index: index,
          triggerEditor,
          onCancel,
          dialogTitle,
          editingModel,
          openBottom,
          openTop,
          styles: cellStyles,
          colSpan: headers.length,
          persistChanges: props.persistChanges,
          onClickCheckBox: props.onClickCheckBox,
        });
      }),
    ]
  );
}

export { SectionTable };
