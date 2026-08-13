import {
  Button,
  Callout,
  FormGroup,
  Intent,
  NumericInput,
  SegmentedControl,
  Switch,
  SwitchProps,
  Tag,
} from "@blueprintjs/core";
import {
  bandForScale,
  bandForZoom,
  buildInvalidationBody,
  ExpireMode,
  expireModeAtom,
  FootprintMode,
  footprintModeAtom,
  InvalidationResult,
  SelectedMap,
  selectedMapsAtom,
  showCartoAtom,
  useTileInvalidation,
  viewportBboxAtom,
  zoomAtom,
  zoomOffsetAtom,
} from "./lib.ts";
import { useCallback } from "react";
import { BaseLayerForm } from "~/components";
import h from "./main.module.scss";
import { Atom, PrimitiveAtom, useAtom, useAtomValue } from "jotai";

interface CachePanelProps {
  zoom: number | null;
  footprintMode: FootprintMode;
  onFootprintModeChange: (m: FootprintMode) => void;
  dz: number;
  onDzChange: (dz: number) => void;
  showCarto: boolean;
  onShowCartoChange: (v: boolean) => void;
  error: string | null;
}

export function CachePanel(props: CachePanelProps) {
  const [mode, setMode] = useAtom(expireModeAtom);
  const [selectedMaps, setSelectedMaps] = useAtom(selectedMapsAtom);
  const expireBbox = useAtomValue(viewportBboxAtom);
  const [zoom, setZoom] = useAtom(zoomAtom);

  // Switching to viewport mode clears the map selection.
  const onModeChange = useCallback(
    (next: ExpireMode) => {
      if (next === "viewport") setSelectedMaps([]);
      setMode(next);
    },
    [setSelectedMaps, setMode]
  );

  const { invalidate, running, result, error, reportError } =
    useTileInvalidation();

  const onExpire = useCallback(() => {
    const { body, error } = buildInvalidationBody({
      mode,
      selectedMaps,
      expireBbox,
      zoom,
    });
    if (body == null) {
      reportError(error ?? "Invalid selection");
      return;
    }
    invalidate(body);
  }, [mode, selectedMaps, expireBbox, zoom, invalidate, reportError]);

  const onClearSelection = () => setSelectedMaps([]);

  let target = null;
  if (mode === "map") {
    target = h(SelectedMapsList, {
      selectedMaps,
      onClear: onClearSelection,
    });
  } else {
    target = h(ViewportTargetInfo, { zoom });
  }

  let resultCallout = null;
  if (result != null) {
    resultCallout = h(InvalidationResultCallout, { result });
  }

  let errorCallout = null;
  if (error != null) {
    errorCallout = h(
      Callout,
      { className: "result-callout", intent: Intent.DANGER, title: "Error" },
      h("p", error)
    );
  }

  const canExpire = mode === "map" ? selectedMaps.length > 0 : zoom != null;

  return h("div.cache-panel", [
    h(
      FormGroup,
      { label: "Target", className: "field" },
      h(SegmentedControl, {
        fill: true,
        small: true,
        options: [
          { label: "Viewport", value: "viewport" },
          { label: "Map", value: "map" },
        ],
        value: mode,
        onValueChange: (v) => onModeChange(v as ExpireMode),
      })
    ),
    target,
    h(
      Button,
      {
        intent: Intent.DANGER,
        fill: true,
        loading: running,
        disabled: running || !canExpire,
        onClick: onExpire,
      },
      "Expire tiles"
    ),
    resultCallout,
    errorCallout,
    h(FootprintControls),
    h(AtomSwitch, {
      className: "carto-toggle",
      label: "Macrostrat map",
      atom: showCartoAtom,
    }),
    h(BaseLayerForm),
  ]);
}

function AtomSwitch(props: SwitchProps & { atom: PrimitiveAtom<boolean> }) {
  const { atom, ...rest } = props;
  const [checked, setChecked] = useAtom(atom);
  return h(Switch, {
    ...rest,
    checked: checked,
    onChange: (e) => setChecked(e.currentTarget.checked),
  });
}

/** Band summary like "small layer · zoom 3–5". */
function bandLabel(scale: string, minZoom: number, maxZoom: number): string {
  return `${scale} layer · zoom ${minZoom}–${maxZoom}`;
}

/** Selected maps, each with its scale band, plus a clear button at top right. */
function SelectedMapsList({
  selectedMaps,
  onClear,
}: {
  selectedMaps: SelectedMap[];
  onClear: () => void;
}) {
  if (selectedMaps.length === 0) {
    return h(
      Callout,
      { className: "target-info", intent: Intent.PRIMARY, icon: "select" },
      "Click map footprints to select them. Click again to deselect."
    );
  }

  const items = selectedMaps.map((m) => {
    const band = bandForScale(m.scale);
    return h("li.map-item", { key: m.source_id }, [
      h("span.map-name", m.name || m.slug),
      h(Tag, { minimal: true, className: "map-band" }, band.scale),
    ]);
  });

  return h("div.target-info", [
    h("div.list-header", [
      h("span", `${selectedMaps.length} map(s) selected`),
      h(Button, {
        minimal: true,
        small: true,
        icon: "cross",
        onClick: onClear,
        title: "Clear selection",
      }),
    ]),
    h("ul.map-list", items),
  ]);
}

function ViewportTargetInfo({ zoom }: { zoom: number | null }) {
  if (zoom == null) return h("p.target-info", "Waiting for the map…");

  const band = bandForZoom(zoom);
  return h("div.target-info", [
    h("p", "Expires the highlighted region for the carto layer at this zoom:"),
    h(
      Tag,
      { minimal: true },
      bandLabel(band.scale, band.minZoom, band.maxZoom)
    ),
  ]);
}

/** Controls for the footprints overlay: full maps vs. realized faces, and how
 * many zoom levels early to show footprints (dz). */
function FootprintControls() {
  const [footprintMode, onFootprintModeChange] = useAtom(footprintModeAtom);
  const [dz, onDzChange] = useAtom(zoomOffsetAtom);

  return h("div.footprint-controls", [
    h(
      FormGroup,
      { label: "Footprints", className: "field" },
      h(SegmentedControl, {
        fill: true,
        small: true,
        options: [
          { label: "All maps", value: "all" },
          { label: "Active faces", value: "active" },
        ],
        value: footprintMode,
        onValueChange: (v) => onFootprintModeChange(v as FootprintMode),
      })
    ),
    h(
      FormGroup,
      { label: "Show earlier by (zoom levels)", className: "field" },
      h(NumericInput, {
        value: dz,
        min: 0,
        max: 4,
        fill: true,
        onValueChange: (v) => onDzChange(Number.isNaN(v) ? 0 : v),
      })
    ),
  ]);
}

function InvalidationResultCallout({ result }: { result: InvalidationResult }) {
  const l1 = result.flushed_l1 ? "carto cache flushed" : "flush not applied";
  return h(
    Callout,
    {
      className: "result-callout",
      intent: Intent.SUCCESS,
      title: "Tiles expired",
    },
    [
      h("p", `L2 database: ${result.deleted_l2} tile(s) deleted`),
      h("p", `L1 Varnish: ${l1}`),
    ]
  );
}
