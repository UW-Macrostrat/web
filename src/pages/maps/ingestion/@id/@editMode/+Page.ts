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
import { WidthAdjustablePanel } from "../components";
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
  const title = source.name;
  const slug = source.slug;

  console.log(source);

  const headerProps = {
    title: title,
    source_href: source.url,
  };

  const sourcePrefix = `${ingestPrefix}/sources/${source_id}`;

  // return h(FullscreenPage, {}, [
  //   h(PageBreadcrumbs),
  //   h(Header, { ...HeaderProps, parentRoute: "/maps/ingestion" }),
  //   h(EditMenu),
  // ]);

  //const basename = `/maps/ingestion/${source_id}`;

  let url = sourcePrefix + `/${editMode}`;

  return h(EditModePageShell, {
    source_id,
    mapBounds,
    url,
    tableComponent: routeMap[editMode],
    ingestProcessId: ingestProcess.id,
    slug,
  });
}

function EditModePageShell({
  url,
  tableComponent,
  ingestProcessId,
  source_id,
  mapBounds,
  slug,
}) {
  const [showMap, setShowMap] = useStoredState(
    "edit:showMap",
    false,
    // Check if is valid boolean
    (v) => typeof v === "boolean"
  );

  return h(
    EditPageShell,
    { headerButtons: [h(ShowMapButton, { showMap, setShowMap })] },
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
            h(TableContainer, {}, [
              h(tableComponent, {
                url,
                ingestProcessId,
              }),
            ]),
            h.if(showMap)(MapInterface, {
              id: source_id,
              map: mapBounds,
              slug,
            }),
          ]
        ),
      ]),
    ])
  );
}

function EditPageShell({ children, ...rest }) {
  return h(FullscreenPage, {}, [h(PageBreadcrumbs), children]);
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
