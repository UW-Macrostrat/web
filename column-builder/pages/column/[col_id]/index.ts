import { useState } from "react";
import h from "@macrostrat/hyper";
import { GetServerSideProps } from "next";
import pg, {
  BasePage,
  Table,
  EditButton,
  CreateButton,
  TableHeader,
  SectionUnitCheckBox,
  MergeDivideBtn,
  AddButton,
  filterOrAddIds,
  MinEditorToggle,
  Row,
} from "../../../src";

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

  return { props: { col_id, colSections: d, column } };
};

interface ColSectionI {
  id: number;
  unit_count: number;
  top: string;
  bottom: string;
}

export default function ColumnGroup(props: {
  col_id: string;
  colSections: ColSectionI[];
  column: { col_name: string }[];
}) {
  const { col_id, colSections, column } = props;
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
    "section number",
    "top",
    "bottom",
    "# of units",
  ];

  return h(BasePage, { query: { col_id: parseInt(col_id) } }, [
    h("h3", [
      `Sections for Column: ${column[0].col_name}`,
      h(EditButton, {
        href: `/column/${col_id}/edit`,
      }),
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
        btnText: "create new section above with new unit",
        persistChanges: (e, c) => console.log(e, c),
      }),
      h(Table, { interactive: true }, [
        h(TableHeader, { headers }),
        h("tbody", [
          colSections.map((section, i) => {
            return h(
              Row,
              {
                href: `/section/${section.id}`,
                key: i,
              },
              [
                h("td", { onClick: (e) => e.stopPropagation() }, [
                  h(SectionUnitCheckBox, {
                    data: section.id,
                    onChange: onChange,
                  }),
                ]),
                h("td", [section.id]),
                h("td", [section.top]),
                h("td", [section.bottom]),
                h("td", [
                  h(
                    "a",
                    { href: `/section/${section.id}` },
                    `view ${section.unit_count} units`
                  ),
                ]),
              ]
            );
          }),
        ]),
      ]),
      //@ts-ignore
      h(MinEditorToggle, {
        persistChanges: (e, c) => console.log(e, c),
        btnText: "create new section below with new unit",
      }),
    ]),
  ]);
}
