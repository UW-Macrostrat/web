import { Button, HotkeysProvider } from "@blueprintjs/core";
import { ingestPrefix } from "@macrostrat-web/settings";
import { secureFetch } from "@macrostrat-web/security";
import { ErrorBoundary, useStoredState } from "@macrostrat/ui-components";
import { BasePage } from "~/layouts";
import h from "./main.module.sass";
import { usePageProps } from "~/renderer/usePageProps";
import { Allotment } from "allotment";
import { useState } from "react";
import "allotment/dist/style.css";
import { useData } from "vike-react/useData";

import { LinesTable, PointsTable, PolygonsTable } from "../../tables";
import { Header, MapInterface, downloadSourceFiles } from "../../components";
import { MapSelectedFeatures } from "../../details-panel";

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
  const { source, ingestProcess, editMode, source_id } = usePageProps();
  const slug = source.slug;

  const data = useData();
  const { mapInfo, geometry } = data;
  const mapBounds = {
    geometry,
    properties: mapInfo,
  };

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
  const [inspectPosition, setInspectPosition] = useState(null);

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
                separateTitle: false,
              },
              [
                h(SourceActions, { ingestProcessId }),
                h(ShowMapButton, { showMap, setShowMap }),
              ]
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
              map: mapBounds,
              slug,
              featureTypes: [editMode],
              onClickFeatures: selectFeatures,
              inspectPosition,
              setInspectPosition,
              className: "map-panel-container",
            }),
          ]),
          h.if(showSelectedFeatures)(MapSelectedFeatures, {
            features: mapSelectedFeatures,
            selectFeatures,
            onClose() {
              setInspectPosition(null);
              selectFeatures([]);
            },
          }),
        ]),
      ]),
    ])
  );
}

/** Source-level actions (top page header): download source files and
 * generate map. These operate on the whole ingest process, so they live on
 * the page rather than in the per-column data-sheet toolbar. */
function SourceActions({ ingestProcessId }) {
  async function onGenerateMap() {
    const res = await secureFetch(
      `${ingestPrefix}/ingest-process/${ingestProcessId}`,
      {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ state: "post_harmonization" }),
      }
    );
    if (res.ok) window.location.reload();
  }

  return h([
    h(
      Button,
      {
        minimal: true,
        icon: "download",
        onClick: () => downloadSourceFiles(ingestProcessId),
      },
      "Download sources"
    ),
    h(
      Button,
      { intent: "success", icon: "layout-hierarchy", onClick: onGenerateMap },
      "Generate map"
    ),
  ]);
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
