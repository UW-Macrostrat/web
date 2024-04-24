import hyper from "@macrostrat/hyper";
import styles from "./edit-page.module.sass";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { LinkButton } from "~/pages/map/map-interface/components/buttons";
import { WidthAdjustablePanel } from "./components";
import MapInterface from "./map-interface";
import { useStoredState } from "@macrostrat/ui-components";
import { ParentRouteButton } from "~/components/map-navbar";
import { Button, AnchorButton, HotkeysProvider, Icon } from "@blueprintjs/core";
import { PolygonTable, LineStringTable, PointTable } from "./tables";
import { EditSourceForm } from "./source-form";
import { ingestPrefix } from "@macrostrat-web/settings";

export const h = hyper.styled(styles);

function EditMenu() {
  return h("div.edit-menu", {}, [
    h(LinkButton, {
      icon: "polygon-filter",
      text: "Polygons",
      large: true,
      to: "polygons",
    }),
    h(LinkButton, {
      icon: "minus",
      text: "Line Strings",
      large: true,
      to: "linestrings",
    }),
    h(LinkButton, {
      icon: "selection",
      text: "Points",
      large: true,
      to: "points",
    }),
    h(LinkButton, {
      icon: "edit",
      text: "Edit Metadata",
      large: true,
      to: "edit",
    }),
  ]);
}

interface EditInterfaceProps {
  title?: string;
  parentRoute?: string;
  source_id?: number;
  mapBounds?: any;
  source?: any;
  ingestProcess?: any;
}

export default function EditInterface({
  source_id,
  mapBounds,
  source,
  ingestProcess,
}: EditInterfaceProps) {
  const [showMap, setShowMap] = useStoredState(
    "edit:showMap",
    false,
    // Check if is valid boolean
    (v) => typeof v === "boolean"
  );

  const title = source.name;

  const HeaderProps = {
    title: title,
    showMap: showMap,
    setShowMap: setShowMap,
  };

  const sourcePrefix = `${ingestPrefix}/sources/${source_id}`;

  return h(HotkeysProvider, [
    h("div.edit-page", [
      h(
        WidthAdjustablePanel,
        {
          expand: !showMap,
          className: "edit-page-content",
          storageID: "edit-panel-width",
        },
        // TODO: make this basename dynamic
        h([
          h(Router, { basename: `/maps/ingestion/${source_id}` }, [
            h(Routes, [
              h(Route, {
                path: "",
                element: h("div", {}, [
                  h(Header, { ...HeaderProps, parentRoute: "/maps/ingestion" }),
                  h(EditMenu),
                ]),
              }),
              h(Route, {
                path: "polygons",
                element: h(TableContainer, {}, [
                  h(Header, HeaderProps),
                  h(PolygonTable, {
                    url: sourcePrefix + `/polygons`,
                    ingestProcessId: ingestProcess.id,
                  }),
                ]),
              }),
              h(Route, {
                path: "points",
                element: h(TableContainer, {}, [
                  h(Header, HeaderProps),
                  h(PointTable, {
                    url: sourcePrefix + `/points`,
                    ingestProcessId: ingestProcess.id,
                  }),
                ]),
              }),
              h(Route, {
                path: "linestrings",
                element: h(TableContainer, {}, [
                  h(Header, HeaderProps),
                  h(LineStringTable, {
                    url: sourcePrefix + `/linestrings`,
                    ingestProcessId: ingestProcess.id,
                  }),
                ]),
              }),
              h(Route, {
                path: "edit",
                element: h("div", {}, [
                  h(Header, HeaderProps),
                  h(EditSourceForm, { sourceId: source_id }),
                ]),
              }),
            ]),
          ]),
        ])
      ),
      h.if(showMap)(MapInterface, { id: source_id, map: mapBounds }),
    ]),
  ]);
}

const TableContainer = ({ children }) => {
  return h(
    "div.table-container",
    { style: { display: "flex", flexDirection: "column", height: "100%" } },
    children
  );
};

function Header({
  title,
  showMap,
  setShowMap,
  parentRoute,
}: {
  title: string;
  showMap: boolean;
  setShowMap: (b: boolean) => void;
  parentRoute?: string;
}) {
  return h("div.edit-page-header", [
    h(ParentRouteButton, { parentRoute: parentRoute }),
    h("h2.m-0", {}, [
      `${title} Ingestion`,
      h(ShowDocsButton, {
        href: "/docs/ingestion/harmonization",
      }),
    ]),
    h("div.spacer"),
    h("div.edit-page-buttons", [h(ShowMapButton, { showMap, setShowMap })]),
  ]);
}

function ShowDocsButton({ href }: { href: string }) {
  return h(AnchorButton, {
    minimal: true,
    title: "View Ingestion Documentation",
    icon: "manual",
    target: "_blank",
    large: true,
    href: href,
  });
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
