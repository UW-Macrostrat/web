import { hyperStyled } from "@macrostrat/hyper";
import { UnitsView } from "~/index";
import { DnDTable } from "../table";
import { UnitRow } from "./unit";
import { useUnitSectionContext } from "./table";
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
        const isEditing =
          edit.unit_index == j && edit.section_index == index && edit.open;

        // these ids here are meaningless... this action needs to be persisted
        const copyUnitDown = () => {
          props.addUnitAt({ ...unit, id: 67 }, j + 1);
        };
        const copyUnitUp = () => {
          props.addUnitAt({ ...unit, id: 66 }, j);
        };
        const addEmptyUnit = (unit_index: number) => {
          props.addUnitAt(getEmptyUnit(unit.col_id), unit_index);
        };
        const editUnitAt = (unit_index: number) => {
          props.editUnitAt(unit_index);
        };
        return h(UnitRow, {
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
