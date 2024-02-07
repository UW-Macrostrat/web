import hyper from "@macrostrat/hyper";
import styles from "./edit-page.module.sass";
import { useState } from "react";
import EditTable from "./edit-table";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { LinkButton } from "~/pages/map/map-interface/components/buttons";
import { WidthAdjustablePanel } from "./components";
import MapInterface from "./map-interface";
import { useStoredState } from "@macrostrat/ui-components";
import { ParentRouteButton } from "~/components/map-navbar";
import { Button, AnchorButton, HotkeysProvider, Icon } from "@blueprintjs/core";

export const h = hyper.styled(styles);

function EditMenu() {
  return h("div.edit-menu", {}, [
    h(LinkButton, {
      icon: "polygon-filter",
      text: "Polygons",
      large: true,
      to: "polygons",
    }),
  ]);
}

interface EditInterfaceProps {
  title?: string;
  parentRoute?: string;
  source_id?: number;
  mapBounds?: any;
  source?: any;
}

export default function EditInterface({
  source_id,
  mapBounds,
  source,
  ingest_process
}: EditInterfaceProps) {
  const [showMap, setShowMap] = useStoredState(
    "edit:showMap",
    false,
    // Check if is valid boolean
    (v) => typeof v === "boolean"
  );

  const title = source.name;

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
          h("div.edit-page-header", [
            h(ParentRouteButton, { parentRoute: "/maps/ingestion" }),
            h("h2", {}, [
              `${title} Ingestion`,
              h(ShowDocsButton, {href: "https://github.com/UW-Macrostrat/web/blob/main/src/pages/maps/ingestion/%40id/README.md"}),
            ]),
            h("div.spacer"),
            h("div.edit-page-buttons", [
              h(ShowMapButton, { showMap, setShowMap }),
            ]),
          ]),
          h(Router, { basename: `/maps/ingestion/${source_id}` }, [
            h(Routes, [
              h(Route, {
                path: "",
                element: h(EditMenu),
              }),
              h(Route, {
                path: "polygons",
                element: h(EditTable, {
                  url: `${
                    import.meta.env.VITE_MACROSTRAT_INGEST_API
                  }/sources/${source_id}/polygons`,
                  ingest_process: ingest_process
                }),
              }),
            ]),
          ]),
        ])
      ),
      h.if(showMap)(MapInterface, { id: source_id, map: mapBounds }),
    ]),
  ]);
}

function ShowDocsButton({href}: {href: string}) {
  return h(AnchorButton, {
    minimal: true,
    title: "View Ingestion Documentation",
    icon: "manual",
    target: "_blank",
    large: true,
    href: href
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
