/** The admin surface of api_v3's `/security` routes. All calls carry the
 * session cookie; the API refuses any session that is not `web_admin`. */
import { authPrefix } from "@macrostrat-web/settings";

export interface UserRow {
  id: number;
  sub: string;
  name: string | null;
  display_name: string | null;
  email: string | null;
  /** Application role: `user`, `admin`, `test`. */
  role: string;
  /** The Postgres role a fresh session in that role assumes. */
  postgres_role: string;
  created_on: string;
  updated_on: string;
}

export interface RoleInfo {
  id: string;
  postgres_role: string;
  description: string | null;
}

export interface TokenRow {
  id: number;
  label: string | null;
  token_type: string;
  scopes: string[] | null;
  user_id: number | null;
  user_sub: string | null;
  created_by: number | null;
  created_on: string;
  expires_on: string;
  used_on: string | null;
  active: boolean;
}

/** One row of the change-tracking trail for the account tables. */
export interface AuthChange {
  id: number;
  changed_at: string;
  actor_id: string | null;
  table_name: string;
  action: string;
  record_pk: Record<string, any> | null;
  changed: Record<string, any> | null;
}

export interface NewTokenRequest {
  label?: string;
  user_id?: number;
  scopes?: string[];
  /** Unix timestamp (seconds). */
  expiration: number;
}

export interface NewToken {
  id: number;
  token: string;
  expires_on: string;
  label: string | null;
  user_id: number | null;
  scopes: string[] | null;
}

async function securityFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${authPrefix}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail != null) detail = String(body.detail);
    } catch {}
    throw new Error(detail);
  }
  return response.json();
}

export function fetchUsers(q: string | null): Promise<UserRow[]> {
  const params = new URLSearchParams();
  if (q != null && q.trim() !== "") params.set("q", q.trim());
  const query = params.toString();
  return securityFetch(`/users${query ? `?${query}` : ""}`);
}

export function setUserRole(id: number, role: string): Promise<UserRow> {
  return securityFetch(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function fetchHistory(limit = 200): Promise<AuthChange[]> {
  return securityFetch(`/history?limit=${limit}`);
}

/** How a user is named in pickers and listings: their name, then their ORCID iD. */
export function userLabel(user: UserRow): string {
  const name = user.name?.trim() || user.display_name?.trim();
  if (name) return `${name} (${user.sub})`;
  return user.sub;
}

export function fetchRoles(): Promise<RoleInfo[]> {
  return securityFetch("/roles");
}

export function fetchTokens(): Promise<TokenRow[]> {
  return securityFetch("/tokens");
}

export function createToken(body: NewTokenRequest): Promise<NewToken> {
  return securityFetch("/tokens", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function revokeToken(
  id: number
): Promise<{ id: number; status: string }> {
  return securityFetch(`/tokens/${id}/revoke`, { method: "POST" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (value == null) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
