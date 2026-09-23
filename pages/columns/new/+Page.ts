/** `/columns/new` — start a column from nothing.
 *
 * Two phases on one route, because there is no id to navigate to: name the
 * column, then edit it. Nothing is written — a draft lives in the page until
 * it is exported as a units sheet, so the only way out is Export CSV. When a
 * write route exists this becomes a POST and a redirect to `edit/:col_id`.
 */
import hyper from "@macrostrat/hyper";
import { useCallback, useState } from "react";
import {
  AnchorButton,
  Button,
  Callout,
  FormGroup,
  InputGroup,
  NumericInput,
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

export function Page() {
  const [draft, setDraft] = useState<ColumnEditorData | null>(null);

  if (draft != null) {
    return h(ColumnEditorPage, { ...draft, edit: true });
  }
  return h(NewColumnForm, { onStart: setDraft });
}

interface ColumnFields {
  col_name: string;
  col_group: string;
  project_id: number | null;
}

function NewColumnForm({
  onStart,
}: {
  onStart: (data: ColumnEditorData) => void;
}) {
  const [fields, setFields] = useState<ColumnFields>({
    col_name: "",
    col_group: "",
    project_id: null,
  });

  const set = useCallback((key: keyof ColumnFields, value: any) => {
    setFields((f) => ({ ...f, [key]: value }));
  }, []);

  const start = useCallback(() => {
    if (fields.col_name.trim() === "") return;
    onStart(
      draftColumn({
        col_id: null,
        col_name: fields.col_name.trim(),
        col_group: fields.col_group.trim() || null,
        project_id: fields.project_id,
        t_units: 0,
      })
    );
  }, [fields, onStart]);

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
        "Name the column, then build up its units in the editor. Export writes a units sheet in the column-ingestion format."
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
