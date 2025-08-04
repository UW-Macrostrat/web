import h from "@macrostrat/hyper";
import { App } from "@macrostrat/column-footprint-editor";

export function Page() {
  return h("div.page", [h("h1", "Column Footprint Editor"), h(App)]);
}
