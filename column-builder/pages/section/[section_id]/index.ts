import h from "@macrostrat/hyper";
import pg, { UnitsView, ColumnPageBtnMenu } from "~/index";
import { BasePage, ColSecUnitsTable } from "~/index";
import { GetServerSideProps } from "next";
import { MinEditorToggle } from "~/components/unit/minimal-unit-editor";
import { useReducer } from "react";
import { sectionReducer } from "./reducer";
import { DropResult } from "react-beautiful-dnd";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { section_id },
  } = ctx;

  const { data, error } = await pg
    .from("unit_strat_name_expanded")
    .select(
      "*,lith_unit!unit_liths_unit_id_fkey1(*),environ_unit!unit_environs_unit_id_fkey1(*)"
    )
    .order("position_bottom", { ascending: true })
    .match({ section_id: section_id });

  return { props: { section_id, units: data } };
};

function Section(props: { section_id: string; units: UnitsView[] }) {
  const { section_id, units } = props;
  const [state, dispatch] = useReducer(sectionReducer, {
    units,
    divideIds: [],
    drag: false,
    sections: { [parseInt(section_id)]: [0, units.length - 1] },
  });

  const onClickDivideCheckBox = (id: number) => {
    dispatch({ type: "set-divide-ids", id });
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    console.log(result);
    if (!destination) return;
    dispatch({
      type: "switch-positions",
      source: source.index,
      destination: destination.index,
    });
  };

  const divideSection = () => {
    console.log("Dividing Section", state.divideIds);
  };

  return h(BasePage, { query: { section_id: parseInt(section_id) } }, [
    h("h3", [`Units in Section #${section_id}`]),
    h(ColumnPageBtnMenu, {
      state: {
        unitsView: true,
        drag: state.drag,
        divideIds: state.divideIds,
        mergeIds: [],
      },
      toggleDrag: () => {
        dispatch({ type: "toggle-drag" });
      },
      divideSection: divideSection,
      mergeSections: () => {},
    }),
    //@ts-ignore
    h(MinEditorToggle, {
      persistChanges: (e, c) => {
        console.log(e, c);
        dispatch({ type: "add-unit-top", unit: e });
      },
      btnText: "create new unit above",
    }),
    h(ColSecUnitsTable, {
      state,
      onDragEnd,
      addUnitAt: () => {},
      onClickDivideCheckBox,
      editUnitAt: () => {},
    }),
    //@ts-ignore
    h(MinEditorToggle, {
      persistChanges: (e, c) => {
        console.log(e, c);
        dispatch({ type: "add-unit-bottom", unit: e });
      },
      btnText: "create new unit below",
    }),
  ]);
}

export default Section;
