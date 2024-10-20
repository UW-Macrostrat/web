import { FullscreenPage } from "~/layouts";
import h from "@macrostrat/hyper";
import { PageBreadcrumbs } from "~/components";
import { PostgRESTTableView } from "~/components/legend-table";

import {
  ColorCell,
  EditableTextArea,
  ColorPicker,
} from "@macrostrat/data-sheet2";
import { asChromaColor } from "@macrostrat/color-utils";
import { LoginButton } from "#/maps/ingestion/components/navbar";
import { AuthStatus } from "@macrostrat/auth-components";

const colorField = {
  name: "Color",
  key: "color",
  required: false,
  transform: (d) => d,
  dataEditor: ColorPicker,
  valueRenderer: (d) => {
    let color = asChromaColor(d);
    return color?.name() ?? "";
  },
  // Maybe this should be changed to CellProps?
  cellComponent: ColorCell,
};

export function Page() {
  return h(FullscreenPage, { className: "main" }, [
    h(PageBreadcrumbs),
    h("div.header", [h("h1", "Entity types"), h("div.spacer"), h(AuthStatus)]),
    h(PostgRESTTableView, {
      table: "kg_entity_type",
      editable: true,
      columnOptions: {
        omitColumns: ["id"],
        overrides: {
          color: colorField,
          name: {
            name: "Name",
            style: { fontFamily: "monospace" },
          },
          description: {
            name: "Description",
            editable: true,
            //inlineEditor: true,
            dataEditor: EditableTextArea,
          },
        },
      },
      order: { key: "id", ascending: true },
    }),
  ]);
}
