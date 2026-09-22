/** `/dev/column-editor-2` — pick a column to edit, or start a new one.
 *
 * The map lives here rather than in the editor: choosing *which* column to
 * work on is a different task from working on it, and the editor wants the
 * whole window (see `../editor-shell.ts`).
 *
 * Which columns the map draws is the shared project filter
 * (`~/components/project-filter`), in `?project_id=`. Unset is the API's
 * default "Core columns" composite; picking a project reaches the rest of
 * Macrostrat's set — eODP, Deep Sea, New Zealand — which is the only way to
 * open a column outside the core compilation for editing.
 */
import hyper from "@macrostrat/hyper";
import { useCallback, useMemo, useState } from "react";
import { navigate } from "vike/client/router";
import {
  AnchorButton,
  Button,
  Callout,
  ControlGroup,
  NumericInput,
} from "@blueprintjs/core";
import { atom } from "jotai";
import { MacrostratDataProvider } from "@macrostrat/data-provider";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { onDemand } from "~/_utils";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import { AlphaTag } from "~/components";
import { ColumnMapSlot } from "~/components/column-map/target";
import {
  InProcessFilterProvider,
  InProcessFilterTag,
  InProcessSwitch,
  useShowInProcess,
  type InProcessFilterAtom,
} from "~/components/in-process-filter";
import {
  parseProjectFilter,
  projectIDParam,
  ProjectFilterControl,
  ProjectFilterProvider,
  ProjectFilterTag,
  serializeProjectFilter,
  useProjectIDs,
  type ProjectFilterAtom,
  type ProjectFilterValue,
} from "~/components/project-filter";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import { DEFAULT_COLUMN_ID, editorHref, newColumnHref } from "../data";
import styles from "./picker.module.sass";

const h = hyper.styled(styles);

/** The picker is about one column at a time, so nothing is multi-selected.
 * Stable, so the slot doesn't re-target on every render. */
const EMPTY_SELECTION: number[] = [];

/** The `/columns` subtree keeps one warm Mapbox instance in its layout and
 * pages move it into their slot (see `~/components/column-map/target`). This
 * page sits outside that subtree, so it mounts the instance half itself.
 * Client-only — it reaches mapbox-gl. */
const ColumnPersistentMap = onDemand(() =>
  import("~/components/column-map/persistent-map.client").then(
    (mod) => mod.ColumnPersistentMap
  )
);

const capabilities: Partial<LayoutCapabilities> = {
  modes: ["map-primary", "content-primary"],
  defaultMode: "map-primary",
  hasAssistant: false,
  itemName: "Picker",
  contentScroll: "panel",
};

/** The project scope, in `?project_id=` beside the editor's own parameters. */
const projectParamAtom = atomWithSearchParam("project_id");

const pickerProjectFilterAtom: ProjectFilterAtom = atom(
  (get) => parseProjectFilter(get(projectParamAtom)),
  (get, set, value: ProjectFilterValue) => {
    set(projectParamAtom, serializeProjectFilter(value));
  }
);

/** In-process columns are the ones most likely to want editing, so they are
 * drawn by default here — unlike the column list, where the default is the
 * published set. Not a URL parameter: it only changes what the map offers. */
const pickerInProcessAtom: InProcessFilterAtom = atom(true);

export function Page() {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(HybridPage, {
      className: "column-picker-page",
      capabilities,
      // Inside the frame's jotai scope, so the map, the dropdown and the tags
      // share atom cells — `HybridPage` mounts its own `Provider`, and the same
      // atom read on either side of one is a different cell.
      wrap: (node) =>
        h(
          ProjectFilterProvider,
          { atom: pickerProjectFilterAtom },
          h(InProcessFilterProvider, { atom: pickerInProcessAtom }, node)
        ),
      actions: h([
        h(ProjectFilterControl, { key: "projects" }),
        h(AlphaTag, {
          key: "alpha",
          content:
            "An experimental column editor. Edits stay in the page — there is no write API yet.",
        }),
      ]),
      filterBar: h([
        h(ProjectFilterTag, { key: "project" }),
        h(InProcessFilterTag, { key: "in-process" }),
      ]),
      content: h(PickerPanel),
      map: h(PickerMap),
    })
  );
}

function PickerPanel() {
  return h("div.picker-panel", [
    h("h1", "Column editor"),
    h(
      "p.lead",
      "Click a column on the map to edit its units and age model, or open one by ID."
    ),
    h(OpenByID),
    h("h2", "Scope"),
    h(
      "p",
      "The map draws the core compilation by default. Choose a project to reach the rest of Macrostrat's columns."
    ),
    h(InProcessSwitch, { label: "In-process columns" }),
    h("h2", "Start from nothing"),
    h(
      "p",
      "Build a column by hand, then export it as a units sheet in the column-ingestion format."
    ),
    h(AnchorButton, {
      icon: "add",
      text: "New column",
      href: newColumnHref,
      intent: "primary",
    }),
    h(
      Callout,
      { intent: "warning", icon: "warning-sign", className: "no-writes" },
      "Nothing here is saved. There is no write route yet, so an editing session lives in the page until you export it."
    ),
  ]);
}

function OpenByID() {
  const [value, setValue] = useState<number>(DEFAULT_COLUMN_ID);

  const go = useCallback(() => {
    if (value == null || isNaN(value)) return;
    navigate(editorHref(value));
  }, [value]);

  return h(ControlGroup, { className: "open-by-id" }, [
    h(NumericInput, {
      value,
      min: 1,
      buttonPosition: "none",
      placeholder: "Column ID",
      onValueChange: (n: number) => setValue(n),
      onKeyDown(evt) {
        if (evt.key === "Enter") go();
      },
      className: "column-id-input",
    }),
    h(Button, { icon: "arrow-right", onClick: go, text: "Open" }),
  ]);
}

function PickerMap() {
  const onSelectColumn = useCallback((colID: number | null) => {
    if (colID == null) return;
    navigate(editorHref(colID));
  }, []);

  const projectIDs = useProjectIDs();
  const inProcess = useShowInProcess();
  const projectID = useMemo(
    () => projectIDParam(projectIDs ?? null),
    [projectIDs?.join(",")]
  );

  // The map refits when its target key changes, which is what a change of
  // project scope wants: the new project's columns are somewhere else.
  const targetKey = `column-editor-picker:${projectID ?? "core"}`;

  return h("div.picker-map-pane", [
    h(
      ColumnMapSlot,
      {
        className: "column-map",
        targetKey,
        projectID,
        inProcess,
        visibleColumnIDs: null,
        selectedColumnIDs: EMPTY_SELECTION,
        selectedColumn: null,
        onSelectColumn,
      },
      h("div.map-hint", "Click a column to edit it")
    ),
    h(ColumnPersistentMap),
  ]);
}
