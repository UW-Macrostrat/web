import h from "@macrostrat/hyper";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Callout,
  Checkbox,
  FileInput,
  HTMLSelect,
} from "@blueprintjs/core";
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
 *
 * An example spreadsheet (served from `temp-storage` via `/columns/examples`)
 * can be downloaded to see the expected format, or run through a dry run to see
 * how the data is processed.
 */

type Phase = "idle" | "working" | "done" | "error";
type Example = { key: string; filename: string; size: number };

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

function exampleDownloadUrl(key: string): string {
  return `${apiV3Prefix}/columns/examples/download?key=${encodeURIComponent(key)}`;
}

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
  const [examples, setExamples] = useState<Example[]>([]);
  const [exampleKey, setExampleKey] = useState<string | null>(null);

  // web_users may only dry-run; admins may toggle. The API enforces this too,
  // so this just keeps the request and UI honest.
  const effectiveDryRun = isAdmin ? dryRun : true;

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiV3Prefix}/columns/examples`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { examples: [] }))
      .then((body) => {
        if (!cancelled) setExamples(body.examples ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const onFileChange = useCallback((e: any) => {
    setFile((e.target as HTMLInputElement).files?.[0] ?? null);
    setPhase("idle");
    setMessage(null);
  }, []);

  // Core upload + poll, shared by the file submit and the example dry run.
  const runIngest = useCallback(async (toSend: File, dryRunValue: boolean) => {
    setPhase("working");
    setMessage(null);
    try {
      const data = new FormData();
      data.append("file", toSend, toSend.name);
      data.append("dry_run", String(dryRunValue));

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
      const prefix = dryRunValue
        ? "Dry run succeeded — nothing was saved. "
        : "Ingestion succeeded. ";
      setMessage(prefix + JSON.stringify(result.result ?? {}));
    } catch (e: any) {
      setPhase("error");
      setMessage(e?.message ?? String(e));
    }
  }, []);

  const submit = useCallback(() => {
    if (file == null) return;
    runIngest(file, effectiveDryRun);
  }, [file, effectiveDryRun, runIngest]);

  // Fetch the selected example through the API (same-origin, sends the auth
  // cookie), then run it as a dry run. It's a fresh copy under a new key, so the
  // worker's dry-run cleanup deletes that copy, never the stored example.
  const runExample = useCallback(async () => {
    if (exampleKey == null) return;
    setPhase("working");
    setMessage(null);
    try {
      const res = await fetch(exampleDownloadUrl(exampleKey), {
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Couldn't load example (${res.status}): ${text}`);
      }
      const blob = await res.blob();
      const filename = exampleKey.split("/").pop() ?? "example.xlsx";
      await runIngest(new File([blob], filename, { type: blob.type }), true);
    } catch (e: any) {
      setPhase("error");
      setMessage(e?.message ?? String(e));
    }
  }, [exampleKey, runIngest]);

  const downloadExample = useCallback(() => {
    if (exampleKey == null) return;
    const a = document.createElement("a");
    a.href = exampleDownloadUrl(exampleKey);
    a.download = exampleKey.split("/").pop() ?? "example.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [exampleKey]);

  const busy = phase === "working";

  let checkboxLabel = "Dry run — validate only, don't save";
  if (!isAdmin) checkboxLabel = "Dry run — required (only admins can save)";
  const submitLabel = effectiveDryRun ? "Submit (dry run)" : "Submit";

  const noExamples = examples.length === 0;
  let placeholderLabel = "Select an example spreadsheet…";
  if (noExamples) placeholderLabel = "No examples available";
  const exampleOptions = [
    { value: "", label: placeholderLabel },
    ...examples.map((ex) => ({ value: ex.key, label: ex.filename })),
  ];
  const noExampleChosen = exampleKey == null;

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
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: "40rem",
      },
    },
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
      h("div.example-section", { style: { marginTop: "0.5rem" } }, [
        h(
          "div.example-label",
          { style: { fontWeight: 500, marginBottom: "0.25rem" } },
          "Or try an example spreadsheet"
        ),
        h(
          "div.example-controls",
          { style: { display: "flex", gap: "0.5rem", alignItems: "center" } },
          [
            h(HTMLSelect, {
              value: exampleKey ?? "",
              disabled: busy || noExamples,
              options: exampleOptions,
              onChange: (e: any) =>
                setExampleKey(e.currentTarget.value || null),
            }),
            h(
              Button,
              {
                icon: "download",
                disabled: noExampleChosen || busy,
                onClick: downloadExample,
              },
              "Download"
            ),
            h(
              Button,
              {
                icon: "play",
                intent: "primary",
                disabled: noExampleChosen || busy,
                onClick: runExample,
              },
              "Run example (dry run)"
            ),
          ]
        ),
      ]),
      callout,
    ]
  );
}
