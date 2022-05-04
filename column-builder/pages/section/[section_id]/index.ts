import h from "@macrostrat/hyper";
import pg, {
  MergeDivideBtn,
  SectionUnitCheckBox,
  Row,
  UnitsView,
  UnitRowCellGroup,
} from "~/index";
import { BasePage, Table } from "../../../src";
import { GetServerSideProps } from "next";
import { MinEditorToggle } from "../../../src/components/unit/minimal-unit-editor";
import { useReducer } from "react";
import { sectionReducer } from "./reducer";
import { DropResult } from "react-beautiful-dnd";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { section_id },
  } = ctx;

  const { data, error } = await pg
    .from("unit_strat_name_expanded")
    .select("*,lith_unit!unit_liths_unit_id_fkey1(lith)")
    .order("position_bottom", { ascending: true })
    .match({ section_id: section_id });

  return { props: { section_id, units: data } };
};

function Section(props: { section_id: string; units: UnitsView[] }) {
  const { section_id, units } = props;
  const [state, dispatch] = useReducer(sectionReducer, {
    units,
    divideIds: [],
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

  const headers = [
    h(MergeDivideBtn, {
      text: "Divide section",
      onClick: divideSection,
      disabled: state.divideIds.length < 1,
    }),
    "ID",
    "Strat Name",
    "Bottom Interval",
    "Top Interval",
    "Color",
    "Thickness",
    "Pos.(B)",
  ];
  return h(BasePage, { query: { section_id: parseInt(section_id) } }, [
    h("h3", [`Units in Section #${section_id}`]),
    //@ts-ignore
    h(MinEditorToggle, {
      persistChanges: (e, c) => {
        console.log(e, c);
        dispatch({ type: "add-unit-top", unit: e });
      },
      btnText: "create new unit above",
    }),
    h(
      Table,
      {
        interactive: true,
        headers,
        drag: true,
        onDragEnd,
        droppableId: "section_table",
      },
      [
        state.units.map((unit, i) => {
          return h(
            Row,
            {
              key: unit.id,
              index: i,
              drag: true,
              draggableId: unit.unit_strat_name + unit.id.toString(),
              href: `/unit/${unit.id}/edit`,
            },
            [
              h("td", { onClick: (e: any) => e.stopPropagation() }, [
                h(SectionUnitCheckBox, {
                  data: unit.id,
                  onChange: onClickDivideCheckBox,
                }),
              ]),
              h(UnitRowCellGroup, { unit }),
            ]
          );
        }),
      ]
    ),
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
