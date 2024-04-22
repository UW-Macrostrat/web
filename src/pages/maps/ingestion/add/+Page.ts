import { AddSourceForm } from "~/pages/maps/ingestion/@id/source-form";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import IngestNavbar from "../components/navbar";
const h = hyper.styled(styles);

export function Page({ user }) {
  return h("div", [
    h(IngestNavbar, { user: user }),
    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "600px",
          justifyContent: "center",
        },
      },
      [h("h1", { style: {} }, ["Source Map Ingestion"]), h(AddSourceForm)]
    ),
  ]);
}
