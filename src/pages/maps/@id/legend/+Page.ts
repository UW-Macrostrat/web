import { Breadcrumbs, HotkeysProvider } from "@blueprintjs/core";
import LegendTable from "./lib";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function Page({ map }) {
  const slug = map.slug;
  //console.log("Page", map.source_id);
  return h(
    HotkeysProvider,
    h(FullscreenPage, { className: "main" }, [
      h(Breadcrumbs, {
        items: [
          { text: "Macrostrat", href: "/" },
          { text: "Maps", href: "/maps" },
          { text: h("code", slug), href: `/maps/${map.source_id}` },
          { text: "Legend" },
        ],
      }),
      h("h1", map.name + " map units"),
      h("p", [
        "This is a test of the a spreadsheet-like editor based on the ",
        h("code", "@blueprintjs/core"),
        " component. It will eventually be used as the basis for the ",
        h("code", "@macrostrat/data-sheet"),
        " library, which will underpin several important Macrostrat v2 user interfaces.",
      ]),
      h("div.data-sheet-container", h(LegendTable)),
    ])
  );
}
