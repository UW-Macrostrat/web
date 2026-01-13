import { hyperStyled } from "@macrostrat/hyper";
import { UnitsView } from "@macrostrat-web/column-builder/src";
import { DnDTable } from "../table";
import { UnitRow } from "./unit";
import { useUnitSectionContext } from "./table";
import { AddBtnBetweenRows } from "./helpers";
import styles from "../comp.module.sass";

const h = hyperStyled(styles);

const getEmptyUnit = (col_id: number) => {
  let emptyUnit: UnitsView = {
    id: "new",
    strat_name: "unnamed",
    strat_names: [],
    lith_unit: [],
    environ_unit: [],
    color: "#fffff",
    col_id,
    name_fo: "",
    age_bottom: 0,
    name_lo: "",
    age_top: 0,
  };
  return emptyUnit;
};

interface SectionTableProps {
  index: number;
  section: { [section_id: number | string]: UnitsView[] };
  drag: boolean;
  moved: { [unit_id: number]: boolean };
  addUnitAt: (unit: UnitsView, unit_index: number) => void;
  editUnitAt: (unit_index: number) => void;
}

function SectionTable(props: SectionTableProps) {
  const { index, drag } = props;
  const { state, runAction } = useUnitSectionContext();
  const { edit } = state;

  let headers = [
    "ID",
    "Unit Name",
    "Strat Name",
    "Liths",
    "Envs",
    "Interval",
    "Thickness",
    "notes",
    "",
  ];
  let widths = [7, 15, 15, 15, 15, 10, 8, 10, 5];
  if (drag) {
    headers = ["", ...headers];
    widths = [5, 5, 15, 15, 15, 10, 10, 10, 10, 5];
  }

  const units: UnitsView[] = Object.values(props.section)[0];
  const id = Object.keys(props.section)[0];

  return h(
    DnDTable,
    {
      index,
      interactive: false,
      headers,
      widths,
      title: `Section ${id}`,
      draggableId: `${id} ${index}`,
      drag,
      droppableId: index.toString() + " " + id.toString(),
    },

    [
      h.if(units.length == 0)(AddBtnBetweenRows, {
        colSpan: headers.length,
        onClick: (e) => {
          e.stopPropagation();
          props.addUnitAt(getEmptyUnit(state.col_id), 0);
        },
      }),
      units.map((unit, j) => {
        const isEditing =
          edit.unit_index == j && edit.section_index == index && edit.open;

        // these ids here are meaningless... this action needs to be persisted
        const copyUnitDown = () => {
          props.addUnitAt({ ...unit, id: "new" }, j + 1);
        };
        const copyUnitUp = () => {
          props.addUnitAt({ ...unit, id: "new" }, j);
        };
        const addEmptyUnit = (unit_index: number) => {
          props.addUnitAt(getEmptyUnit(unit.col_id), unit_index);
        };
        const editUnitAt = (unit_index: number) => {
          console.log("editing unit at", unit_index);
          props.editUnitAt(unit_index);
        };
        return h(UnitRow, {
          key: unit.id,
          unit,
          drag,
          unit_index: j,
          section_index: index,
          colSpan: headers.length,
          isMoved: unit.id in props.moved,
          inRowEditing: isEditing,
          copyUnitDown,
          copyUnitUp,
          addEmptyUnit,
          editUnitAt,
        });
      }),
    ]
  );
}

export { SectionTable };
