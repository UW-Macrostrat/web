/** Every account, searchable, with its role editable in place.
 *
 * A `DataSheet` over a provider that reads `GET /security/users` (the search
 * box becomes the `q` parameter) and writes role changes back one
 * `PATCH /security/users/{id}` at a time through `saveRows` — the sheet's own
 * Save action calls it with the edited rows and reloads. Only the role is
 * editable; the rest of a record is the user's own, from ORCID.
 */
import hyper from "@macrostrat/hyper";
import {
  Callout,
  HTMLSelect,
  InputGroup,
  Intent,
  Tag,
} from "@blueprintjs/core";
import {
  type CellDetailContext,
  type ColumnSpec,
  compareRowsBySorts,
  DataSheet,
  DataSheetDensity,
  type FetchDataParams,
  type TableDataProvider,
  type TableFilter,
} from "@macrostrat/data-sheet";
import { useEffect, useMemo, useState } from "react";
import {
  fetchRoles,
  fetchUsers,
  formatDateTime,
  type RoleInfo,
  setUserRole,
  type UserRow,
} from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const SEARCH_FILTER_ID = "user-search";

function SearchForm({
  state,
  setState,
}: {
  state: string;
  setState(s: string): void;
}) {
  return h(InputGroup, {
    leftIcon: "search",
    placeholder: "Search by name, email or ORCID iD…",
    value: state ?? "",
    onChange: (e) => setState(e.target.value),
    className: "user-search",
  });
}

const searchFilter: TableFilter<UserRow, string> = {
  id: SEARCH_FILTER_ID,
  name: "Search",
  icon: "search",
  defaultState: "",
  presentation: "inline",
  filterForm: SearchForm,
  describeState: (s) => (s?.trim() ? s.trim() : null),
  // The server does the search; this keeps an in-memory source honest too.
  predicate: (row, s) => {
    const q = (s ?? "").trim().toLowerCase();
    if (q === "") return true;
    return [row.name, row.display_name, row.email, row.sub].some((v) =>
      v?.toLowerCase().includes(q)
    );
  },
};

function searchTerm(params: FetchDataParams): string | null {
  const filter = params.filters.find((f) => f.id === SEARCH_FILTER_ID);
  const state = filter?.state;
  return typeof state === "string" ? state : null;
}

function createUsersProvider(): TableDataProvider<UserRow> {
  return {
    identity: (row) => row.id,
    async fetchData(params) {
      let rows = await fetchUsers(searchTerm(params));
      if (params.sorts.length > 0) {
        rows = [...rows].sort(compareRowsBySorts(params.sorts));
      }
      return { rows, totalCount: rows.length };
    },
    async saveRows(rows) {
      // One request per user; a failure stops the batch and surfaces as the
      // Save action's error, with the earlier rows already saved.
      for (const row of rows) {
        await setUserRole(row.id, row.role);
      }
    },
  };
}

/** The role picker a role cell opens into. Reads the roles from the API, so a
 * role added to `macrostrat_auth.role` appears here without a code change. */
function RoleEditor(ctx: CellDetailContext<UserRow>) {
  const roles = useRoles();
  const current = ctx.value as string;

  let description: string | null = null;
  const definition = roles.find((r) => r.id === current);
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

const columnSpec: ColumnSpec[] = [
  { key: "id", name: "ID", editable: false },
  { key: "display_name", name: "Display name", editable: false },
  { key: "name", name: "Name", editable: false },
  { key: "email", name: "Email", editable: false },
  { key: "sub", name: "ORCID iD", editable: false },
  {
    key: "role",
    name: "Role",
    editable: true,
    multiCell: true,
    cellLabel: "role",
    valueRenderer: (role) => h(RoleTag, { role }),
    cellDetail: RoleEditor,
    detailPresentation: "popover",
  },
  {
    key: "postgres_role",
    name: "Postgres role",
    derived: true,
  },
  {
    key: "created_on",
    name: "Joined",
    editable: false,
    valueRenderer: formatDateTime,
  },
];

export function UsersSheet() {
  const provider = useMemo(createUsersProvider, []);
  return h("div.admin-sheet", [
    h(DataSheet<UserRow>, {
      provider,
      columnSpec,
      filters: [searchFilter],
      editable: true,
      name: "users",
      itemLabel: "user",
      density: DataSheetDensity.MEDIUM,
      pageSize: 500,
      enableColumnReordering: false,
    }),
  ]);
}

export function UsersHelp() {
  return h(Callout, { compact: true, icon: "info-sign" }, [
    "Change a user's role by selecting the cell and picking a new one, then ",
    h("strong", "Save"),
    ". A new role takes effect the next time that user's session is minted ",
    "— at their next sign-in or token refresh — and you cannot change your own.",
  ]);
}
