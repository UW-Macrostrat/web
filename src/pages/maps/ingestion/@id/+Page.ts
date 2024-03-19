import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";

const EditInterface = () => import("./edit-page");

export function Page({ id, map, source, ingestProcess }) {
  return h(
    "div.single-map",
    h(ClientOnly, { component: EditInterface, source_id: id, mapBounds: map, source: source, ingestProcess: ingestProcess })
  );
}
