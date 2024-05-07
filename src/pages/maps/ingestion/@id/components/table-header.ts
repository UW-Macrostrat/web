import {
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Popover,
} from "@blueprintjs/core";

import { DataParameters, TableUpdate } from "~/pages/maps/ingestion/@id/utils";
import styles from "./main.module.sass";
import hyper from "@macrostrat/hyper";
import { clearDataParameters } from "~/pages/maps/ingestion/@id/reducer";

const h = hyper.styled(styles);

interface TableHeaderProps {
  hiddenColumns: string[];
  tableUpdates: TableUpdate[];
  dataParameters: DataParameters;
  totalNumberOfRows: number;
  showAllColumns: () => void;
  toggleShowOmittedRows: () => void;
  clearTableUpdates: () => void;
  submitTableUpdates: () => Promise<void>;
  downloadSourceFiles: () => void;
  clearDataParameters: () => void;
}

export const TableHeader = ({
  hiddenColumns,
  tableUpdates,
  dataParameters,
  totalNumberOfRows,
  showAllColumns,
  toggleShowOmittedRows,
  clearTableUpdates,
  submitTableUpdates,
  downloadSourceFiles,
  clearDataParameters
}: TableHeaderProps) => {

  const activeFilters = Object.values(dataParameters.filter).filter(f => f.is_valid())

  console.log(activeFilters)

  return (
    h("div.input-form", {}, [
      h(ButtonGroup, [
        h(Popover, {
          interactionKind: "click",
          minimal: true,
          placement: "bottom-start",
          content: h(Menu, {}, [
            h(
              MenuItem,
              {
                disabled: hiddenColumns.length == 0,
                icon: "eye-open",
                text: "Show All",
                onClick: showAllColumns
              },
              []
            ),
            h(
              MenuItem,
              {
                icon: "cross",
                text: "Show Omitted",
                onClick: toggleShowOmittedRows
              },
              []
            ),
          ]),
          renderTarget: ({ isOpen, ref, ...targetProps }) =>
            h(
              Button,
              { ...targetProps, elementRef: ref, icon: "menu" },
              []
            ),
        }),
        h(
          Button,
          {
            onClick: clearTableUpdates,
            disabled: tableUpdates.length == 0,
          },
          ["Clear changes"]
        ),
        h(
          Button,
          {
            onClick: clearDataParameters,
            disabled: dataParameters.group == undefined && activeFilters.length == 0,
          },
          ["Clear filters/grouping"]
        ),
        h(
          Button,
          {
            type: "submit",
            onClick: submitTableUpdates,
            disabled: tableUpdates.length == 0,
            intent: "success",
          },
          ["Submit"]
        ),
        h(
          Button,
          {
            onClick: downloadSourceFiles
          },
          ["Download Source"]
        ),
        h.if(totalNumberOfRows != undefined)(
          Button,
          {
            disabled: true,
          },
          [`${totalNumberOfRows} Rows`]
        ),
      ]),
    ])
  )
}

export default TableHeader;
