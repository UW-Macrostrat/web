import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "~/map-interface/settings";
import { useAppState } from "~/map-interface/app-state";
import { useMapElement } from "./context";
import { useEffect } from "react";
import { GeoJSONSource } from "mapbox-gl";

function PaleogeographyPlatesLayer() {
  const plateModelId = useAppState((s) => s.core.plateModelId);
  const res = useAPIResult(SETTINGS.corelleAPIDomain + "/plates", {
    model: plateModelId,
  });

  const map = useMapElement();

  useEffect(() => {
    if (res == null || map == null) return;
    const source = map.getSource("plates-debug") as GeoJSONSource;
    if (source == null) return;
    source.setData({
      type: "FeatureCollection",
      features: [],
    });
  }, [res, map]);

  return null;
}
