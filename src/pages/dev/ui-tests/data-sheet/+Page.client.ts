import { HotkeysProvider } from "@blueprintjs/core";
import h from "../main.module.sass";
import { PageBreadcrumbs } from "~/renderer";
import DataSheetTest from "@macrostrat-web/data-sheet-test";

export function Page() {
  return h(
    HotkeysProvider,
    h("div.main", [
      h(PageBreadcrumbs),
      h("h1", "Data sheet"),
      h("p", [
        "This is a test of the a spreadsheet-like editor based on the ",
        h("code", "@blueprintjs/core"),
        " component. It will eventually be used as the basis for the ",
        h("code", "@macrostrat/data-sheet"),
        " library, which will underpin several important Macrostrat v2 user interfaces.",
      ]),
      h("div.data-sheet-container", h(DataSheetTest)),
    ])
  );
}
