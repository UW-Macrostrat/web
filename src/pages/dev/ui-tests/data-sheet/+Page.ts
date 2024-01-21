import { Breadcrumbs, HotkeysProvider } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";
import style from "../main.module.sass";

const h = hyper.styled(style);

function DataSheetTest() {
  return h(ClientOnly, {
    component: () => import("@macrostrat-web/data-sheet-test"),
  });
}

export function Page() {
  return h(
    HotkeysProvider,
    h("div.main", [
      h(Breadcrumbs, {
        items: [
          { text: "Macrostrat", href: "/" },
          { text: "Development", href: "/dev" },
          { text: "UI tests", href: "/dev/ui-tests" },
          { text: "Data sheet" },
        ],
      }),
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
