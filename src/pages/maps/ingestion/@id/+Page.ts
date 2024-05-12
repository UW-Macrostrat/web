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
import { Header } from "./components";

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

export function Page({ source_id, source }: EditInterfaceProps) {
  const title = source.name;

  const headerProps = {
    title: title,
    sourceURL: source.url,
  };

  const basename = `/maps/ingestion/${source_id}`;

  return h(EditPageShell, [
    h(Header, headerProps),
    h(EditMenu, { parentRoute: basename }),
  ]);
}

function EditPageShell({ children }) {
  return h(FullscreenPage, {}, children);
}

function EditMenu({ parentRoute }) {
  return h(
    ButtonGroup,
    { className: "edit-menu", vertical: true, large: true },
    [
      h(
        AnchorButton,
        {
          icon: "edit",
          large: true,
          href: parentRoute + "/meta",
        },
        "Metadata"
      ),
      h(
        AnchorButton,
        {
          icon: "polygon-filter",
          large: true,
          href: parentRoute + "/polygons",
        },
        "Polygons"
      ),
      h(
        AnchorButton,
        {
          icon: "minus",
          large: true,
          href: parentRoute + "/lines",
        },
        "Lines"
      ),
      h(
        AnchorButton,
        {
          icon: "selection",
          large: true,
          href: parentRoute + "/points",
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
