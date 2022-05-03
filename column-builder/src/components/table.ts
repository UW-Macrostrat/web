import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import Link from "next/link";
import { ReactChild } from "react";
import styles from "./comp.module.scss";
import { UnitsView, ColSectionI } from "../types";
import { SectionUnitCheckBox } from "./column";
import { UnitLithHelperText } from "./unit";

const h = hyperStyled(styles);

interface RowProps {
  children: ReactChild;
  href: string;
}

function Row(props: RowProps) {
  return h(Link, { href: props.href }, [
    h("tr", { onClick: (e: MouseEvent) => e.stopPropagation() }, [
      props.children,
    ]),
  ]);
}

interface FeatureCellI {
  text: string;
  children: ReactChild;
  colSpan?: number;
}

function FeatureCell(props: FeatureCellI) {
  return h(React.Fragment, [
    h("td", [h("h4.strat-name", [props.text])]),
    h("td", { colSpan: props.colSpan }, [props.children]),
  ]);
}

interface TableProps {
  interactive: boolean;
  children: ReactChild;
}

function Table(props: TableProps) {
  const baseClass =
    "bp3-html-table .bp3-html-table-condensed .bp3-html-table-bordered";
  let tableClassName = props.interactive
    ? `${baseClass} .bp3-interactive`
    : baseClass;

  return h("div.table-container", [
    h(`table.${tableClassName}`, { style: { width: "100%" } }, [
      props.children,
    ]),
  ]);
}

function TableHeader(props: { headers: any[] }) {
  return h("thead", [
    h("tr", [
      props.headers.map((head, i) => {
        return h("th", { key: i }, [head]);
      }),
    ]),
  ]);
}

function UnitRowCellGroup(props: { unit: UnitsView }) {
  const { unit } = props;

  return h(React.Fragment, [
    h("td", [unit.id]),
    h("td", [
      h("div", [
        unit.strat_name
          ? `${unit.strat_name.strat_name} ${unit.strat_name.rank}`
          : unit.unit_strat_name || "unnamed",
      ]),
      h(UnitLithHelperText, { lith_unit: unit.lith_unit }),
    ]),
    h("td", [unit.name_fo]),
    h("td", [unit.name_lo]),
    h("td", { style: { backgroundColor: unit.color } }, [unit.color]),
    h("td", [`${unit.min_thick} - ${unit.max_thick}`]),
  ]);
}

function ColSectionsTable(props: {
  headers: any[];
  colSections: ColSectionI[];
  onChange: (id: number) => void;
}) {
  const { headers, colSections, onChange } = props;
  return h(Table, { interactive: true }, [
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
    ]),
  ]);
}

function ColUnitsTable(props: { units: UnitsView[] }) {
  const { units } = props;

  const colUnitsBySections: { [section_id: number]: UnitsView[] } = {};
  units.map((unit) => {
    if (unit.section_id in colUnitsBySections) {
      colUnitsBySections[unit.section_id] = [
        ...colUnitsBySections[unit.section_id],
        unit,
      ];
    } else {
      colUnitsBySections[unit.section_id] = [unit];
    }
  });

  const originalIdOrder: number[] = Array.from(
    new Set<number>(units.map((unit) => unit.section_id))
  );

  console.log(originalIdOrder, colUnitsBySections);

  const headers = [
    "ID",
    "Strat Name",
    "Bottom Interval",
    "Top Interval",
    "Color",
    "Thickness",
  ];

  return h(Table, { interactive: true }, [
    h(TableHeader, { headers }),
    h("tbody", [
      originalIdOrder.map((id, i) => {
        let units_ = colUnitsBySections[id];
        return h(React.Fragment, [
          h("tr", [
            h(
              "td",
              {
                colSpan: 6,
                style: { background: "#C5CBD3", textAlign: "center" },
              },
              ["Section #", id]
            ),
          ]),
          units_.map((unit, i) => {
            return h(
              Row,
              {
                key: i,
                href: `/unit/${unit.id}/edit`,
              },
              [h(UnitRowCellGroup, { unit, key: i })]
            );
          }),
        ]);
      }),
    ]),
  ]);
}

export {
  Row,
  Table,
  FeatureCell,
  TableHeader,
  UnitRowCellGroup,
  ColSectionsTable,
  ColUnitsTable,
};
