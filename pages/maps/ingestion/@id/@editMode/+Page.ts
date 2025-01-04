import { Button, HotkeysProvider, Switch } from "@blueprintjs/core";
import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { useStoredState } from "@macrostrat/ui-components";
import { BasePage } from "~/layouts";
import { Header } from "../components";
import styles from "./main.module.sass";
import { MapInterface } from "../components";
import { LinesTable, PointsTable, PolygonsTable } from "../tables";
import { usePageProps } from "~/renderer/usePageProps";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { PolygonsOldTable } from "#/maps/ingestion/@id/tables/polygons-old";

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
  polygons: PolygonsOldTable,
  lines: LinesTable,
  points: PointsTable,
};

export function Page() {
  const { source, ingestProcess, editMode, mapBounds, source_id } =
    usePageProps();
  const slug = source.slug;

  const sourcePrefix = `${ingestPrefix}/sources/${source_id}`;

  let url = sourcePrefix + `/${editMode}`;
  const ingestProcessId = ingestProcess.id;
  let tableComponent = routeMap[editMode];

  const [newTableDesign, setNewTableDesign] = useStoredState(
    "edit:newTableDesign",
    true,
    // Check if is valid boolean
    (v) => typeof v === "boolean"
  );

  if (newTableDesign && editMode === "polygons") {
    tableComponent = PolygonsTable;
  }

  const [showMap, setShowMap] = useStoredState(
    "edit:showMap",
    false,
    // Check if is valid boolean
    (v) => typeof v === "boolean"
  );

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
              },
              [
                h(Switch, {
                  checked: newTableDesign,
                  disabled: editMode !== "polygons",
                  onChange(evt) {
                    setNewTableDesign(evt.target.checked);
                  },
                  label: "New table",
                }),
                h(ShowMapButton, { showMap, setShowMap }),
              ]
            ),
            h("div.table-container", [
              h(tableComponent, {
                url,
                ingestProcessId,
              }),
            ]),
          ]),
          h.if(showMap)(MapInterface, {
            id: source_id,
            map: mapBounds,
            slug,
            featureTypes: [editMode],
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
