/** The assistant panel: the focused source's properties while editing, and
 * the map settings. The focus and the inspected point are tags in the
 * toolbar. */

import { Switch } from "@blueprintjs/core";
import { ExpansionPanel } from "@macrostrat/data-components";
import { ErrorCallout } from "@macrostrat/ui-components";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";

import { BaseLayerForm } from "~/components";
import { fetchCompilationGraph } from "~/components/compilation-tree";

import { FocusEditor } from "./editor";
import { basemapAtom, showLabelsAtom } from "~/_utils/basemap";
import {
  graphVersionAtom,
  expandMembersAtom,
  pointAtom,
  pointGraphAtom,
  showCartoAtom,
  showFacesAtom,
  showFootprintsAtom,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function CompilationAssistant() {
  return h("div.compilation-assistant", [
    h(PointLoader),
    h(FocusEditor),
    h(MapOptions),
  ]);
}

/* ----------------------------------------------------------- the location */

/** Fetches the point-scoped graph when the marker moves, into the atom the list
 * and map both read. Rendered for its effect only — the panel that shows the
 * result is separate, so it survives the panel being collapsed. */
function PointLoader() {
  const point = useAtomValue(pointAtom);
  const setGraph = useSetAtom(pointGraphAtom);
  // Bumped by a save, so an edited graph is fetched again for the point.
  const version = useAtomValue(graphVersionAtom);
  const [error, setError] = useState<Error | null>(null);

  const lng = point?.lng ?? null;
  const lat = point?.lat ?? null;

  useEffect(() => {
    if (lng == null || lat == null) {
      setGraph(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setGraph(null);
    setError(null);

    fetchCompilationGraph({ lng, lat })
      .then((graph) => {
        if (!cancelled) setGraph(graph);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [lng, lat, version, setGraph]);

  if (error == null) return null;
  return h(ErrorCallout, { error });
}

/* ------------------------------------------------------------ map options */

function MapOptions() {
  const [footprints, setFootprints] = useAtom(showFootprintsAtom);
  const [faces, setFaces] = useAtom(showFacesAtom);
  const [expand, setExpand] = useAtom(expandMembersAtom);
  const [carto, setCarto] = useAtom(showCartoAtom);
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

  return h(
    ExpansionPanel,
    { title: "Map layers", className: "map-options", expanded: true },
    [
      h(Switch, {
        label: "Member footprints",
        checked: footprints,
        onChange: (evt) => setFootprints(evt.currentTarget.checked),
      }),
      h(Switch, {
        label: "Solved faces",
        checked: faces,
        onChange: (evt) => setFaces(evt.currentTarget.checked),
      }),
      h(Switch, {
        label: "Expand to constituent maps",
        checked: expand,
        onChange: (evt) => setExpand(evt.currentTarget.checked),
      }),
      h("p.option-note", [
        "Off, a compilation is drawn as the units it presents — British Columbia once, not its two constituent maps. On, as the maps it resolves to.",
      ]),
      h(Switch, {
        label: "Macrostrat map",
        checked: carto,
        onChange: (evt) => setCarto(evt.currentTarget.checked),
      }),
      h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels }),
    ]
  );
}
