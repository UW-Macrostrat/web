import {
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Popover,
} from "@blueprintjs/core";

import { TableUpdate } from "~/pages/maps/ingestion/@id/utils";
import styles from "./main.module.sass";
import hyper from "@macrostrat/hyper";

const h = hyper.styled(styles);

interface TableHeaderProps {
  hiddenColumns: string[];
  tableUpdates: TableUpdate[];
  totalNumberOfRows: number;
  showAllColumns: () => void;
  toggleShowOmittedRows: () => void;
  clearTableUpdates: () => void;
  submitTableUpdates: () => Promise<void>;
  downloadSourceFiles: () => void;
}

export const TableHeader = ({
  hiddenColumns,
  tableUpdates,
  totalNumberOfRows,
  showAllColumns,
  toggleShowOmittedRows,
  clearTableUpdates,
  submitTableUpdates,
  downloadSourceFiles
}: TableHeaderProps) => {

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
