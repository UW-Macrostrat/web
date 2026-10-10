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
  Button,
  Callout,
  FormGroup,
  HTMLSelect,
  InputGroup,
  SegmentedControl,
  TextArea,
} from "@blueprintjs/core";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { useAuth } from "@macrostrat/form-components";
import { useCallback, useState } from "react";
import { isAdminSession } from "~/components/auth";
import { updateColumnPlacement } from "./ingest-api";
import { metadataEditsAtom } from "./state/metadata";
import { PatternProvider } from "~/_providers";
import { GroupSelect, ProjectSelect, type GroupDef } from "./project-fields";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import { EditorColumn } from "./column-view";
import { EditChrome, EditTitleContext } from "./edit-chrome";
import {
  ColumnFocusProvider,
  editMetadataAtom,
  editedUnitsAtom,
  loadedMetadataAtom,
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
    wrap: (node) => h(PatternProvider, h(ColumnFocusProvider, node)),
    titleAdornment: h(EditTitleContext),
    actions: h(EditChrome, { current: "overview" }),
    content: h("div.overview-content", [
      h("div.overview-form-pane", h(MetadataForm)),
      h("div.overview-column-pane", h(ErrorBoundary, h(ColumnPreview))),
    ]),
  });
}

/** For a column already in the database: write a changed project or group
 * straight away, without re-ingesting the units. Administrators only. */
function MovePlacement({
  metadata,
  changed,
}: {
  metadata: ColumnMetadata;
  changed: boolean;
}) {
  const snapshot = useAtomValue(snapshotAtom);
  const setSnapshot = useSetAtom(snapshotAtom);
  const setEdits = useSetAtom(metadataEditsAtom);
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colID = snapshot?.col_id ?? 0;

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await updateColumnPlacement(colID, {
        project_id: metadata.project_id,
        col_group_id: metadata.col_group_id,
        col_group: metadata.col_group_id == null ? metadata.col_group : null,
      });
      // The saved placement is the loaded one now, so the edits for it clear.
      setSnapshot((prev) => {
        if (prev == null) return prev;
        return {
          ...prev,
          columnInfo: {
            ...prev.columnInfo,
            project_id: result.project_id,
            project: result.project,
            col_group_id: result.col_group_id,
            col_group: result.col_group,
          },
        };
      });
      setEdits(({ project_id, col_group_id, col_group, ...rest }) => rest);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, [colID, metadata, setSnapshot, setEdits]);

  if (colID <= 0 || !changed) return null;

  if (!isAdminSession(user)) {
    return h(
      Callout,
      { intent: "primary", icon: "info-sign", compact: true },
      "Only an administrator can move a column to another project or group."
    );
  }

  let errorNode = null;
  if (error != null)
    errorNode = h(Callout, { intent: "danger", compact: true }, error);

  return h("div.move-placement", [
    h(Button, {
      icon: "exchange",
      intent: "primary",
      text: "Move column",
      loading: busy,
      disabled: metadata.project_id == null,
      title: "Change the project and group of this column in the database",
      onClick: save,
    }),
    errorNode,
  ]);
}

const COLUMN_TYPES = [
  { label: "Measured", value: "section" },
  { label: "Composite", value: "column" },
];

// The ingestion format spells ordinal positions `age`
const AXIS_TYPES = [
  { label: "Height", value: "height" },
  { label: "Depth", value: "depth" },
  { label: "Ordinal", value: "age" },
];

const DEFAULT_AXIS_TYPE: Record<
  ColumnMetadata["col_type"],
  ColumnMetadata["axis_type"]
> = {
  section: "height",
  column: "age",
};

const STATUS_OPTIONS = [
  { label: "In process", value: "in process" },
  { label: "Active", value: "active" },
  { label: "Obsolete", value: "obsolete" },
];

function MetadataForm() {
  const metadata = useAtomValue(metadataAtom);
  const edit = useSetAtom(editMetadataAtom);
  const loaded = useAtomValue(loadedMetadataAtom);
  const snapshot = useAtomValue(snapshotAtom);

  const setProject = (project_id: number | null) => {
    if (project_id === metadata.project_id) return;
    // A group belongs to one project
    edit({ project_id, col_group_id: null, col_group: null });
  };

  const setGroup = (group: GroupDef | null) => {
    edit({
      col_group_id: group?.col_group_id ?? null,
      col_group: group?.name ?? null,
    });
  };

  const placementChanged =
    metadata.project_id !== loaded.project_id ||
    metadata.col_group_id !== loaded.col_group_id ||
    metadata.col_group !== loaded.col_group;

  const setType = (col_type: ColumnMetadata["col_type"]) => {
    edit({ col_type, axis_type: DEFAULT_AXIS_TYPE[col_type] });
  };

  const typeChanged = metadata.col_type !== loaded.col_type;
  let typeNote = null;
  if (typeChanged && (snapshot?.units?.length ?? 0) > 0) {
    typeNote = h(
      Callout,
      { intent: "warning", icon: "warning-sign", compact: true },
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
      { label: "Project" },
      h(ProjectSelect, { value: metadata.project_id, onChange: setProject })
    ),
    h(
      FormGroup,
      {
        label: "Group",
        helperText:
          "The column group this belongs to; a new one is created on write.",
      },
      h(GroupSelect, {
        project_id: metadata.project_id,
        value: metadata.col_group_id,
        label: metadata.col_group,
        allowCreate: true,
        onChange: setGroup,
      })
    ),
    h(MovePlacement, { metadata, changed: placementChanged }),
    h(
      FormGroup,
      {
        label: "Column type",
        helperText:
          "A measured column places units by position; a composite column places them by age.",
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
        options: AXIS_TYPES,
        value: metadata.axis_type,
        onValueChange: (v: string) =>
          edit({ axis_type: v as ColumnMetadata["axis_type"] }),
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
          edit({
            status_code: evt.currentTarget
              .value as ColumnMetadata["status_code"],
          }),
      })
    ),
    h(
      FormGroup,
      { label: "Description" },
      h(TextArea, {
        value: metadata.description ?? "",
        fill: true,
        autoResize: true,
        onChange: (evt: any) =>
          edit({ description: evt.currentTarget.value || null }),
      })
    ),
    typeNote,
  ]);
}

/** The column as it stands in the session, or a word when it has no units. */
function ColumnPreview() {
  const units = useAtomValue(editedUnitsAtom);
  if (units.length === 0) {
    return h(
      "div.column-placeholder",
      "No units yet — add them on the Units page."
    );
  }
  return h(EditorColumn);
}
