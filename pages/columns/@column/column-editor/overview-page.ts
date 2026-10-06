/** The editor's front page: the column's own fields, with the column drawn
 * beside them as it now stands.
 *
 * Name, group, project, kind, status and description are the metadata a
 * column carries apart from its units and its footprint; they are edited
 * here as a transaction over the loaded summary (`state/metadata`). The
 * column graphic is the units editor's own, read-only, so a change made on
 * the units page shows here too — one session, three pages. */
import hyper from "@macrostrat/hyper";
import {
  Callout,
  FormGroup,
  HTMLSelect,
  InputGroup,
  NumericInput,
  SegmentedControl,
  TextArea,
} from "@blueprintjs/core";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import { EditorColumn } from "./column-view";
import { EditChrome, EditTitleContext } from "./edit-chrome";
import {
  ColumnFocusProvider,
  editMetadataAtom,
  editedUnitsAtom,
  metadataAtom,
  snapshotAtom,
  useAtomValue,
  useSetAtom,
  type ColumnMetadata,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const capabilities: Partial<LayoutCapabilities> = {
  modes: ["content-full"],
  defaultMode: "content-full",
  hasAssistant: false,
  itemName: "Editor",
  contentScroll: "panel",
};

export function OverviewPage() {
  const snapshot = useAtomValue(snapshotAtom);
  return h(HybridPage, {
    key: snapshot?.col_id ?? "draft",
    className: "column-editor-page overview-page",
    capabilities,
    wrap: (node) => h(ColumnFocusProvider, node),
    titleAdornment: h(EditTitleContext),
    actions: h(EditChrome, { current: "overview" }),
    content: h("div.overview-content", [
      h("div.overview-form-pane", h(MetadataForm)),
      h("div.overview-column-pane", h(ErrorBoundary, h(ColumnPreview))),
    ]),
  });
}

const COLUMN_TYPES = [
  { label: "Measured section", value: "section" },
  { label: "Composite column", value: "column" },
];

const AXIS_TYPES: Record<ColumnMetadata["col_type"], { label: string; value: string }[]> = {
  section: [
    { label: "Height", value: "height" },
    { label: "Depth", value: "depth" },
  ],
  column: [{ label: "Age", value: "age" }],
};

const STATUS_OPTIONS = [
  { label: "In process", value: "in process" },
  { label: "Active", value: "active" },
  { label: "Obsolete", value: "obsolete" },
];

function MetadataForm() {
  const metadata = useAtomValue(metadataAtom);
  const edit = useSetAtom(editMetadataAtom);
  const snapshot = useAtomValue(snapshotAtom);

  const setType = (col_type: ColumnMetadata["col_type"]) => {
    // A composite column's axis is age; a section declares a direction
    let axis_type: ColumnMetadata["axis_type"] = "age";
    if (col_type === "section") axis_type = metadata.axis_type === "age" ? "height" : metadata.axis_type;
    edit({ col_type, axis_type });
  };

  let typeNote = null;
  if ((snapshot?.units?.length ?? 0) > 0) {
    typeNote = h(
      Callout,
      { intent: "primary", icon: "info-sign", compact: true },
      "Changing the kind of column changes what a unit's position means. The units keep their values; check them on the Units page."
    );
  }

  return h("div.metadata-form", [
    h(
      FormGroup,
      { label: "Column name", labelInfo: "(required)" },
      h(InputGroup, {
        value: metadata.col_name,
        onValueChange: (col_name: string) => edit({ col_name }),
      })
    ),
    h(
      FormGroup,
      { label: "Group", helperText: "The column group this belongs to." },
      h(InputGroup, {
        value: metadata.col_group ?? "",
        onValueChange: (value: string) => edit({ col_group: value || null }),
      })
    ),
    h(
      FormGroup,
      { label: "Project", helperText: "Macrostrat project id." },
      h(NumericInput, {
        value: metadata.project_id ?? "",
        min: 1,
        buttonPosition: "none",
        className: "project-id-input",
        onValueChange: (n: number) => edit({ project_id: isNaN(n) ? null : n }),
      })
    ),
    h(
      FormGroup,
      {
        label: "Column type",
        helperText:
          "A measured section places units by position; a composite column places them by age.",
      },
      h(SegmentedControl, {
        small: true,
        options: COLUMN_TYPES,
        value: metadata.col_type,
        onValueChange: (v: string) => setType(v as ColumnMetadata["col_type"]),
      })
    ),
    h(
      FormGroup,
      { label: "Positions" },
      h(SegmentedControl, {
        small: true,
        options: AXIS_TYPES[metadata.col_type],
        value: metadata.axis_type,
        onValueChange: (v: string) => edit({ axis_type: v as ColumnMetadata["axis_type"] }),
      })
    ),
    h(
      FormGroup,
      {
        label: "Status",
        helperText: "Only active columns are published through the API.",
      },
      h(HTMLSelect, {
        value: metadata.status_code,
        options: STATUS_OPTIONS,
        onChange: (evt: any) =>
          edit({ status_code: evt.currentTarget.value as ColumnMetadata["status_code"] }),
      })
    ),
    h(
      FormGroup,
      { label: "Description" },
      h(TextArea, {
        value: metadata.description ?? "",
        fill: true,
        autoResize: true,
        onChange: (evt: any) => edit({ description: evt.currentTarget.value || null }),
      })
    ),
    typeNote,
  ]);
}

/** The column as it stands in the session, or a word when it has no units. */
function ColumnPreview() {
  const units = useAtomValue(editedUnitsAtom);
  if (units.length === 0) {
    return h("div.column-placeholder", "No units yet — add them on the Units page.");
  }
  return h(EditorColumn);
}
