import { hyperStyled } from "@macrostrat/hyper";
import styles from "../comp.module.scss";
import { ColSectionI } from "~/types";
import { Table, Row } from "../table";
import { SectionUnitCheckBox } from "../unit-section-table/helpers";

const h = hyperStyled(styles);

function ColSectionsTable(props: {
  colSections: ColSectionI[];
  onChange: (id: number) => void;
}) {
  const { colSections, onChange } = props;
  const headers = [
    "",
    "Section number",
    "Top interval",
    "Bottom interval",
    "# of units",
  ];
  return h(Table, { interactive: true, headers }, [
    colSections.map((section, i) => {
      return h(
        Row,
        {
          href: `/section/${section.id}`,
          key: i,
        },
        [
          h(
            "td",
            {
              onClick: (e: React.MouseEvent<HTMLTableCellElement>) =>
                e.stopPropagation(),
            },
            [
              h(SectionUnitCheckBox, {
                data: section.id,
                onChange: onChange,
              }),
            ]
          ),
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
  ]);
}

export { ColSectionsTable };
