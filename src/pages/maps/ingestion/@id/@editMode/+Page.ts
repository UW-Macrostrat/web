import {
  AnchorButton,
  Button,
  ButtonGroup,
  HotkeysProvider,
} from "@blueprintjs/core";
import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { useStoredState } from "@macrostrat/ui-components";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ParentRouteButton } from "~/components/map-navbar";
import { FullscreenPage } from "~/layouts";
import { PageBreadcrumbs } from "~/renderer";
import { Header, WidthAdjustablePanel } from "../components";
import styles from "../edit-page.module.sass";
import MapInterface from "../map-interface";
import { EditSourceForm } from "../source-form";
import { LinesTable, PointsTable, PolygonsTable } from "../tables";

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

export function Page({
  source_id,
  mapBounds,
  source,
  ingestProcess,
  editMode,
}: EditInterfaceProps) {
  const slug = source.slug;

  const sourcePrefix = `${ingestPrefix}/sources/${source_id}`;

  let url = sourcePrefix + `/${editMode}`;
  const ingestProcessId = ingestProcess.id;
  const tableComponent = routeMap[editMode];

  const [showMap, setShowMap] = useStoredState(
    "edit:showMap",
    false,
    // Check if is valid boolean
    (v) => typeof v === "boolean"
  );

  return h(
    FullscreenPage,
    h(HotkeysProvider, [
      h("div.edit-page", [
        h(
          WidthAdjustablePanel,
          {
            expand: !showMap,
            className: "edit-page-content",
            storageID: "edit-panel-width",
          },
          // TODO: make this basename dynamic
          [
            h(
              Header,
              {
                title: source.name,
                sourceURL: source.url,
              },
              [h(ShowMapButton, { showMap, setShowMap })]
            ),
            h(TableContainer, {}, [
              h(tableComponent, {
                url,
                ingestProcessId,
              }),
            ]),
          ]
        ),
        h.if(showMap)(MapInterface, {
          id: source_id,
          map: mapBounds,
          slug,
        }),
      ]),
    ])
  );
}

const TableContainer = ({ children }) => {
  return h(
    "div.table-container",
    { style: { display: "flex", flexDirection: "column", height: "100%" } },
    children
  );
};

function ShowMapButton({ showMap, setShowMap }) {
  return h(Button, {
    minimal: true,
    icon: "map",
    large: true,
    intent: showMap ? "primary" : "none",
    onClick: () => setShowMap(!showMap),
  });
}
