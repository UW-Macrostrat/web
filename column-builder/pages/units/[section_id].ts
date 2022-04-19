import h from "@macrostrat/hyper";
import pg, { usePostgrest, Row, UnitsView, CreateButton } from "../../src";
import { BasePage, Table } from "../../src";
import { Spinner, Button } from "@blueprintjs/core";
import { GetServerSideProps } from "next";

function Units({ section_id }: { section_id: string }) {
  const units: UnitsView[] = usePostgrest(
    pg
      .from("units_view")
      .select()
      .order("age_top", { ascending: true })
      .match({ section_id: section_id })
  );

  const headers = [
    "ID",
    "Strat Name",
    "Bottom Interval",
    "Top Interval",
    "Color",
    "Thickness",
  ];

  if (!units) return h(Spinner);
  return h(BasePage, { query: { section_id: parseInt(section_id) } }, [
    h("h3", [
      "Units",
      h(CreateButton, {
        href: `/units/new/${section_id}?col_id=${units[0].col_id}`,
        text: "Add new unit",
      }),
    ]),
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
              href: `/units/edit/${unit.id}`,
            },
            [
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
  ]);
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return { props: { section_id: ctx.query.section_id } };
};

export default Units;
