import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import Link from "next/link";
import { ReactChild } from "react";
import styles from "./comp.module.scss";

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
  const baseClass = "bp3-html-table .bp3-html-table-bordered";
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

export { Row, Table, FeatureCell, TableHeader };
