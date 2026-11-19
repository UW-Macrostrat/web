/** A parameter form generated from a task's JSON schema.
 *
 * Covers what pydantic emits for the parameter models: booleans, numbers
 * (nullable or not), strings, and lists of strings. Anything else is shown as
 * JSON, editable, so a new parameter type is usable before it has a control.
 */
import hyper from "@macrostrat/hyper";
import {
  Button,
  FormGroup,
  InputGroup,
  Menu,
  MenuItem,
  NumericInput,
  PopoverNext,
  Switch,
  TagInput,
  TextArea,
} from "@blueprintjs/core";
import { type ReactNode, useEffect, useState } from "react";
import { fetchRecentValues, type JSONSchema } from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

type FieldKind =
  | "boolean"
  | "number"
  | "integer"
  | "string"
  | "strings"
  | "json";

/** The schema's own branch, with a `null` alternative stripped. */
function unwrap(schema: JSONSchema): JSONSchema {
  if (schema.anyOf == null) return schema;
  const branches = schema.anyOf.filter((s) => s.type !== "null");
  if (branches.length === 1) return branches[0];
  return schema;
}

function fieldKind(schema: JSONSchema): FieldKind {
  const inner = unwrap(schema);
  const type = Array.isArray(inner.type) ? inner.type[0] : inner.type;
  if (type === "boolean") return "boolean";
  if (type === "number") return "number";
  if (type === "integer") return "integer";
  if (type === "string") return "string";
  if (type === "array" && unwrap(inner.items ?? {}).type === "string") {
    return "strings";
  }
  return "json";
}

export function defaultValues(schema: JSONSchema): Record<string, any> {
  const values: Record<string, any> = {};
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    if (prop.default !== undefined) values[key] = prop.default;
  }
  return values;
}

export function SchemaForm({
  schema,
  values,
  onChange,
  taskName = null,
}: {
  schema: JSONSchema;
  values: Record<string, any>;
  onChange(values: Record<string, any>): void;
  /** Whose earlier runs supply "recently used" values; none without it. */
  taskName?: string | null;
}) {
  const set = (key: string, value: any) =>
    onChange({ ...values, [key]: value });
  const fields = Object.entries(schema.properties ?? {}).map(([key, prop]) =>
    h(Field, {
      key,
      name: key,
      schema: prop,
      value: values[key],
      set,
      taskName,
    })
  );
  return h("div.schema-form", fields);
}

function Field({
  name,
  schema,
  value,
  set,
  taskName,
}: {
  name: string;
  schema: JSONSchema;
  value: any;
  set(key: string, value: any): void;
  taskName: string | null;
}) {
  const kind = fieldKind(schema);
  const label = schema.title ?? name;
  if (kind === "boolean") {
    return h(FormGroup, { helperText: schema.description }, [
      h(Switch, {
        label,
        checked: Boolean(value),
        onChange: (e) => set(name, e.currentTarget.checked),
      }),
    ]);
  }
  let control;
  if (kind === "number" || kind === "integer") {
    control = h(NumericInput, {
      value: value ?? "",
      allowNumericCharactersOnly: kind === "integer",
      minorStepSize: kind === "integer" ? null : 0.1,
      fill: true,
      onValueChange: (n, text) => set(name, text === "" ? null : n),
    });
  } else if (kind === "strings") {
    control = h(TagInput, {
      values: value ?? [],
      placeholder: "Add one and press Enter",
      addOnBlur: true,
      fill: true,
      onChange: (items) => set(name, items.map(String)),
    });
  } else if (kind === "string") {
    let recent: ReactNode = null;
    if (schema["x-recent"] && taskName != null) {
      recent = h(RecentValues, {
        taskName,
        param: name,
        onSelect: (v) => set(name, v),
      });
    }
    control = h(InputGroup, {
      value: value ?? "",
      fill: true,
      rightElement: recent,
      onChange: (e) => set(name, e.target.value),
    });
  } else {
    control = h(JSONField, { value, onChange: (v) => set(name, v) });
  }
  return h(FormGroup, { label, helperText: schema.description }, control);
}

function useRecentValues(taskName: string, param: string): string[] {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    // An API without the route offers nothing, which hides the control.
    fetchRecentValues(taskName, param)
      .then((values) => {
        if (!cancelled) setRecent(values);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [taskName, param]);
  return recent;
}

/** A menu of the values this parameter took in the task's earlier runs. */
function RecentValues({
  taskName,
  param,
  onSelect,
}: {
  taskName: string;
  param: string;
  onSelect(value: string): void;
}) {
  const recent = useRecentValues(taskName, param);
  if (recent.length === 0) return null;
  const items = recent.map((value) =>
    h(MenuItem, { key: value, text: value, onClick: () => onSelect(value) })
  );
  return h(
    PopoverNext,
    {
      content: h(Menu, { className: "recent-values" }, items),
      placement: "bottom-end",
    },
    h(Button, {
      minimal: true,
      icon: "history",
      rightIcon: "caret-down",
      text: "Recent",
      title: "Recently used",
    })
  );
}

function JSONField({ value, onChange }) {
  const text = value === undefined ? "" : JSON.stringify(value, null, 2);
  return h(TextArea, {
    defaultValue: text,
    fill: true,
    className: "json-field",
    onBlur: (e) => {
      try {
        onChange(
          e.target.value === "" ? undefined : JSON.parse(e.target.value)
        );
      } catch {}
    },
  });
}
