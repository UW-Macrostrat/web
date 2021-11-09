import h from "@macrostrat/hyper";
import { ExpansionPanel } from "./ExpansionPanel";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import { Typography } from "@material-ui/core";
import { addCommas } from "~/map-interface/utils";

function RegStratTableRow(props) {
  return h(TableRow, [
    h(TableCell, [
      h(Typography, { className: "expansion-summary-title" }, [props.label]),
    ]),
    h(TableCell, [...props.cellContent]),
  ]);
}

function RegionalStratigraphy(props) {
  const { mapInfo, columnInfo } = props;
  const { mapData, hasColumns } = mapInfo;

  console.log("Map has columns", hasColumns);

  if (!mapData || !hasColumns || Object.keys(columnInfo).length == 0)
    return h("div");

  return h("span", [
    h(ExpansionPanel, {
      classes: { root: "regional-panel" },
      title: "Regional stratigraphy",
    }),
    h.if(Object.keys(columnInfo).length != 0)(Table, [
      h(TableBody, [
        h(RegStratTableRow, {
          label: "Thickness: ",
          cellContent: [
            addCommas(parseInt(columnInfo.min_thick)),
            " - ",
            addCommas(parseInt(columnInfo.max_thick)),
            h("span.age-chip-ma", ["m"]),
          ],
        }),
        h(RegStratTableRow, {
          label: "Age: ",
          cellContent: [
            columnInfo.b_age,
            " - ",
            columnInfo.t_age,
            " ",
            h("span.age-chip-ma", ["Ma"]),
          ],
        }),
        h(RegStratTableRow, {
          lable: "Area: ",
          cellContent: [
            addCommas(columnInfo.area),
            " ",
            h("span.age-chip-ma", ["km2"]),
          ],
        }),
        h(RegStratTableRow, {
          label: "Fossil collections: ",
          cellContent: [addCommas(columnInfo.pbdb_collections)],
        }),
        h(RegStratTableRow, {
          label: "Fossil occurences: ",
          cellContent: [addCommas(columnInfo.pbdb_occs)],
        }),
        h(TableRow, [
          h(TableCell, [
            h("table", [
              h("tbody", [h("tr", [h("td", ["Period"]), h("td", ["Unit"])])]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

export { RegionalStratigraphy };
