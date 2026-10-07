/**
 * Hooks that act on the session: log out, switch the role the cookie carries,
 * and read the stored user record. Each ends in a full reload rather than an
 * in-place state update, for the same reason `useReactiveAuthRefresh` does:
 * only a reload re-runs SSR (the page guards) and re-issues every client fetch
 * — PostgREST queries included — with the cookie as it now stands.
 */
import { useAuth } from "@macrostrat/form-components";
import { authPrefix } from "@macrostrat-web/settings";
import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "./user";

async function postJSON(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      detail = (await response.json())?.detail ?? detail;
    } catch {}
    throw new Error(detail);
  }
  return response.json();
}

/** Log out, then reload: a guarded page then sends the visitor to sign in. */
export function useLogout() {
  const { runAction } = useAuth();
  return useCallback(async () => {
    await runAction({ type: "logout" });
    window.location.reload();
  }, [runAction]);
}

export interface AssumeRole {
  /** Re-mint the session in `role`; `null` restores the account's own role. */
  assume(role: string | null): Promise<void>;
  busy: boolean;
  error: string | null;
}

/** Switch the Postgres role the session cookie carries (admins only). */
export function useAssumeRole(): AssumeRole {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assume = useCallback(async (role: string | null) => {
    setBusy(true);
    setError(null);
    try {
      await postJSON(`${authPrefix}/role`, { role });
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Could not change role");
      setBusy(false);
    }
  }, []);

  return { assume, busy, error };
}

export interface UserRecordState {
  record: SessionUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * The stored user record (`GET /security/me`), which carries the profile
 * fields the JWT claims don't: full name, email, when the account was created.
 * Fetched only while there is a session; `enabled: false` skips it.
 */
export function useUserRecord(enabled = true): UserRecordState {
  const [state, setState] = useState<UserRecordState>({
    record: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ record: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    fetch(`${authPrefix}/me`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((record) => {
        if (!cancelled) setState({ record, loading: false, error: null });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({ record: null, loading: false, error: e?.message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
