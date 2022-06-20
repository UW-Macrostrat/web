import { hyperStyled } from "@macrostrat/hyper";
import { UnitEditorModel, UnitsView } from "~/index";
import { DnDTable } from "../table";
import { UNIT_ADD_POISITON } from "./helpers";
import { UnitRow } from "./unit";
import styles from "~/components/comp.module.scss";

const h = hyperStyled(styles);

const getEmptyUnit = (col_id: number) => {
  let emptyUnit: UnitsView = {
    id: 66,
    unit_strat_name: "unnamed",
    strat_names: null,
    lith_unit: [],
    environ_unit: [],
    color: "#fffff",
    col_id,
  };
  return emptyUnit;
};

interface SectionTableProps {
  index: number;
  section: { [section_id: number | string]: UnitsView[] };
  drag: boolean;
  unit_index: number;
  section_index: number;
  editOpen: boolean;
  triggerEditor: (
    u: UNIT_ADD_POISITON,
    unit_index: number,
    section_number: number,
    copy: boolean
  ) => void;
  onCancel: () => void;
  dialogTitle: string;
  persistChanges: (e: UnitEditorModel, c: Partial<UnitEditorModel>) => void;
  moved: { [unit_id: number]: boolean };
  addUnitAt: (unit: UnitEditorModel, unit_index: number) => void;
}

function SectionTable(props: SectionTableProps) {
  const {
    index,
    drag,
    section_index,
    unit_index,
    editOpen,
    triggerEditor,
    onCancel,
    dialogTitle,
  } = props;

  let headers = [
    "ID",
    "Strat Name",
    "Liths",
    "Envs",
    "Interval",
    "Thickness",
    "notes",
    "",
  ];
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
        const inRowEditing = isEditing;

        // these ids here are meaningless... this action needs to be persisted
        const copyUnitDown = () => {
          props.addUnitAt({ unit: { ...unit, id: 67 } }, j + 1);
        };
        const copyUnitUp = () => {
          props.addUnitAt({ unit: { ...unit, id: 66 } }, j);
        };
        const addUnitUp = () => {
          props.addUnitAt({ unit: getEmptyUnit(unit.col_id) }, j);
        };
        const addUnitDown = () => {
          props.addUnitAt({ unit: getEmptyUnit(unit.col_id) }, j + 1);
        };

        return h(UnitRow, {
          unit,
          drag,
          unit_index: j,
          section_index: index,
          triggerEditor,
          onCancel,
          dialogTitle,
          persistChanges: props.persistChanges,
          colSpan: headers.length,
          isMoved: unit.id in props.moved,
          inRowEditing,
          copyUnitDown,
          copyUnitUp,
          addUnitUp,
          addUnitDown,
        });
      }),
    ]
  );
}

export { SectionTable };
