/** One record's fields as a form, from the same column spec the sheet uses.
 *
 * The details pane's editing surface: the column's `name` is the label, its
 * `valueRenderer` draws the value, its `cellDetail` is the editor when it has
 * one (the lithology and interval pickers), and otherwise an input follows
 * from `dataType`. Locked and derived columns show read-only, and the whole
 * form is a read-only viewer in table mode — so the same panel serves
 * `/columns/:id/table` and `/columns/:id/edit`. Because it is fed the row and
 * the transaction rather than the sheet, it keeps working with the table
 * hidden, which is how a column is edited one record at a time.
 *
 * **Cross-repo note.** A mirror of `RowEditor` in `@macrostrat/data-sheet`
 * (same props, same class names) until that release reaches `web`; swapping
 * to the library component is an import change.
 */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { type ReactNode, useEffect, useState } from "react";
import {
  Button,
  FormGroup,
  InputGroup,
  type Intent,
  Switch,
  Tag,
  TextArea,
} from "@blueprintjs/core";
import type {
  CellDetailContext,
  CellValidation,
  ColumnSpec,
} from "@macrostrat/data-sheet";
import type { EditorColumnSpec } from "./sheets";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export interface RowEditorProps<T = any> {
  columnSpec: EditorColumnSpec[];
  /** The row as loaded. */
  row: T;
  /** The transaction's entry for this row: the fields that differ. */
  edits?: Partial<T> | null;
  editable?: boolean;
  onChange?: (columnKey: string, value: any) => void;
  onResetField?: (columnKey: string) => void;
  /** Also show the columns the sheet hides (read-only). */
  showHidden?: boolean;
  header?: ReactNode;
  className?: string;
}

export function RowEditor<T = any>(props: RowEditorProps<T>) {
  const {
    columnSpec,
    row,
    edits,
    editable = true,
    onChange,
    onResetField,
    showHidden = false,
    header,
    className,
  } = props;

  const merged: any = { ...(row ?? {}), ...(edits ?? {}) };
  const canEdit = editable && onChange != null;

  const fields = columnSpec
    .filter((col) => showHidden || !col.hidden)
    .map((col, colIndex) => {
      const value = merged[col.key];
      const writable = canEdit && col.editable !== false && !col.derived;
      const isEdited = edits != null && col.key in edits;
      const validation = validateField(col, value, merged);
      const ctx: CellDetailContext = {
        value,
        rowIndex: -1,
        colIndex,
        column: col,
        row: merged,
        isEdited,
        isDeleted: false,
        status: undefined,
        validation,
        editable: writable,
        onChange(next) {
          if (!writable) return;
          onChange?.(col.key, next);
        },
        resetValue() {
          onResetField?.(col.key);
        },
        close() {},
      };
      let onReset: (() => void) | null = null;
      if (isEdited && onResetField != null) onReset = ctx.resetValue;
      return h(RowEditorField, { key: col.key, ctx, onReset });
    });

  return h(
    "div.row-editor",
    { className: classNames(className, { editable: canEdit }) },
    [header, h("div.row-editor-fields", fields)]
  );
}

function validateField(
  col: ColumnSpec,
  value: any,
  row: any
): CellValidation | null {
  const isEmpty = value == null || value === "";
  if (col.required && isEmpty) {
    return { severity: "error", message: `${col.name} is required` };
  }
  if (col.validate != null) return col.validate(value, row, { rowIndex: -1 });
  return null;
}

/* ------------------------------------------------------------------ field */

function RowEditorField({
  ctx,
  onReset,
}: {
  ctx: CellDetailContext;
  onReset: (() => void) | null;
}) {
  const col = ctx.column as EditorColumnSpec;
  const { validation, isEdited, editable } = ctx;

  let intent: Intent | undefined;
  if (validation?.severity === "error") {
    intent = "danger";
  } else if (validation?.severity === "warning") {
    intent = "warning";
  }

  let marker: ReactNode = null;
  if (col.derived) {
    marker = h(
      Tag,
      {
        minimal: true,
        icon: "function",
        className: "field-marker",
        title: "Derived — computed from other values",
      },
      "derived"
    );
  }

  let reset: ReactNode = null;
  if (onReset != null) {
    reset = h(Button, {
      icon: "undo",
      minimal: true,
      small: true,
      className: "reset-field",
      title: "Revert to the loaded value",
      onClick: onReset,
    });
  }

  return h(
    FormGroup,
    {
      label: h("span.field-label", [
        h("span.field-name", col.name),
        marker,
        reset,
      ]),
      intent,
      helperText: validation?.message,
      className: classNames("row-editor-field", {
        edited: isEdited,
        derived: col.derived,
        "read-only": !editable,
      }),
    },
    h(FieldSurface, { ctx })
  );
}

/** The value or its editor: the column's own `cellDetail` when it has one,
 * else the value through its renderer, else a default input by `dataType`. */
function FieldSurface({ ctx }: { ctx: CellDetailContext }) {
  const { column: col, editable } = ctx;
  if (col.cellDetail != null) {
    return h("div.field-surface", col.cellDetail(ctx));
  }
  if (!editable) {
    return h(FieldValue, { ctx });
  }
  return h(DefaultFieldEditor, { ctx });
}

function FieldValue({ ctx }: { ctx: CellDetailContext }) {
  const { value, column: col } = ctx;
  if (value == null || value === "") {
    return h("span.field-value.empty", "—");
  }
  const rendered = col.valueRenderer?.(value, ctx) ?? String(value);
  return h("span.field-value", rendered);
}

function DefaultFieldEditor({ ctx }: { ctx: CellDetailContext }) {
  const { value, column: col, onChange } = ctx;
  const type = col.dataType ?? "string";

  if (type === "boolean") {
    return h(Switch, {
      checked: Boolean(value),
      onChange: (evt: any) => onChange(evt.target.checked),
    });
  }
  if (type === "text") {
    return h(CommittedTextArea, { value, onCommit: onChange });
  }
  if (type === "number" || type === "integer") {
    return h(CommittedInput, {
      value,
      type: "number",
      step: type === "integer" ? 1 : "any",
      onCommit: (text: string) => onChange(parseNumber(text, type)),
    });
  }
  if (type === "object" || type === "array") {
    // Structured values want a `cellDetail`; show the value so the form is
    // still complete.
    return h(FieldValue, { ctx });
  }
  return h(CommittedInput, { value, onCommit: onChange });
}

function parseNumber(text: string, type: "number" | "integer") {
  if (text === "" || text == null) return null;
  const n = type === "integer" ? parseInt(text, 10) : parseFloat(text);
  if (isNaN(n)) return text;
  return n;
}

/** Commits on blur or Enter, the way a sheet cell does, so a half-typed
 * number doesn't move the column. */
function CommittedInput({
  value,
  onCommit,
  ...rest
}: {
  value: any;
  onCommit: (text: string) => void;
  [key: string]: any;
}) {
  const [text, setText] = useState(toText(value));
  useEffect(() => {
    setText(toText(value));
  }, [value]);
  const commit = () => {
    if (text === toText(value)) return;
    onCommit(text);
  };
  return h(InputGroup, {
    small: true,
    fill: true,
    value: text,
    onValueChange: setText,
    onBlur: commit,
    onKeyDown(evt) {
      if (evt.key === "Enter") commit();
      if (evt.key === "Escape") setText(toText(value));
    },
    ...rest,
  });
}

function CommittedTextArea({
  value,
  onCommit,
}: {
  value: any;
  onCommit: (text: string) => void;
}) {
  const [text, setText] = useState(toText(value));
  useEffect(() => {
    setText(toText(value));
  }, [value]);
  return h(TextArea, {
    small: true,
    fill: true,
    autoResize: true,
    value: text,
    onChange: (evt: any) => setText(evt.target.value),
    onBlur() {
      if (text === toText(value)) return;
      onCommit(text);
    },
  });
}

function toText(value: any): string {
  if (value == null) return "";
  return String(value);
}
