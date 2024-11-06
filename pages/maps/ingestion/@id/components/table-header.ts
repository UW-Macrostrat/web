import {
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Popover,
} from "@blueprintjs/core";

import { DataParameters, TableUpdate } from "#/maps/ingestion/@id/utils";
import styles from "./main.module.sass";
import hyper from "@macrostrat/hyper";
import { clearDataParameters } from "#/maps/ingestion/@id/reducer";

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
  markAsHarmonized: () => void;
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
  clearDataParameters,
  markAsHarmonized,
}: TableHeaderProps) => {
  const activeFilters = Object.values(dataParameters.filter).filter((f) =>
    f.is_valid()
  );
  const isMenuActive =
    dataParameters.group != undefined ||
    activeFilters.length != 0 ||
    hiddenColumns.length != 0 ||
    tableUpdates.length != 0;

  return h("div.input-form", {}, [
    h(ButtonGroup, [
      h(Popover, {
        interactionKind: "click",
        minimal: true,
        placement: "bottom-start",
        content: h(Menu, {}, [
          h(MenuItem, {
            icon: "refresh",
            text: "Clear Changes",
            onClick: clearTableUpdates,
            disabled: tableUpdates.length == 0,
          }),
          h(MenuItem, {
            icon: "filter",
            text: "Clear Filters/Group",
            onClick: clearDataParameters,
            disabled:
              dataParameters.group == undefined && activeFilters.length == 0,
          }),
          h(MenuItem, {
            disabled: hiddenColumns.length == 0,
            icon: "eye-open",
            text: "Show Hidden Columns",
            onClick: showAllColumns,
          }),
          h(MenuItem, {
            icon: "cross",
            text: "Show Omitted Rows",
            onClick: toggleShowOmittedRows,
          }),
          h(MenuItem, {
            icon: "download",
            text: "Download Source Files",
            onClick: downloadSourceFiles,
          }),
          h(MenuItem, {
            icon: "issue-new",
            text: "Report Issue/Request Feature",
            href: "https://github.com/UW-Macrostrat/web/issues/new?assignees=&labels=ingestion&projects=&template=ingestion.md&title=",
            target: "_blank",
          }),
        ]),
        renderTarget: ({ ...targetProps }) =>
          h(Button, {
            ...targetProps,
            icon: "menu",
            intent: isMenuActive ? "success" : undefined,
          }),
      }),
      h(
        Button,
        {
          type: "submit",
          onClick: submitTableUpdates,
          disabled: tableUpdates.length == 0,
          intent: "success",
        },
        ["Submit Changes"]
      ),
      h(
        Button,
        {
          type: "submit",
          onClick: markAsHarmonized,
          intent: "success",
          title: "Mark the legend as harmonized and generate the map",
        },
        ["Generate Map"]
      ),
      h.if(totalNumberOfRows != undefined)(
        Button,
        {
          disabled: true,
        },
        [`${totalNumberOfRows} Rows`]
      ),
    ]),
  ]);
};

export default TableHeader;
