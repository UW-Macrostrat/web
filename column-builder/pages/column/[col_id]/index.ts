import h from "@macrostrat/hyper";
import { GetServerSideProps } from "next";
import pg, {
  IColumnSection,
  Row,
  BasePage,
  Table,
  EditButton,
  CreateButton,
} from "../../../src";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_id },
  } = ctx;
  const { data, error } = await pg
    .from("col_sections")
    .select()
    .match({ col_id });

  const colSections = data ? data : [{}];
  return { props: { col_id, colSections } };
};

/* 
Creates section arrays by finding the lowest posistion_bottom and highest
position_bottom. Sets a bottom and top strat_name based on this 
sorting. 
*/
function dataPreProcess(colSections: IColumnSection[]) {
  const col_name = colSections[0]["col_name"];
  let data: any = {};
  /* 
  Create a unique object for each section
  and calculate the highest and lowest strat_name
  */
  colSections.forEach((col) => {
    const { section_id, position_bottom, top, bottom } = col;
    if (!data[section_id]) {
      data[section_id] = {
        section_id,
        lowest: position_bottom,
        highest: position_bottom,
        top,
        bottom,
        units: 1,
      };
    } else {
      if (data[section_id]["lowest"] < position_bottom) {
        // replace bottom and lowest
        data[section_id]["lowest"] = position_bottom;
        data[section_id]["bottom"] = bottom;
      } else if (data[section_id]["highest"] > position_bottom) {
        // replace top
        data[section_id]["highest"] = position_bottom;
        data[section_id]["top"] = top;
      }
      data[section_id]["units"]++;
    }
  });
  console.log("data", data);
  data = Object.values(data).map((section: any) => {
    delete section["lowest"];
    delete section["highest"];
    return section;
  });
  return { data, col_name };
}

interface SectionI {
  top: string;
  bottom: string;
  units: number;
  section_id: number;
}

export default function ColumnGroup(props: {
  col_id: string;
  colSections: IColumnSection[];
}) {
  const { col_id } = props;
  const { data, col_name }: { data: SectionI[]; col_name: string } =
    dataPreProcess(props.colSections);

  const headers = Object.keys(data[0]);

  let section_data = data.filter((d) => d.section_id != null);

  return h(BasePage, { query: { col_id: parseInt(col_id) } }, [
    h("h3", [
      `Sections for Column: ${col_name}`,
      h(EditButton, {
        href: `/column/${col_id}/edit`,
      }),
    ]),
    h.if(section_data.length == 0)("div", [
      h("h3", [
        "Looks like there are no sections or units. To begin create a new unit",
      ]),
      h(CreateButton, {
        minimal: false,
        href: `/column/${col_id}/new/section-unit`,
        text: "Create Unit",
      }),
    ]),
    h.if(section_data.length > 0)("div", [
      h(Table, { interactive: true }, [
        h("thead", [
          h("tr", [
            headers.map((head, i) => {
              return h("th", { key: i }, [head]);
            }),
          ]),
        ]),
        h("tbody", [
          section_data.map((section, i) => {
            return h(
              Row,
              {
                key: i,
                href: `/section/${section.section_id}`,
              },
              [
                h("td", [section.section_id]),
                h("td", [section.top]),
                h("td", [section.bottom]),
                h("td", [h("a", `view ${section.units} units`)]),
              ]
            );
          }),
        ]),
      ]),
      h(CreateButton, {
        minimal: false,
        href: `/column/${col_id}/new/section-unit`,
        text: "Create Unit in new Section",
      }),
    ]),
  ]);
}
