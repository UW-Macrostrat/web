/** Every account, searchable, with role, display name and email editable.
 *
 * Edits are held by the sheet until its Save action, which sends one
 * `PATCH /security/users/{id}` per edited row; rows marked with Delete are
 * removed by `DELETE /security/users/{id}` on the same Save.
 */
import hyper from "@macrostrat/hyper";
import { Callout, HTMLSelect, Intent, Tag } from "@blueprintjs/core";
import {
  type CellDetailContext,
  type ColumnSpec,
  compareRowsBySorts,
  DataSheet,
  DataSheetDensity,
  deleteRowsAction,
  type TableDataProvider,
} from "@macrostrat/data-sheet";
import { useEffect, useMemo, useState } from "react";
import {
  deleteUser,
  fetchRoles,
  fetchUsers,
  formatDateTime,
  type RoleInfo,
  updateUser,
  type UserRow,
} from "./api";
import { createSearchFilter, searchTerm } from "./sheet-search";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

// The API does the matching, so the filter's own predicate goes unused.
const filters = [
  createSearchFilter<UserRow>("Search by name, email or ORCiD…", (row) => [
    row.name,
    row.display_name,
    row.email,
    row.sub,
  ]),
];

const provider: TableDataProvider<UserRow> = {
  identity: (row) => row.id,
  async fetchData(params) {
    let rows = await fetchUsers(searchTerm(params.filters));
    if (params.sorts.length > 0) {
      rows = [...rows].sort(compareRowsBySorts(params.sorts));
    }
    return { rows, totalCount: rows.length };
  },
  // One request per user; a failure stops the batch and surfaces as the
  // Save action's error, with the earlier rows already saved.
  async saveRows(rows) {
    for (const row of rows) {
      await updateUser(row.id, {
        role: row.role,
        display_name: row.display_name,
        email: row.email,
      });
    }
  },
  async deleteRows(ids) {
    for (const id of ids) {
      await deleteUser(Number(id));
    }
  },
};

/** The role picker a role cell opens into. */
function RoleEditor({
  ctx,
  roles,
}: {
  ctx: CellDetailContext<UserRow>;
  roles: RoleInfo[];
}) {
  const current = ctx.value as string;
  const definition = roles.find((r) => r.id === current);
  let description: string | null = null;
  if (definition != null) {
    description = `${definition.description ?? ""} (${
      definition.postgres_role
    })`;
  }

  if (!ctx.editable) {
    return h("div.role-editor", [
      h(RoleTag, { role: current }),
      h("p.muted", description),
    ]);
  }

  return h("div.role-editor", [
    h(HTMLSelect, {
      value: current,
      autoFocus: true,
      fill: true,
      options: roles.map((r) => ({ value: r.id, label: r.id })),
      onChange(e) {
        ctx.onChange(e.currentTarget.value);
      },
    }),
    h("p.muted", description),
  ]);
}

const fallbackRoles: RoleInfo[] = [
  {
    id: "user",
    postgres_role: "web_user",
    description: "A signed-in Macrostrat user",
  },
  {
    id: "admin",
    postgres_role: "web_admin",
    description: "A Macrostrat administrator",
  },
];

/** Roles from the API, so one added to `macrostrat_auth.role` appears here. */
function useRoles(): RoleInfo[] {
  const [roles, setRoles] = useState<RoleInfo[]>(fallbackRoles);
  useEffect(() => {
    let cancelled = false;
    fetchRoles()
      .then((r) => {
        if (!cancelled && r.length > 0) setRoles(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return roles;
}

function RoleTag({ role }: { role: string }) {
  let intent: Intent = Intent.NONE;
  if (role === "admin") intent = Intent.PRIMARY;
  if (role === "test") intent = Intent.WARNING;
  return h(Tag, { minimal: true, intent }, role);
}

function buildColumnSpec(roles: RoleInfo[]): ColumnSpec[] {
  return [
    { key: "id", name: "ID", editable: false },
    { key: "display_name", name: "Display name", editable: true },
    { key: "name", name: "Name", editable: false },
    { key: "email", name: "Email", editable: true },
    { key: "sub", name: "ORCiD", editable: false },
    {
      key: "role",
      name: "Role",
      editable: true,
      multiCell: true,
      cellLabel: "role",
      valueRenderer: (role) => h(RoleTag, { role }),
      cellDetail: (ctx) => h(RoleEditor, { ctx, roles }),
      detailPresentation: "popover",
    },
    { key: "postgres_role", name: "Postgres role", derived: true },
    {
      key: "created_on",
      name: "Joined",
      editable: false,
      valueRenderer: formatDateTime,
    },
  ];
}

const actions = [deleteRowsAction];

export function UsersSheet() {
  const roles = useRoles();
  const columnSpec = useMemo(() => buildColumnSpec(roles), [roles]);

  return h("div.sheet-panel", [
    h("div.admin-sheet.page-sheet", [
      h(DataSheet<UserRow>, {
        provider,
        columnSpec,
        actions,
        filters,
        filterDebounce: 250,
        editable: true,
        name: "users",
        itemLabel: "user",
        density: DataSheetDensity.MEDIUM,
        pageSize: 500,
        enableColumnReordering: false,
      }),
    ]),
  ]);
}

export function UsersHelp() {
  return h(Callout, { compact: true, icon: "info-sign" }, [
    "Edits and deletions apply when you press Save. Role changes take effect ",
    "at the user's next sign-in. You can't change your own role or delete ",
    "yourself.",
  ]);
}
