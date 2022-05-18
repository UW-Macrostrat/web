import h from "@macrostrat/hyper";
import pg, {
  UnitsView,
  ColumnPageBtnMenu,
  getIdHierarchy,
  QueryI,
  UnitEditorModel,
} from "~/index";
import { BasePage, ColSecUnitsTable } from "~/index";
import { GetServerSideProps } from "next";
import { MinEditorToggle } from "~/components/unit/minimal-unit-editor";
import { useReducer } from "react";
import { sectionReducer } from "~/components/section/reducer";
import { DropResult } from "react-beautiful-dnd";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { section_id },
  } = ctx;

  const { data, error } = await pg
    .from("unit_strat_name_expanded")
    .select(
      "*,lith_unit!unit_liths_unit_id_fkey(*),environ_unit!unit_environs_unit_id_fkey(*)"
    )
    .order("position_bottom", { ascending: true })
    .match({ section_id: section_id });

  const query: QueryI = await getIdHierarchy({ section_id });

  return { props: { section_id, units: data, query } };
};

function Section(props: {
  section_id: string;
  units: UnitsView[];
  query: QueryI;
}) {
  const { section_id, units } = props;
  const [state, dispatch] = useReducer(sectionReducer, {
    section_id: parseInt(section_id),
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

  const addUnitAt = (unit: UnitEditorModel, index: number) => {
    dispatch({ type: "add-unit-at", index, unit });
  };
  const editUnitAt = (unit: UnitEditorModel, index: number) => {
    dispatch({ type: "edit-unit-at", index, unit });
  };
  const divideSection = () => {
    console.log("Dividing Section", state.divideIds);
  };

  return h(BasePage, { query: props.query }, [
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
      addUnitAt,
      onClickDivideCheckBox,
      editUnitAt,
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
