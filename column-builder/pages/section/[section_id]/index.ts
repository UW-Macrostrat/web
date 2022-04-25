import h from "@macrostrat/hyper";
import pg, {
  MergeDivideBtn,
  SectionUnitCheckBox,
  Row,
  UnitsView,
} from "../../../src";
import { BasePage, Table } from "../../../src";
import { GetServerSideProps } from "next";
import { MinEditorToggle } from "../../../src/components/unit/minimal-unit-editor";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { section_id },
  } = ctx;

  const { data, error } = await pg
    .from("unit_strat_name_expanded")
    .select()
    .order("position_bottom", { ascending: true })
    .match({ section_id: section_id });

  return { props: { section_id, units: data } };
};

const filterOrAddIds = (id: number, mergeIds: number[]): [] | number[] => {
  if (mergeIds.length == 0) {
    return [id];
  } else if (mergeIds.includes(id)) {
    return mergeIds.filter((i) => i != id);
  }
  return [id, ...mergeIds];
};

function Section(props: { section_id: string; units: UnitsView[] }) {
  const { section_id, units } = props;

  const [divideIds, setDivideIds] = useState<[] | number[]>([]);

  const onChange = (id: number) => {
    setDivideIds((prevIds: number[]) => {
      return filterOrAddIds(id, prevIds);
    });
  };
  const divideSection = () => {
    console.log("Dividing Section", divideIds);
  };

  const headers = [
    h(MergeDivideBtn, {
      text: "Divide section",
      onClick: divideSection,
      disabled: divideIds.length < 2,
    }),
    "ID",
    "Strat Name",
    "Bottom Interval",
    "Top Interval",
    "Color",
    "Thickness",
  ];

  return h(BasePage, { query: { section_id: parseInt(section_id) } }, [
    h("h3", [`Units in Section #${section_id}`]),
    //@ts-ignore
    h(MinEditorToggle, {
      persistChanges: (e, c) => console.log(e, c),
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
        units.map((unit, i) => {
          return h(
            Row,
            {
              key: i,
              href: `/unit/${unit.id}/edit`,
            },
            [
              h("td", { onClick: (e) => e.stopPropagation() }, [
                h(SectionUnitCheckBox, {
                  data: unit.id,
                  onChange: onChange,
                }),
              ]),
              h("td", [unit.id]),
              h("td", [
                unit.strat_name
                  ? `${unit.strat_name.strat_name} ${unit.strat_name.rank}`
                  : unit.unit_strat_name || "unnamed",
              ]),
              h("td", [unit.name_fo]),
              h("td", [unit.name_lo]),
              h("td", { style: { backgroundColor: unit.color } }, [unit.color]),
              h("td", [`${unit.min_thick} - ${unit.max_thick}`]),
            ]
          );
        }),
      ]),
    ]),
    //@ts-ignore
    h(MinEditorToggle, {
      persistChanges: (e, c) => console.log(e, c),
      btnText: "create new unit below",
    }),
  ]);
}

export default Section;
