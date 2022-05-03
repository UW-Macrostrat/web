import { useState } from "react";
import h from "@macrostrat/hyper";
import { GetServerSideProps } from "next";
import pg, {
  BasePage,
  EditButton,
  CreateButton,
  MergeDivideBtn,
  filterOrAddIds,
  MinEditorToggle,
  UnitsView,
  ColSectionI,
  ColSectionsTable,
  ColUnitsTable,
} from "../../../src";
import { Button } from "@blueprintjs/core";

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
    .select("*,lith_unit!unit_liths_unit_id_fkey1(lith)")
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

  const [unitView, setUnitView] = useState<boolean>(false);
  const [mergeIds, setMergeIds] = useState<[] | number[]>([]);

  const onChange = (id: number) => {
    setMergeIds((prevMergeIds: number[]) => {
      return filterOrAddIds(id, prevMergeIds);
    });
  };
  const mergeSections = () => {
    console.log("Merging Sections", mergeIds);
  };

  const headers = [
    h(MergeDivideBtn, {
      onClick: mergeSections,
      disabled: mergeIds.length < 2,
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
    h(Button, { onClick: () => setUnitView(!unitView) }, [
      unitView ? "Section view" : "Unit view",
    ]),
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
        btnText: "create new unit",
        persistChanges: (e, c) => console.log(e, c),
      }),
      h.if(!unitView)(ColSectionsTable, { colSections, onChange, headers }),
      h.if(unitView)(ColUnitsTable, { units }),
      //@ts-ignore
      h(MinEditorToggle, {
        persistChanges: (e, c) => console.log(e, c),
        btnText: "create new unit",
      }),
    ]),
  ]);
}
