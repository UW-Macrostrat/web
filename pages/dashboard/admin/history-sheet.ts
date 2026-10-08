/** Recent changes to accounts and tokens, from the change-tracking trail.
 *
 * `GET /security/history` reads `audit.changes` for the `macrostrat_auth`
 * tables: who moved whom to which role, who minted or revoked which token.
 * Writes through api-v3 are attributed to the acting admin (`orcid:…`); the
 * CLI's are `system:cli` unless `--created-by` named someone.
 */
import hyper from "@macrostrat/hyper";
import { Intent, Tag } from "@blueprintjs/core";
import {
  type ColumnSpec,
  compareRowsBySorts,
  DataSheet,
  DataSheetDensity,
  type TableDataProvider,
} from "@macrostrat/data-sheet";
import { useMemo } from "react";
import { type AuthChange, fetchHistory, formatDateTime } from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

function createHistoryProvider(): TableDataProvider<AuthChange> {
  return {
    identity: (row) => row.id,
    async fetchData(params) {
      let rows = await fetchHistory(500);
      if (params.sorts.length > 0) {
        rows = [...rows].sort(compareRowsBySorts(params.sorts));
      }
      return { rows, totalCount: rows.length };
    },
  };
}

function ActionTag({ action }: { action: string }) {
  let intent: Intent = Intent.NONE;
  if (action === "INSERT") intent = Intent.SUCCESS;
  if (action === "UPDATE") intent = Intent.PRIMARY;
  if (action === "DELETE") intent = Intent.DANGER;
  return h(Tag, { minimal: true, intent }, action.toLowerCase());
}

// The fields of a user or token row worth a sentence; the rest is noise here.
const shownKeys = [
  "role",
  "label",
  "scopes",
  "expires_on",
  "user_id",
  "sub",
  "email",
];

/** The diff as a sentence or two: `role: user → admin`. */
function describeChange(changed: Record<string, any> | null, action: string) {
  if (changed == null) return "";
  if (action === "UPDATE") {
    return Object.entries(changed)
      .filter(([key]) => key !== "updated_on")
      .map(([key, diff]) => `${key}: ${show(diff?.old)} → ${show(diff?.new)}`)
      .join("; ");
  }
  return shownKeys
    .filter((key) => changed[key] != null)
    .map((key) => `${key}: ${show(changed[key])}`)
    .join("; ");
}

const isoDate = /^\d{4}-\d{2}-\d{2}T/;

function show(value: any): string {
  if (value == null) return "∅";
  if (typeof value === "string" && isoDate.test(value)) {
    return formatDateTime(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const columnSpec: ColumnSpec[] = [
  {
    key: "changed_at",
    name: "When",
    editable: false,
    valueRenderer: formatDateTime,
  },
  { key: "actor_id", name: "By", editable: false },
  { key: "table_name", name: "Table", editable: false },
  {
    key: "action",
    name: "Action",
    editable: false,
    valueRenderer: (action) => h(ActionTag, { action }),
  },
  {
    key: "record_pk",
    name: "Record",
    editable: false,
    valueRenderer: (pk) => (pk?.id != null ? `#${pk.id}` : show(pk)),
  },
  {
    key: "changed",
    name: "Change",
    editable: false,
    valueRenderer: (changed, ctx) => describeChange(changed, ctx?.row?.action),
  },
];

export function HistorySheet() {
  const provider = useMemo(createHistoryProvider, []);
  return h("div.admin-sheet", [
    h(DataSheet<AuthChange>, {
      provider,
      columnSpec,
      editable: false,
      name: "changes",
      itemLabel: "change",
      density: DataSheetDensity.MEDIUM,
      pageSize: 500,
      enableColumnReordering: false,
    }),
  ]);
}
