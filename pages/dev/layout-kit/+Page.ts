/** Proving ground for the hybrid content/map page frame (`~/layouts/hybrid`).
 *
 * Content here is deliberately fake — the point is to exercise the *frame*:
 * mode switching, the derived assistant placement, chrome collapse, and the
 * per-page capability restrictions that real pages will use.
 */

import { Button, ButtonGroup, HTMLSelect, Tag } from "@blueprintjs/core";
import { useMemo, useState } from "react";
import classNames from "classnames";

import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

interface DemoItem {
  id: string;
  name: string;
  status: "active" | "paused" | "flagged";
  x: number;
  y: number;
}

const items: DemoItem[] = [
  { id: "1", name: "Riverside Depot", status: "active", x: 22, y: 38 },
  { id: "2", name: "Harborview Site", status: "active", x: 68, y: 20 },
  { id: "3", name: "North Ridge Facility", status: "paused", x: 44, y: 62 },
  { id: "4", name: "Elm Street Hub", status: "active", x: 80, y: 55 },
  { id: "5", name: "Lakeside Annex", status: "flagged", x: 30, y: 75 },
];

/** Capability presets standing in for the real pages this frame targets. */
const presets: Record<string, Partial<LayoutCapabilities>> = {
  "Column list (all modes)": {},
  "Column page (no full-bleed map)": {
    modes: ["content-only", "content-primary"],
    defaultMode: "content-primary",
  },
  "No assistant content": {
    hasAssistant: false,
  },
};

const presetNames = Object.keys(presets);

export function Page() {
  const [presetName, setPresetName] = useState(presetNames[0]);
  const [selectedID, setSelectedID] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((d) => d.id === selectedID) ?? null,
    [selectedID]
  );

  const capabilities = presets[presetName];

  return h(HybridPage, {
    // Capabilities are hydrated once per frame instance, so remount when the
    // demo switches presets.
    key: presetName,
    title: "Layout kit",
    capabilities,
    actions: h(PresetSelector, { presetName, setPresetName }),
    content: h(ContentPane, { selectedID, onSelect: setSelectedID }),
    map: h(MapPane, { selectedID, onSelect: setSelectedID }),
    assistant: h(AssistantPane, { selected }),
  });
}

function PresetSelector({ presetName, setPresetName }) {
  return h(HTMLSelect, {
    minimal: true,
    small: true,
    value: presetName,
    options: presetNames,
    onChange: (evt) => setPresetName(evt.currentTarget.value),
  });
}

function ContentPane({ selectedID, onSelect }) {
  return h([
    h("div.content-header", [
      h("p", `${items.length} sites — stand-in for a real data list`),
    ]),
    h(
      "div.item-list",
      items.map((item) =>
        h(ItemRow, {
          key: item.id,
          item,
          selected: item.id === selectedID,
          onSelect,
        })
      )
    ),
  ]);
}

function ItemRow({ item, selected, onSelect }) {
  return h(
    "div.item-row",
    {
      className: classNames({ selected }),
      onClick: () => onSelect(item.id),
    },
    [
      h(StatusDot, { status: item.status }),
      h("span.item-name", item.name),
      h(Tag, { minimal: true, size: "small" }, item.status),
    ]
  );
}

function StatusDot({ status }) {
  return h("span.status-dot", { className: `status-${status}` });
}

function MapPane({ selectedID, onSelect }) {
  return h("div.map-placeholder", [
    ...items.map((item) =>
      h(MapMarker, {
        key: item.id,
        item,
        selected: item.id === selectedID,
        onSelect,
      })
    ),
    h("p.map-note", "Map placeholder — no Mapbox instance in this demo"),
  ]);
}

function MapMarker({ item, selected, onSelect }) {
  return h("div.map-marker", {
    className: classNames(`status-${item.status}`, { selected }),
    style: { left: `${item.x}%`, top: `${item.y}%` },
    title: item.name,
    onClick: () => onSelect(item.id),
  });
}

function AssistantPane({ selected }) {
  let body = h(
    "p",
    "One site flagged this week. Select a site to see its details here — this pane moves between a column, an inset under the map, and a floating panel as the layout mode changes."
  );

  if (selected != null) {
    body = h([
      h("p", [
        h("strong", selected.name),
        " is currently ",
        h("em", selected.status),
        ".",
      ]),
      h(ButtonGroup, { minimal: true, small: true }, [
        h(Button, { icon: "edit" }, "Edit"),
        h(Button, { icon: "share" }, "Open"),
      ]),
    ]);
  }

  return h("div.assistant", [h("h2", "Details"), body]);
}
