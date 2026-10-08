/** Delegated API tokens: list, mint, revoke.
 *
 * The same three operations as `macrostrat auth {list,create,revoke}-token`,
 * through api_v3's admin-only `/security/tokens` routes. A token's value is
 * shown exactly once, when minted; only its digest is stored, so the listing
 * can never show it again.
 */
import hyper from "@macrostrat/hyper";
import {
  Button,
  Callout,
  Classes,
  Dialog,
  FormGroup,
  InputGroup,
  Intent,
  MenuItem,
  NumericInput,
  Tag,
} from "@blueprintjs/core";
import { Suggest } from "@blueprintjs/select";
import { RegionCardinality } from "@blueprintjs/table";
import {
  type ColumnSpec,
  compareRowsBySorts,
  DataSheet,
  DataSheetDensity,
  type TableAction,
  type TableActionContext,
  type TableDataProvider,
} from "@macrostrat/data-sheet";
import classNames from "classnames";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createToken,
  fetchTokens,
  fetchUsers,
  formatDateTime,
  type NewToken,
  revokeToken,
  type TokenRow,
  userLabel,
  type UserRow,
} from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

function createTokensProvider(): TableDataProvider<TokenRow> {
  return {
    identity: (row) => row.id,
    async fetchData(params) {
      let rows = await fetchTokens();
      if (params.sorts.length > 0) {
        rows = [...rows].sort(compareRowsBySorts(params.sorts));
      }
      return { rows, totalCount: rows.length };
    },
  };
}

function StatusTag({ active }: { active: boolean }) {
  if (active)
    return h(Tag, { minimal: true, intent: Intent.SUCCESS }, "active");
  return h(Tag, { minimal: true }, "expired");
}

const columnSpec: ColumnSpec[] = [
  { key: "id", name: "ID", editable: false },
  {
    key: "active",
    name: "Status",
    editable: false,
    valueRenderer: (active) => h(StatusTag, { active }),
  },
  { key: "label", name: "Label", editable: false },
  { key: "user_sub", name: "Delegated user", editable: false },
  { key: "token_type", name: "Type", editable: false },
  {
    key: "scopes",
    name: "Scopes",
    editable: false,
    valueRenderer: (scopes: string[] | null) => (scopes ?? []).join(", "),
  },
  {
    key: "expires_on",
    name: "Expires",
    editable: false,
    valueRenderer: formatDateTime,
  },
  {
    key: "used_on",
    name: "Last used",
    editable: false,
    valueRenderer: formatDateTime,
  },
  {
    key: "created_on",
    name: "Created",
    editable: false,
    valueRenderer: formatDateTime,
  },
  { key: "created_by", name: "Issued by (user ID)", editable: false },
];

function selectedActiveTokens(ctx: TableActionContext<TokenRow>): TokenRow[] {
  const rows = ctx.getSelectedRows?.() ?? [];
  return rows.filter((row) => row?.active);
}

function createRevokeAction(onDone: () => void): TableAction<TokenRow> {
  return {
    id: "revoke-token",
    name: "Revoke",
    icon: "disable",
    intent: Intent.DANGER,
    description: "Expire the selected tokens now. The record is kept.",
    targets: [RegionCardinality.FULL_ROWS, RegionCardinality.CELLS],
    // The context handed to `disabled` while the sheet is being set up (and
    // on the server) may not carry the selection helpers yet.
    disabled: (ctx) => !selectedActiveTokens(ctx).length,
    successMessage: "Token revoked",
    errorMessage: "Could not revoke token",
    async run(ctx) {
      const rows = selectedActiveTokens(ctx);
      for (const row of rows) {
        await revokeToken(row.id);
      }
      ctx.clearSelection();
      onDone();
    },
  };
}

export function TokensSheet() {
  // Bumped after a mint or a revoke so the sheet re-fetches.
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);
  const provider = useMemo(createTokensProvider, []);
  const actions = useMemo(() => [createRevokeAction(refresh)], [refresh]);

  return h("div.tokens-panel", [
    h("div.tokens-toolbar", [h(NewTokenButton, { onCreated: refresh })]),
    h("div.admin-sheet", [
      h(DataSheet<TokenRow>, {
        provider,
        columnSpec,
        actions,
        refreshToken,
        editable: false,
        enableSelection: true,
        name: "tokens",
        itemLabel: "token",
        density: DataSheetDensity.MEDIUM,
        pageSize: 500,
        enableColumnReordering: false,
      }),
    ]),
  ]);
}

// ---- Minting ----

interface TokenForm {
  label: string;
  user: UserRow | null;
  scopes: string;
  days: number;
}

const emptyForm: TokenForm = { label: "", user: null, scopes: "", days: 365 };

function parseScopes(text: string): string[] | undefined {
  const scopes = text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
  return scopes.length > 0 ? scopes : undefined;
}

function NewTokenButton({ onCreated }: { onCreated: () => void }) {
  const [isOpen, setOpen] = useState(false);
  return h([
    h(
      Button,
      { icon: "key", intent: Intent.PRIMARY, onClick: () => setOpen(true) },
      "New token"
    ),
    h(NewTokenDialog, {
      isOpen,
      onClose: () => setOpen(false),
      onCreated,
    }),
  ]);
}

function NewTokenDialog({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState<TokenForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<NewToken | null>(null);

  const update = (patch: Partial<TokenForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const hasSubject = form.label.trim() !== "" || form.user != null;
  const canSubmit = hasSubject && form.days > 0 && !busy;

  const close = () => {
    onClose();
    // Reset once the dialog has closed, so the minted token isn't left behind
    // for the next opening.
    setForm(emptyForm);
    setMinted(null);
    setError(null);
  };

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const expiration =
        Math.floor(Date.now() / 1000) + form.days * 24 * 60 * 60;
      const token = await createToken({
        label: form.label.trim() || undefined,
        user_id: form.user?.id,
        scopes: parseScopes(form.scopes),
        expiration,
      });
      setMinted(token);
      onCreated();
    } catch (e: any) {
      setError(e?.message ?? "Could not create token");
    } finally {
      setBusy(false);
    }
  }

  let body: ReactNode;
  let footer: ReactNode;
  if (minted != null) {
    body = h(MintedToken, { token: minted });
    footer = h(Button, { intent: Intent.PRIMARY, onClick: close }, "Done");
  } else {
    body = h(TokenFormFields, { form, update, error });
    footer = h([
      h(Button, { onClick: close }, "Cancel"),
      h(
        Button,
        {
          intent: Intent.PRIMARY,
          icon: "key",
          disabled: !canSubmit,
          loading: busy,
          onClick: submit,
        },
        "Create token"
      ),
    ]);
  }

  return h(
    Dialog,
    { isOpen, onClose: close, title: "New delegated token", icon: "key" },
    [
      h("div", { className: Classes.DIALOG_BODY }, body),
      h("div", { className: Classes.DIALOG_FOOTER }, [
        h("div", { className: Classes.DIALOG_FOOTER_ACTIONS }, footer),
      ]),
    ]
  );
}

function TokenFormFields({ form, update, error }) {
  let errorNode: ReactNode = null;
  if (error != null) {
    errorNode = h(Callout, { intent: Intent.DANGER, compact: true }, error);
  }
  return h("div.token-form", [
    h("p.muted", [
      "A token stands for a third party (give it a label) or delegates a ",
      "Macrostrat user's authority (give their user ID); at least one is needed. ",
      "Scopes are ",
      h("code", "namespace:resource"),
      ", for example ",
      h("code", "rasters:emit-minerals"),
      ".",
    ]),
    h(FormGroup, { label: "Label", helperText: "Who the token is for" }, [
      h(InputGroup, {
        value: form.label,
        placeholder: "e.g. Colorado School of Mines – EMIT",
        onChange: (e) => update({ label: e.target.value }),
      }),
    ]),
    h(
      FormGroup,
      {
        label: "Delegated user",
        helperText: "Optional: the token acts with this user's authority",
      },
      [
        h(UserPicker, {
          value: form.user,
          onChange: (user) => update({ user }),
        }),
      ]
    ),
    h(
      FormGroup,
      { label: "Scopes", helperText: "Separate several with spaces or commas" },
      [
        h(InputGroup, {
          value: form.scopes,
          placeholder: "rasters:emit-minerals tiles:map",
          onChange: (e) => update({ scopes: e.target.value }),
        }),
      ]
    ),
    h(FormGroup, { label: "Valid for (days)" }, [
      h(NumericInput, {
        value: form.days,
        min: 1,
        max: 3650,
        onValueChange: (n) => update({ days: Number.isFinite(n) ? n : 0 }),
      }),
    ]),
    errorNode,
  ]);
}

/** Pick a user by name, email or ORCiD; the API does the searching. */
function UserPicker({
  value,
  onChange,
}: {
  value: UserRow | null;
  onChange(user: UserRow | null): void;
}) {
  const [query, setQuery] = useState("");
  const items = useUserSearch(query);

  // `inputProps.rightElement` wants a JSX element, not any node.
  let rightElement: JSX.Element | undefined = undefined;
  if (value != null) {
    rightElement = h(Button, {
      minimal: true,
      icon: "cross",
      title: "Clear",
      onClick: () => onChange(null),
    });
  }

  return h(Suggest<UserRow>, {
    items,
    selectedItem: value,
    query,
    onQueryChange: setQuery,
    itemsEqual: "id",
    itemRenderer: (user, { handleClick, handleFocus, modifiers }) =>
      h(MenuItem, {
        key: user.id,
        text: user.name?.trim() || user.display_name?.trim() || user.sub,
        label: user.sub,
        roleStructure: "listoption",
        active: modifiers.active,
        onClick: handleClick,
        onFocus: handleFocus,
      }),
    inputValueRenderer: userLabel,
    onItemSelect: (user) => onChange(user),
    noResults: h(MenuItem, {
      disabled: true,
      text: query.trim() === "" ? "Type to search users" : "No matching users",
      roleStructure: "listoption",
    }),
    fill: true,
    resetOnClose: false,
    popoverProps: { minimal: true, matchTargetWidth: true },
    inputProps: {
      placeholder: "Search users by name, email or ORCiD…",
      leftIcon: "user",
      rightElement,
    },
  });
}

/** Users matching `query`, from the API, debounced. */
function useUserSearch(query: string): UserRow[] {
  const [items, setItems] = useState<UserRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      fetchUsers(query)
        .then((rows) => {
          if (!cancelled) setItems(rows.slice(0, 25));
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);
  return items;
}

function MintedToken({ token }: { token: NewToken }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return h("div.minted-token", [
    h(
      Callout,
      {
        intent: Intent.WARNING,
        icon: "warning-sign",
        title: "Copy the token now",
      },
      [
        "Only its digest is stored, so it cannot be shown again. If it is lost, ",
        "revoke it and mint another.",
      ]
    ),
    h("pre.token-value", token.token),
    h("div.minted-actions", [
      h(
        Button,
        {
          icon: copied ? "tick" : "clipboard",
          intent: Intent.PRIMARY,
          onClick: copy,
        },
        copied ? "Copied" : "Copy to clipboard"
      ),
      h(
        "span.muted",
        `Token ${token.id} · expires ${formatDateTime(token.expires_on)}`
      ),
    ]),
  ]);
}

export function TokensHelp() {
  return h(Callout, { compact: true, icon: "info-sign" }, [
    "Revocation can take up to a minute to reach every service.",
  ]);
}
