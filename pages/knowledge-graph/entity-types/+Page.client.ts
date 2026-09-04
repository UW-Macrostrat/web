import h from "@macrostrat/hyper";
import { PageBreadcrumbs } from "~/components";
import {
  PostgRESTTableView,
  ColorCell,
  EditableTextArea,
} from "@macrostrat/data-sheet";
import { asChromaColor } from "@macrostrat/color-utils";
import { AuthStatus } from "@macrostrat/form-components";
import { postgrestPrefix } from "@macrostrat-web/settings";

const colorField = {
  name: "Color",
  key: "color",
  required: false,
  transform: (d) => d,
  //dataEditor: ColorPicker,
  valueRenderer: (d) => {
    let color = asChromaColor(d);
    return color?.name() ?? "";
  },
  // Maybe this should be changed to CellProps?
  cellComponent: ColorCell,
};

/** Editable table of entity types. The `fullscreen` layout has no chrome of its
 * own, so breadcrumbs are rendered here; editing goes through PostgREST with
 * the site session. */
export function Page() {
  return h("div.main", [
    h("div.header", [h(PageBreadcrumbs, { separateTitle: false }), h(AuthStatus)]),
    h(PostgRESTTableView, {
      endpoint: postgrestPrefix,
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
