import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";
import "react-datasheet/lib/react-datasheet.css";

export function Page() {
  return h(
    "div.globe",
    h(ClientOnly, {
      component: () => import("@macrostrat-web/globe").then((d) => d.App),
      accessToken: import.meta.env.VITE_MAPBOX_API_TOKEN,
    })
  );
}
