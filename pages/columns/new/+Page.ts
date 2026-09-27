/** `/columns/new` — start a column from nothing.
 *
 * Two phases on one route, because there is no id to navigate to: name the
 * column, then edit it. Nothing is written — a draft lives in the page until
 * it is exported as a units sheet, so the only way out is Export CSV. When a
 * write route exists this becomes a POST and a redirect to `edit/:col_id`.
 */
import hyper from "@macrostrat/hyper";
import { useCallback } from "react";
import { atom, Provider, useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  AnchorButton,
  Button,
  Callout,
  FormGroup,
  InputGroup,
  NumericInput,
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
import styles from "./new-column.module.sass";

const h = hyper.styled(styles);

const capabilities: Partial<LayoutCapabilities> = {
  modes: ["content-full"],
  defaultMode: "content-full",
  hasAssistant: false,
  itemName: "New column",
  contentScroll: "panel",
};

/** The page's state lives in a store of its own, so a new visit starts a new
 * column: the page renders outside the editor frame's scope, and atoms in the
 * default store would outlast it. */
export function Page() {
  return h(Provider, h(NewColumnPage));
}

/** The column being built, once the form has started it. */
const draftAtom = atom<ColumnEditorData | null>(null);

function NewColumnPage() {
  const draft = useAtomValue(draftAtom);
  const setDraft = useSetAtom(draftAtom);

  if (draft != null) {
    return h(ColumnEditorPage, { ...draft, edit: true });
  }
  return h(NewColumnForm, { onStart: setDraft });
}

/** The ingestion format's `col_type`: a measured section, whose units are
 * placed by height or depth, or a composite column, placed by age with
 * positions only as an ordering. Not switched later — it decides what a
 * unit's position *is*. */
type ColumnType = "section" | "column";

/** Which way a measured section's positions run: up from a datum, or down
 * from a surface (a core). */
type AxisType = "height" | "depth";

interface ColumnFields {
  col_name: string;
  col_group: string;
  project_id: number | null;
  col_type: ColumnType;
  axis_type: AxisType;
}

const columnTypeOptions = [
  { label: "Measured section", value: "section" },
  { label: "Composite column", value: "column" },
];

const axisTypeOptions = [
  { label: "Height", value: "height" },
  { label: "Depth", value: "depth" },
];

/** The form's fields. */
const fieldsAtom = atom<ColumnFields>({
  col_name: "",
  col_group: "",
  project_id: null,
  col_type: "section",
  axis_type: "height",
});

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
    // A composite column's axis is age; only a section declares a direction
    let axis_type: string = "age";
    if (fields.col_type === "section") axis_type = fields.axis_type;
    onStart(
      draftColumn({
        col_id: null,
        col_name: fields.col_name.trim(),
        col_group: fields.col_group.trim() || null,
        project_id: fields.project_id,
        col_type: fields.col_type,
        axis_type,
        t_units: 0,
      })
    );
  }, [fields, onStart]);

  let axisControl = null;
  if (fields.col_type === "section") {
    axisControl = h(
      FormGroup,
      {
        label: "Positions",
        helperText:
          "Height runs up from a datum, as in a measured section; depth runs down from the surface, as in a core.",
      },
      h(SegmentedControl, {
        options: axisTypeOptions,
        value: fields.axis_type,
        onValueChange: (v: string) => set("axis_type", v),
      })
    );
  }

  const canStart = fields.col_name.trim() !== "";

  return h(HybridPage, {
    className: "new-column-page",
    capabilities,
    actions: h(AlphaTag, {
      content:
        "An experimental column editor. A new column lives in the page until you export it.",
    }),
    content: h("div.new-column-form", [
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
            "A measured section places units by position; a composite column places them by age, with positions only as an ordering. This can't be changed once you start.",
        },
        h(SegmentedControl, {
          options: columnTypeOptions,
          value: fields.col_type,
          onValueChange: (v: string) => set("col_type", v),
        })
      ),
      axisControl,
      h(
        FormGroup,
        { label: "Group", helperText: "The column group this belongs to." },
        h(InputGroup, {
          value: fields.col_group,
          placeholder: "e.g. Illinois Basin",
          onValueChange: (v: string) => set("col_group", v),
        })
      ),
      h(
        FormGroup,
        { label: "Project", helperText: "Macrostrat project ID, if known." },
        h(NumericInput, {
          value: fields.project_id ?? "",
          min: 1,
          buttonPosition: "none",
          placeholder: "Project ID",
          onValueChange: (n: number) => set("project_id", isNaN(n) ? null : n),
          className: "project-id-input",
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
    ]),
  });
}
