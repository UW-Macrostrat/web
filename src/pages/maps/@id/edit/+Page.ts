import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";


const EditInterface = () => import("./edit-page");

export function Page({ id, map }) {
  return h(
    "div.single-map",
    h(ClientOnly, { component: EditInterface, source_id: id, mapBounds: map })
  );
}
