import { AnchorButton, Button, HotkeysProvider } from "@blueprintjs/core";
import { ingestPrefix } from "@macrostrat-web/settings";
import { ErrorBoundary, useStoredState } from "@macrostrat/ui-components";
import { BasePage } from "~/layouts";
import h from "./main.module.sass";
import { usePageProps } from "~/renderer/usePageProps";
import { Allotment } from "allotment";
import { useState } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import "allotment/dist/style.css";

import { LinesTable, PointsTable, PolygonsTable } from "../../tables-legacy";
import { Header, MapInterface } from "../../components";
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
  const { urlPathname } = usePageContext();

  const data = useData();
  const { mapInfo, geometry } = data;
  const mapBounds = {
    geometry,
    properties: mapInfo,
  };
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
                refTitle: mapInfo.ref_title ?? mapInfo.name,
                sourceURL: source.url,
                ingestProcess,
                separateTitle: false,
              },
              [
                h(
                  AnchorButton,
                  {
                    href: urlPathname + "/next",
                    intent: "success",
                    rightIcon: "updated",
                  },
                  "New interface"
                ),
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

function ShowMapButton({ showMap, setShowMap }) {
  return h(Button, {
    minimal: true,
    icon: "map",
    large: true,
    intent: showMap ? "primary" : "none",
    onClick: () => setShowMap(!showMap),
  });
}
