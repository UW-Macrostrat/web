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
import { Button, HotkeysProvider } from "@blueprintjs/core";

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
}

export default function EditInterface({
  source_id,
  mapBounds,
}: EditInterfaceProps) {
  const [showMap, setShowMap] = useStoredState(
    "edit:showMap",
    true,
    // Check if is valid boolean
    (v) => typeof v === "boolean"
  );

  const title = mapBounds.properties.name;

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
            h(ParentRouteButton, { parentRoute: "/maps/" }),
            h("h2", title),
            h("div.spacer"),
            h("div.edit-page-buttons", [
              h(ShowMapButton, { showMap, setShowMap }),
            ]),
          ]),
          h(Router, { basename: `/maps/${source_id}/edit` }, [
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

function ShowMapButton({ showMap, setShowMap }) {
  return h(Button, {
    minimal: true,
    icon: "map",
    large: true,
    intent: showMap ? "primary" : "none",
    onClick: () => setShowMap(!showMap),
  });
}
