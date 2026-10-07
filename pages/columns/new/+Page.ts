/** `/columns/new` — start a column from nothing.
 *
 * Two phases on one route, because there is no id to navigate to: name the
 * column, then edit it. Nothing is written — a draft lives in the page until
 * it is exported as a units sheet, so the only way out is Export CSV. When a
 * write route exists this becomes a POST and a redirect to `edit/:col_id`.
 */
import hyper from "@macrostrat/hyper";
import { useCallback, useMemo, useState } from "react";
import { atom, createStore, Provider, useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  AnchorButton,
  Button,
  Callout,
  FormGroup,
  InputGroup,
  SegmentedControl,
} from "@blueprintjs/core";
import { AlphaTag } from "~/components";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import { ColumnEditorPage } from "../@column/column-editor/editor-shell";
import {
  type ColumnEditorData,
  COLUMNS_INDEX,
  draftColumn,
} from "../@column/column-editor/data";
import { EditorScopeProvider } from "../@column/column-editor/state";
import {
  GroupSelect,
  ProjectSelect,
  type GroupDef,
} from "../@column/column-editor/project-fields";
import styles from "./new-column.module.sass";
import { ColumnUpload, previewFromOpener } from "./column-upload.ts";

const h = hyper.styled(styles);

const capabilities: Partial<LayoutCapabilities> = {
  modes: ["content-full"],
  defaultMode: "content-full",
  hasAssistant: false,
  itemName: "New column",
  contentScroll: "panel",
};

// Stable empty array so the slot doesn't re-target every render.
const NO_SELECTION: number[] = [];

/** The page's state lives in stores of its own, so a new visit starts a new
 * column: the form's atoms in a jotai provider, the editor's in a fresh
 * editing-session store (there is no column id to key one by). */
export function Page() {
  const session = useMemo(() => createStore(), []);
  return h(Provider, h(EditorScopeProvider, { store: session }, h(NewColumnPage)));
}

/** The column being built, once the form has started it. */
const draftAtom = atom<ColumnEditorData | null>(null);

function NewColumnPage() {
  const draft = useAtomValue(draftAtom);
  const setDraft = useSetAtom(draftAtom);
  // Read once, so the editor gets a stable draft rather than a new one per render.
  const [fromOpener] = useState(previewFromOpener);

  const current = draft ?? fromOpener;
  if (current != null) {
    return h(ColumnEditorPage, { ...current, edit: true });
  }

  return h(NewColumnFormContainer, { onStart: setDraft });
}

/** The ingestion format's `col_type`: a measured section, whose units are
 * placed by height or depth, or a composite column, placed by age with
 * positions only as an ordering. Not switched later — it decides what a
 * unit's position *is*. */
type ColumnType = "section" | "column";

/** What a unit's positions are: height up from a datum, depth down from a
 * surface (a core), or only an order — the format's `age`. */
type AxisType = "height" | "depth" | "age";

interface ColumnFields {
  col_name: string;
  col_group_id: number | null;
  col_group: string | null;
  project_id: number | null;
  col_type: ColumnType;
  axis_type: AxisType;
}

const columnTypeOptions = [
  { label: "Measured", value: "section" },
  { label: "Composite", value: "column" },
];

const axisTypeOptions = [
  { label: "Height", value: "height" },
  { label: "Depth", value: "depth" },
  { label: "Ordinal", value: "age" },
];

const defaultAxisType: Record<ColumnType, AxisType> = {
  section: "height",
  column: "age",
};

/** The form's fields. */
const fieldsAtom = atom<ColumnFields>({
  col_name: "",
  col_group_id: null,
  col_group: null,
  project_id: null,
  col_type: "section",
  axis_type: "height",
});

const showUploadFormAtom = atom<boolean>(true);

function NewColumnFormContainer({
  onStart,
}: {
  onStart: (data: ColumnEditorData) => void;
}) {
  const [showUploadForm, setShowUploadForm] = useAtom(showUploadFormAtom);

  let formContent: any = h(NewColumnForm, { onStart });
  if (showUploadForm) {
    formContent = h("div.column-upload", [
      h("h1", "Upload a spreadsheet"),
      h(ColumnUpload, { onOpenColumn: onStart }),
    ]);
  }

  const formTypePicker = h("div.form-type-picker", [
    h(SegmentedControl, {
      options: [
        { label: "Upload data", value: true },
        { label: "Start from scratch", value: false },
      ],
      value: showUploadForm,
      onValueChange: (v: boolean) => setShowUploadForm(v),
    }),
  ]);

  const content = h("div.new-column-page", [formTypePicker, formContent]);

  return h(HybridPage, {
    className: "new-column-page",
    capabilities,
    actions: h(AlphaTag, {
      content:
        "An experimental column editor. A new column lives in the page until you export it.",
    }),
    content,
  });
}

function NewColumnForm({
  onStart,
}: {
  onStart: (data: ColumnEditorData) => void;
}) {
  const [fields, setFields] = useAtom(fieldsAtom);

  const set = useCallback((key: keyof ColumnFields, value: any) => {
    setFields((f) => ({ ...f, [key]: value }));
  }, []);

  const start = useCallback(() => {
    if (fields.col_name.trim() === "") return;
    onStart(
      draftColumn({
        col_id: null,
        col_name: fields.col_name.trim(),
        col_group_id: fields.col_group_id,
        col_group: fields.col_group,
        project_id: fields.project_id,
        col_type: fields.col_type,
        axis_type: fields.axis_type,
        t_units: 0,
      })
    );
  }, [fields, onStart]);

  const setProject = (project_id: number | null) => {
    // A group belongs to one project
    setFields((f) => ({ ...f, project_id, col_group_id: null, col_group: null }));
  };

  const setGroup = (group: GroupDef | null) => {
    setFields((f) => ({
      ...f,
      col_group_id: group?.col_group_id ?? null,
      col_group: group?.name ?? null,
    }));
  };

  const setType = (col_type: ColumnType) => {
    setFields((f) => ({ ...f, col_type, axis_type: defaultAxisType[col_type] }));
  };

  const canStart = fields.col_name.trim() !== "";

  return h("div.new-column-form", [
    h("h1", "New column"),
    h(
      "p.lead",
      "Name the column and say what kind it is, then build up its units in the editor. Export writes a units sheet in the column-ingestion format."
    ),
    h(
      FormGroup,
      { label: "Column name", labelInfo: "(required)" },
      h(InputGroup, {
        value: fields.col_name,
        placeholder: "e.g. Illinois Basin — Springfield",
        autoFocus: true,
        onValueChange: (v: string) => set("col_name", v),
        onKeyDown(evt) {
          if (evt.key === "Enter") start();
        },
      })
    ),
    h(
      FormGroup,
      {
        label: "Column type",
        helperText:
          "A measured column places units by position; a composite column places them by age, with positions only as an ordering. This can't be changed once you start.",
      },
      h(SegmentedControl, {
        options: columnTypeOptions,
        value: fields.col_type,
        onValueChange: (v: string) => setType(v as ColumnType),
      })
    ),
    h(
      FormGroup,
      {
        label: "Positions",
        helperText:
          "Height runs up from a datum; depth runs down from the surface, as in a core; ordinal positions are only an order.",
      },
      h(SegmentedControl, {
        options: axisTypeOptions,
        value: fields.axis_type,
        onValueChange: (v: string) => set("axis_type", v),
      })
    ),
    h(
      FormGroup,
      { label: "Project" },
      h(ProjectSelect, { value: fields.project_id, onChange: setProject })
    ),
    h(
      FormGroup,
      { label: "Group", helperText: "The column group this belongs to." },
      h(GroupSelect, {
        project_id: fields.project_id,
        value: fields.col_group_id,
        label: fields.col_group,
        onChange: setGroup,
      })
    ),
    h("div.form-actions", [
      h(Button, {
        icon: "arrow-right",
        text: "Start editing",
        intent: "primary",
        disabled: !canStart,
        onClick: start,
      }),
      h(AnchorButton, { text: "Cancel", href: COLUMNS_INDEX, minimal: true }),
    ]),
    h(
      Callout,
      { intent: "warning", icon: "warning-sign" },
      "Nothing is saved. There is no write route yet, so the column exists only in this page until you export it."
    ),
  ]);
}
