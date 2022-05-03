import h from "@macrostrat/hyper";
import pg, {
  MergeDivideBtn,
  SectionUnitCheckBox,
  Row,
  UnitsView,
  UnitRowCellGroup,
  PositionIncrementBtns,
} from "../../../src";
import { BasePage, Table } from "../../../src";
import { GetServerSideProps } from "next";
import { MinEditorToggle } from "../../../src/components/unit/minimal-unit-editor";
import { useReducer } from "react";
import { sectionReducer } from "./reducer";

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

  const onClickUp = (i: number) => {
    dispatch({
      type: "switch-positions",
      indexOne: i,
      indexTwo: i - 1,
    });
  };
  const onClickDown = (i: number) => {
    dispatch({
      type: "switch-positions",
      indexOne: i,
      indexTwo: i + 1,
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
    "Position (B)",
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
    h(Table, { interactive: true }, [
      h("thead", [
        h("tr", [
          headers.map((head, i) => {
            return h("th", { key: i }, [head]);
          }),
        ]),
      ]),
      h("tbody", [
        state.units.map((unit, i) => {
          let isFirst = i == 0;
          let isLast = i == state.units.length - 1;
          return h(
            Row,
            {
              key: i,
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
              h("td", { onClick: (e: any) => e.stopPropagation() }, [
                h(PositionIncrementBtns, {
                  position_bottom: unit.position_bottom,
                  onClickUp: () => onClickUp(i),
                  onClickDown: () => onClickDown(i),
                  isFirst,
                  isLast,
                }),
              ]),
            ]
          );
        }),
      ]),
    ]),
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
