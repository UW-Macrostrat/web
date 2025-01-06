import { Button, HotkeysProvider } from "@blueprintjs/core";
import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { ErrorBoundary, useStoredState } from "@macrostrat/ui-components";
import { BasePage } from "~/layouts";
import { Header, MapInterface } from "../components";
import styles from "./main.module.sass";
import { LinesTable, PointsTable, PolygonsTable } from "../tables";
import { usePageProps } from "~/renderer/usePageProps";
import { Allotment } from "allotment";
import { useState } from "react";
import "allotment/dist/style.css";
import { MapSelectedFeatures } from "#/maps/ingestion/@id/details-panel";

const h = hyper.styled(styles);

interface EditInterfaceProps {
  title?: string;
  parentRoute?: string;
  source_id?: number;
  mapBounds?: any;
  source?: any;
  ingestProcess?: any;
}

const routeMap = {
  polygons: PolygonsTable,
  lines: LinesTable,
  points: PointsTable,
};

export function Page() {
  const { source, ingestProcess, editMode, mapBounds, source_id } =
    usePageProps();
  const slug = source.slug;

  const sourcePrefix = `${ingestPrefix}/sources/${source_id}`;

  let url = sourcePrefix + `/${editMode}`;
  const ingestProcessId = ingestProcess.id;
  let tableComponent = routeMap[editMode];

  const [showMap, setShowMap] = useStoredState(
    "edit:showMap",
    false,
    // Check if is valid boolean
    (v) => typeof v === "boolean"
  );

  const [mapSelectedFeatures, selectFeatures] = useState([]);

  const showSelectedFeatures =
    mapSelectedFeatures != null && mapSelectedFeatures.length > 0;

  return h(
    BasePage,
    { fitViewport: true },
    h(HotkeysProvider, [
      h("div.edit-page", [
        h(Allotment, [
          h("div.main-panel", [
            h(
              Header,
              {
                title: source.name,
                sourceURL: source.url,
                ingestProcess,
              },
              [h(ShowMapButton, { showMap, setShowMap })]
            ),
            h("div.table-container", [
              h(ErrorBoundary, [
                h(tableComponent, {
                  url,
                  ingestProcessId,
                }),
              ]),
            ]),
          ]),
          h.if(showMap)("div.map-panel", [
            h(MapInterface, {
              id: source_id,
              map: mapBounds,
              slug,
              featureTypes: [editMode],
              onClickFeatures: selectFeatures,
            }),
          ]),
          h.if(showSelectedFeatures)(MapSelectedFeatures, {
            features: mapSelectedFeatures,
            selectFeatures,
          }),
        ]),
      ]),
    ])
  );
}

function ShowMapButton({ showMap, setShowMap }) {
  return h(Button, {
    minimal: true,
    icon: "map",
    large: true,
    intent: showMap ? "primary" : "none",
    onClick: () => setShowMap(!showMap),
  });
}
