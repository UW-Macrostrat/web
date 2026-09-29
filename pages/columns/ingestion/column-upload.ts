import h from "@macrostrat/hyper";
import { useCallback, useState } from "react";
import { Button, Callout, Checkbox, FileInput } from "@blueprintjs/core";
import { apiV3Prefix } from "@macrostrat-web/settings";
import { usePageContext } from "vike-react/usePageContext";

/**
 * Column-ingestion upload control.
 *
 * Uploads a column spreadsheet (.xlsx) to the api-v3 `/columns/ingest` endpoint,
 * which enqueues a Celery worker task, then polls `/columns/ingest/{task_id}`
 * until it finishes and shows the result or error.
 *
 * `dry_run` defaults to ON so the whole path can be exercised without persisting
 * anything — the flag is forwarded to the worker, which rolls the ingest
 * transaction back instead of committing. See the "Column ingestion task"
 * feature-area note.
 */

type Phase = "idle" | "working" | "done" | "error";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

async function pollStatus(taskId: string): Promise<any> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const res = await fetch(`${apiV3Prefix}/columns/ingest/${taskId}`, {
      credentials: "include",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Status check failed (${res.status}): ${text}`);
    }
    const body = await res.json();
    if (body.state === "SUCCESS" || body.state === "FAILURE") return body;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error("Timed out waiting for the ingestion task to finish.");
}

export function ColumnUpload() {
  const pageContext = usePageContext();
  const isAdmin = (pageContext as any).user?.role === "web_admin";

  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // web_users may only dry-run; admins may toggle. The API enforces this too,
  // so this just keeps the request and UI honest.
  const effectiveDryRun = isAdmin ? dryRun : true;

  const onFileChange = useCallback((e: any) => {
    setFile((e.target as HTMLInputElement).files?.[0] ?? null);
    setPhase("idle");
    setMessage(null);
  }, []);

  const submit = useCallback(async () => {
    if (file == null) return;
    setPhase("working");
    setMessage(null);
    try {
      const data = new FormData();
      data.append("file", file, file.name);
      data.append("dry_run", String(effectiveDryRun));

      // No Content-Type header — the browser sets the multipart boundary itself.
      const res = await fetch(`${apiV3Prefix}/columns/ingest`, {
        method: "POST",
        credentials: "include",
        body: data,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text}`);
      }

      const { task_id } = await res.json();
      const result = await pollStatus(task_id);

      if (result.state === "FAILURE") {
        setPhase("error");
        setMessage(result.error ?? "Ingestion task failed.");
        return;
      }

      setPhase("done");
      const prefix = effectiveDryRun
        ? "Dry run succeeded — nothing was saved. "
        : "Ingestion succeeded. ";
      setMessage(prefix + JSON.stringify(result.result ?? {}));
    } catch (e: any) {
      setPhase("error");
      setMessage(e?.message ?? String(e));
    }
  }, [file, effectiveDryRun]);

  const busy = phase === "working";

  let checkboxLabel = "Dry run — validate only, don't save";
  if (!isAdmin) checkboxLabel = "Dry run — required (only admins can save)";
  const submitLabel = effectiveDryRun ? "Submit (dry run)" : "Submit";

  let callout = null;
  if (message != null) {
    let intent: "primary" | "success" | "danger" = "primary";
    if (phase === "done") intent = "success";
    if (phase === "error") intent = "danger";
    const title = phase === "error" ? "Error" : "Result";
    callout = h(Callout, { intent, title }, message);
  }

  return h(
    "div.column-upload",
    { style: { display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "40rem" } },
    [
      h(FileInput, {
        text: file?.name ?? "Choose a column spreadsheet (.xlsx)…",
        hasSelection: file != null,
        disabled: busy,
        fill: true,
        inputProps: { accept: ".xlsx,.xls" },
        onInputChange: onFileChange,
      }),
      h(Checkbox, {
        checked: effectiveDryRun,
        disabled: busy || !isAdmin,
        label: checkboxLabel,
        onChange: (e: any) => setDryRun((e.target as HTMLInputElement).checked),
      }),
      h(
        Button,
        {
          intent: "primary",
          loading: busy,
          disabled: file == null || busy,
          onClick: submit,
        },
        submitLabel
      ),
      callout,
    ]
  );
}
