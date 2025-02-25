import MapInterface from "./map-interface";
import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { useEffect } from "react";

export function Page() {
  // Temporary useData hook
  const data = useData();
  useEffect(() => {
    console.log("GeoIP data", data);
  }, [data]);

  return h(MapInterface);
}
