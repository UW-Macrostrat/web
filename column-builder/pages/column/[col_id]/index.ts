import { useState } from "react";
import h from "@macrostrat/hyper";
import { GetServerSideProps } from "next";
import pg, {
  BasePage,
  Table,
  EditButton,
  CreateButton,
  TableHeader,
  ColumnSectionCheckBox,
  MergeSectionsBtn,
  AddButton,
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

const filterOrAddIds = (id: number, mergeIds: number[]): [] | number[] => {
  if (mergeIds.length == 0) {
    return [id];
  } else if (mergeIds.includes(id)) {
    return mergeIds.filter((i) => i != id);
  }
  return [id, ...mergeIds];
};

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
    h(MergeSectionsBtn, {
      onClick: mergeSections,
      disabled: mergeIds.length < 2,
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
      h(AddButton, { onClick: () => {} }, ["add section above"]),
      h(Table, { interactive: false }, [
        h(TableHeader, { headers }),
        h("tbody", [
          colSections.map((section, i) => {
            return h(
              "tr",
              {
                key: i,
              },
              [
                h("td", [
                  h(ColumnSectionCheckBox, {
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
      h(AddButton, { onClick: () => {} }, ["add section below"]),
      // h(CreateButton, {
      //   minimal: false,
      //   href: `/column/${col_id}/new/section-unit`,
      //   text: "Create Unit in new Section",
      // }),
    ]),
  ]);
}
