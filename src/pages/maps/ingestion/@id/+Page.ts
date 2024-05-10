import hyper from "@macrostrat/hyper";
import styles from "./edit-page.module.sass";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { WidthAdjustablePanel } from "./components";
import MapInterface from "./map-interface";
import { useStoredState } from "@macrostrat/ui-components";
import { ParentRouteButton } from "~/components/map-navbar";
import { Button, AnchorButton, HotkeysProvider, Icon } from "@blueprintjs/core";
import { PolygonsTable, LinesTable, PointsTable } from "./tables";
import { EditSourceForm } from "./source-form";
import { ingestPrefix } from "@macrostrat-web/settings";
import { ButtonGroup } from "@blueprintjs/core";
import { FullscreenPage } from "~/layouts";
import { PageBreadcrumbs } from "~/renderer";

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
}: EditInterfaceProps) {
  const title = source.name;
  const slug = source.slug;

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

  return h(Router, { basename: `/maps/ingestion/${source_id}` }, [
    h(Routes, [
      h(Route, {
        path: "",
        element: h(EditPageShell, { title }, [
          h(Header, { ...headerProps, parentRoute: "/maps/ingestion" }),
          h(EditMenu),
        ]),
      }),
      Object.entries(routeMap).map(([key, value]) => {
        let url = sourcePrefix + `/${key}`;
        if (key === "lines") {
          url = sourcePrefix + `/linestrings`;
        }

        return h(Route, {
          path: key,
          element: h(EditModePageShell, {
            title,
            url,
            tableComponent: value,
            ingestProcessId: ingestProcess.id,
          }),
        });
      }),
      h(Route, {
        path: "meta",
        element: h("div", {}, [
          h(Header, headerProps),
          h(EditSourceForm, { sourceId: source_id }),
        ]),
      }),
    ]),
  ]);
}

function EditModePageShell({ title, url, tableComponent, ingestProcessId }) {
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
  return h(FullscreenPage, {}, [
    h(PageBreadcrumbs),
    h(Header, { ...rest, parentRoute: "/maps/ingestion" }),
    children,
  ]);
}

function EditMenu() {
  return h(
    ButtonGroup,
    { className: "edit-menu", vertical: true, large: true },
    [
      h(
        AnchorButton,
        {
          icon: "edit",
          large: true,
          href: "meta",
        },
        "Metadata"
      ),
      h(
        AnchorButton,
        {
          icon: "polygon-filter",
          large: true,
          href: "polygons",
        },
        "Polygons"
      ),
      h(
        AnchorButton,
        {
          icon: "minus",
          large: true,
          href: "lines",
        },
        "Lines"
      ),
      h(
        AnchorButton,
        {
          icon: "selection",
          large: true,
          href: "points",
        },
        "Points"
      ),
      h(
        ShowDocsButton,
        {
          href: "/docs/ingestion",
        },
        "Documentation"
      ),
    ]
  );
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
  parentRoute,
  sourceURL,
  children,
}: {
  title: string;
  parentRoute?: string;
  sourceURL: string;
  children?: React.ReactNode;
}) {
  return h("div.edit-page-header", [
    h(ParentRouteButton, { parentRoute: parentRoute }),
    h("h2.m-0", {}, [`${title} Ingestion`]),
    h("div.spacer"),
    h(ButtonGroup, { minimal: true, className: "edit-page-buttons" }, [
      h.if(sourceURL != null)(NavigateMapSourceButton, {
        href: sourceURL,
      }),
      children,
    ]),
  ]);
}

function ShowDocsButton({ href, children }: { href: string }) {
  return h(
    AnchorButton,
    {
      minimal: true,
      title: "Ingestion Documentation",
      icon: "manual",
      target: "_blank",
      large: true,
      href,
    },
    children
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

function NavigateMapSourceButton({ href }: { href: string }) {
  return h(
    AnchorButton,
    {
      minimal: true,
      title: "Source",
      icon: "link",
      intent: "primary",
      target: "_blank",
      large: true,
      href: href,
    },
    "Source"
  );
}
