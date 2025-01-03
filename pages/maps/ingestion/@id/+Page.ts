import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { BasePage } from "~/layouts";
import { Header } from "./components";
import { MapInterface } from "./components";
import { usePageProps } from "~/renderer/usePageProps";

const h = hyper.styled(styles);

interface EditInterfaceProps {
  title?: string;
  parentRoute?: string;
  source_id?: number;
  mapBounds?: any;
  source?: any;
  ingestProcess?: any;
}

export function Page() {
  const { source_id, source, mapBounds, ingestProcess }: EditInterfaceProps =
    usePageProps();
  const title = source.name;

  const headerProps = {
    title,
    ingestProcess,
    sourceURL: source.url,
  };

  const basename = `/maps/ingestion/${source_id}`;

  return h(BasePage, { className: "page" }, [
    h(Header, headerProps),
    h("div.ingestion-main-panel", [
      h("div.context-panel", [h(EditMenu, { parentRoute: basename })]),
      h("div.main-content", [
        h(MapInterface, { id: source_id, map: mapBounds, slug: source.slug }),
      ]),
    ]),
  ]);
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
