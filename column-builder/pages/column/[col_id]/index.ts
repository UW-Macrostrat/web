import React, { useReducer } from "react";
import h from "@macrostrat/hyper";
import { GetServerSideProps } from "next";
import pg, {
  BasePage,
  EditButton,
  createUnitBySections,
  MinEditorToggle,
  UnitsView,
  ColSectionI,
  ColSectionsTable,
  ColSecUnitsTable,
  ColumnPageBtnMenu,
  UnitEditorModel,
  getIdHierarchy,
  QueryI,
} from "~/index";
import { columnReducer } from "~/components/column/reducer";
import { DropResult } from "react-beautiful-dnd";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_id },
  } = ctx;

  const { data: d, error: e } = await pg.rpc("get_col_section_data", {
    column_id: col_id,
  });

  const query = await getIdHierarchy({ col_id });

  const { data: column, error: col_error } = await pg
    .from("cols")
    .select("col_name")
    .match({ id: col_id });

  const { data: units, error: unit_error } = await pg
    .from("unit_strat_name_expanded")
    .select(
      /// joins the lith_unit and environ_unit table
      "*,lith_unit!unit_liths_unit_id_fkey(*),environ_unit!unit_environs_unit_id_fkey(*)"
    )
    .order("position_bottom", { ascending: true })
    .match({ col_id: col_id });

  const sections = createUnitBySections(units);
  return {
    props: {
      col_id,
      colSections: d,
      column,
      unit_error,
      query,
      sections,
    },
  };
};

export default function Columns(props: {
  col_id: string;
  colSections: ColSectionI[];
  column: { col_name: string }[];
  unit_error: any;
  query: QueryI;
  sections: { [section_id: number | string]: UnitsView[] }[];
}) {
  const { col_id, colSections, column, query } = props;

  const [state, dispatch] = useReducer(columnReducer, {
    sections: props.sections,
    mergeIds: [],
    divideIds: [],
    drag: false,
    unitsView: true,
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

  const addUnitAt = (
    unit: UnitEditorModel,
    section_index: number,
    unit_index: number
  ) => {
    /// callback for adding a unit in column at index i
    // should probably have a way to split the section as well..
    console.log("Adding At", unit, section_index, unit, unit_index);
    dispatch({
      type: "add-unit-at",
      section_index,
      unit,
      unit_index,
    });
  };

  const editUnitAt = (
    unit: UnitEditorModel,
    section_index: number,
    unit_index: number
  ) => {
    /// callback for editing a unit
    // should probably have a way to split the section as well..
    console.log("Editing At", section_index, unit, unit_index);
    dispatch({
      type: "edit-unit-at",
      section_index,
      unit,
      unit_index,
    });
  };

  const headers = [
    "",
    "Section number",
    "Top interval",
    "Bottom interval",
    "# of units",
  ];

  return h(BasePage, { query }, [
    h("h3", [
      `Sections for Column: ${column[0].col_name}`,
      h(EditButton, {
        href: `/column/${col_id}/edit`,
      }),
    ]),
    h(ColumnPageBtnMenu, {
      state: {
        unitsView: state.unitsView,
        drag: state.drag,
        divideIds: state.divideIds,
        mergeIds: state.mergeIds,
      },
      toggleUnitsView: () => dispatch({ type: "toggle-units-view" }),
      toggleDrag: () => {
        dispatch({ type: "toggle-drag" });
      },
      divideSection: () => {},
      mergeSections: () => {},
    }),
    h.if(colSections.length > 0 && !state.unitsView)(ColSectionsTable, {
      colSections,
      onChange,
      headers,
    }),
    h.if(state.sections.length > 0 && state.unitsView)("div", [
      //@ts-ignore
      h(MinEditorToggle, {
        btnText: "create new unit on top",
        persistChanges: (e, c) =>
          dispatch({
            type: "add-unit-at",
            section_index: 0,
            unit: e,
            unit_index: 0,
          }),
      }),
      h(ColSecUnitsTable, {
        onClickDivideCheckBox: (id: number) =>
          dispatch({ type: "set-divide-ids", id }),
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
            section_index: state.sections.length - 1,
            // an annoying way to get the index of the last unit in last section
            unit_index: Object.values(
              state.sections[state.sections.length - 1]
            )[0].length,
            unit: e,
          }),

        btnText: "create new unit on bottom",
      }),
    ]),
  ]);
}
