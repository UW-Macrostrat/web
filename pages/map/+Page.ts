import MapInterface from "./map-interface";
import h from "@macrostrat/hyper";

/** The fullscreen page for Macrostrat's map interface */
export function Page() {
  console.log("rendering map page");
  return h(MapInterface);
}
