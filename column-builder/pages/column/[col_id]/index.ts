import { useReducer } from "react";
import h from "@macrostrat/hyper";
import { GetServerSideProps } from "next";
import pg, {
  BasePage,
  EditButton,
  CreateButton,
  MergeDivideBtn,
  MinEditorToggle,
  UnitsView,
  ColSectionI,
  ColSectionsTable,
  ColUnitsTable,
  ColumnPageBtnMenu,
  UnitEditorModel,
} from "~/index";
import { calculateSecionUnitIndexs, columnReducer } from "../reducer";
import { DropResult } from "react-beautiful-dnd";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_id },
  } = ctx;

  const { data: d, error: e } = await pg.rpc("get_col_section_data", {
    column_id: col_id,
  });

  const { data: column, error: col_error } = await pg
    .from("cols")
    .select("col_name")
    .match({ id: col_id });

  const { data: units, error: unit_error } = await pg
    .from("unit_strat_name_expanded")
    .select(
      /// joins the lith_unit and environ_unit table
      "*,lith_unit!unit_liths_unit_id_fkey1(*),environ_unit!unit_environs_unit_id_fkey1(*)"
    )
    .order("position_bottom", { ascending: true })
    .match({ col_id: col_id });

  return { props: { col_id, colSections: d, column, units } };
};

export default function Columns(props: {
  col_id: string;
  colSections: ColSectionI[];
  units: UnitsView[];
  column: { col_name: string }[];
}) {
  const { col_id, colSections, column, units } = props;

  const unitIndexsBySection = calculateSecionUnitIndexs(units);

  const [state, dispatch] = useReducer(columnReducer, {
    units,
    sections: unitIndexsBySection,
    mergeIds: [],
    drag: false,
    unitsView: false,
  });

  const onChange = (id: number) => {
    dispatch({ type: "set-merge-ids", id });
  };
  const mergeSections = () => {
    dispatch({ type: "merge-ids" });
  };

  const onDragEnd = (r: DropResult) => {
    dispatch({ type: "dropped-unit", result: r });
  };

  const addUnitAt = (unit: Partial<UnitEditorModel>, index: number) => {
    /// callback for adding a unit in column at index i
    // should probably have a way to split the section as well..
    console.log("Adding At", unit, index);
    // dispatch({ type: "add-unit-at", index, unit });
  };

  const editUnitAt = (unit: Partial<UnitEditorModel>, index: number) => {
    /// callback for editing a unit
    // should probably have a way to split the section as well..
    console.log("Editing At", unit, index);
  };

  const headers = [
    h(MergeDivideBtn, {
      onClick: mergeSections,
      disabled: state.mergeIds.length < 2,
      text: "Merge",
    }),
    "Section number",
    "Top interval",
    "Bottom interval",
    "# of units",
  ];

  return h(BasePage, { query: { col_id: parseInt(col_id) } }, [
    h("h3", [
      `Sections for Column: ${column[0].col_name}`,
      h(EditButton, {
        href: `/column/${col_id}/edit`,
      }),
    ]),
    h(ColumnPageBtnMenu, {
      state: { unitsView: state.unitsView, drag: state.drag },
      toggleUnitsView: () => dispatch({ type: "toggle-units-view" }),
      toggleDrag: () => {
        dispatch({ type: "toggle-drag" });
      },
    }),
    h.if(colSections.length == 0)("div", [
      h("h3", [
        "Looks like there are no sections or units. To begin create a new unit",
      ]),
      h(CreateButton, {
        minimal: false,
        href: `/column/${col_id}/new/section-unit`,
        text: "Create Unit",
      }),
    ]),
    h.if(colSections.length > 0)("div", [
      //@ts-ignore
      h(MinEditorToggle, {
        btnText: "create new unit on top",
        persistChanges: (e, c) =>
          dispatch({ type: "add-unit-at", index: 0, unit: e }),
      }),
      h.if(!state.unitsView)(ColSectionsTable, {
        colSections,
        onChange,
        headers,
      }),
      h.if(state.unitsView)(ColUnitsTable, {
        state,
        onDragEnd,
        editUnitAt,
        addUnitAt,
      }),
      //@ts-ignore
      h(MinEditorToggle, {
        persistChanges: (e, c) =>
          dispatch({
            type: "add-unit-at",
            index: state.units.length + 1,
            unit: e,
          }),

        btnText: "create new unit on bottom",
      }),
    ]),
  ]);
}
