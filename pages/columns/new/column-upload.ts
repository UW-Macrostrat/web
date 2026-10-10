/** Column-ingestion upload control.
 *
 * Uploads a column spreadsheet (.xlsx) to api-v3's `/columns/ingest`, which
 * hands it to a worker task, and waits for the result: the pipeline's graded
 * notices, and — on a dry run — the ingested columns as the database would
 * hold them, each of which can be opened straight in the editor.
 *
 * `dry_run` defaults to ON, and is all a non-admin can do; the API enforces
 * that too. An example spreadsheet (served from `temp-storage`) can be
 * downloaded to see the expected format, or run through a dry run.
 */
import hyper from "@macrostrat/hyper";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  ButtonGroup,
  Callout,
  Checkbox,
  FileInput,
  HTMLSelect,
  Tag,
} from "@blueprintjs/core";
import { useAuth } from "@macrostrat/form-components";
import { isAdminSession } from "~/components/auth";
import {
  exampleDownloadUrl,
  ingestColumnFile,
  listExamples,
  type ColumnPlacement,
  type IngestResult,
} from "../@column/column-editor/ingest-api";
import {
  GroupSelect,
  ProjectSelect,
  type GroupDef,
} from "../@column/column-editor/project-fields";
import { FormGroup } from "@blueprintjs/core";
import {
  columnsFromIngestResult,
  type ColumnEditorData,
} from "../@column/column-editor/data";
import { NoticeCountTags, NoticesList } from "../@column/column-editor/notices";
import { newColumnHref } from "../@column/column-editor/data";
import styles from "./new-column.module.sass";

const h = hyper.styled(styles);

type Phase = "idle" | "working" | "done" | "error";
type Example = { key: string; filename: string; size: number };

/** Where this tab keeps the columns of its last result, for the tabs it
 * opens to read. */
const OPENER_KEY = "__columnPreviews";
const PREVIEW_PARAM = "preview";

function openInNewTab(columns: ColumnEditorData[], index: number) {
  (window as any)[OPENER_KEY] = columns;
  // No `noopener`: the new tab reads the column through `window.opener`.
  window.open(`${newColumnHref}?${PREVIEW_PARAM}=${index}`, "_blank");
}

/** The column this tab was opened to edit, copied out of the tab that opened
 * it; `null` when there is none or that tab is gone. */
export function previewFromOpener(): ColumnEditorData | null {
  if (typeof window === "undefined") return null;
  const index = new URLSearchParams(window.location.search).get(PREVIEW_PARAM);
  if (index == null) return null;
  try {
    const col = window.opener?.[OPENER_KEY]?.[Number(index)];
    if (col == null) return null;
    // A copy, so the draft doesn't depend on the opener's page staying alive.
    return JSON.parse(JSON.stringify(col));
  } catch {
    return null;
  }
}

export interface ColumnUploadProps {
  /** Open a column from a dry run in the editor. */
  onOpenColumn?: (column: ColumnEditorData) => void;
}

export function ColumnUpload({ onOpenColumn }: ColumnUploadProps) {
  // The live session, degraded role included: an admin browsing as a
  // `web_user` may only dry-run, as the API will insist anyway.
  const { user } = useAuth();
  const isAdmin = isAdminSession(user);

  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  // Where the columns go. Nothing chosen means the spreadsheet decides; a
  // project alone demotes the spreadsheet's project to the group.
  const [projectID, setProjectID] = useState<number | null>(null);
  const [group, setGroup] = useState<GroupDef | null>(null);
  const placement: ColumnPlacement = {
    project_id: projectID,
    col_group_id: group?.col_group_id ?? null,
    col_group: group?.isNew ? group.name : null,
  };
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [examples, setExamples] = useState<Example[]>([]);
  const [exampleKey, setExampleKey] = useState<string | null>(null);

  // web_users may only dry-run; admins may toggle. The API enforces this too,
  // so this just keeps the request and UI honest.
  const effectiveDryRun = isAdmin ? dryRun : true;

  useEffect(() => {
    let cancelled = false;
    listExamples()
      .then((list) => {
        if (!cancelled) setExamples(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const onFileChange = useCallback((e: any) => {
    setFile((e.target as HTMLInputElement).files?.[0] ?? null);
    setPhase("idle");
    setError(null);
    setResult(null);
  }, []);

  // Core upload + poll, shared by the file submit and the example dry run.
  const runIngest = useCallback(
    async (toSend: File, dryRunValue: boolean) => {
      setPhase("working");
      setError(null);
      setResult(null);
      try {
        const res = await ingestColumnFile(toSend, dryRunValue, placement);
        setResult(res);
        setPhase("done");
      } catch (e: any) {
        setPhase("error");
        setError(e?.message ?? String(e));
      }
    },
    [placement.project_id, placement.col_group_id, placement.col_group]
  );

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
    setError(null);
    setResult(null);
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
      setError(e?.message ?? String(e));
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

  let groupHelp =
    "Leave the group empty to use the spreadsheet's own project as the group.";
  if (projectID == null) {
    groupHelp = "With no project chosen, the spreadsheet's metadata decides.";
  }

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

  let outcome = null;
  if (phase === "error") {
    outcome = h(Callout, { intent: "danger", title: "Error" }, error);
  } else if (result != null) {
    outcome = h(IngestOutcome, { result, onOpenColumn });
  }

  return h("div.column-upload", [
    h("div.placement-fields", [
      h(
        FormGroup,
        {
          label: "Project",
          helperText:
            "Where the columns go. A spreadsheet's project usually becomes a group here.",
        },
        h(ProjectSelect, {
          value: projectID,
          onChange: (id) => {
            setProjectID(id);
            setGroup(null);
          },
        })
      ),
      h(
        FormGroup,
        { label: "Group", helperText: groupHelp },
        h(GroupSelect, {
          project_id: projectID,
          value: group?.col_group_id ?? null,
          label: group?.name,
          allowCreate: true,
          onChange: setGroup,
        })
      ),
    ]),
    h("div.upload-controls", [
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
    ]),
    h("div.example-section", [
      h("div.example-label", "Or try an example spreadsheet"),
      h("div.example-controls", [
        h(HTMLSelect, {
          value: exampleKey ?? "",
          disabled: busy || noExamples,
          options: exampleOptions,
          onChange: (e: any) => setExampleKey(e.currentTarget.value || null),
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
      ]),
    ]),
    outcome,
  ]);
}

/** What came back: the summary line, the columns (openable after a dry
 * run), and the notices. */
function IngestOutcome({
  result,
  onOpenColumn,
}: {
  result: IngestResult;
  onOpenColumn?: (column: ColumnEditorData) => void;
}) {
  const columns = columnsFromIngestResult(result);
  const summary = result.summary;

  let intent: "success" | "warning" | "danger" = "success";
  let title = "Ingestion succeeded";
  if (result.dry_run) title = "Dry run finished — nothing was saved";
  if (!result.ok) {
    intent = "danger";
    title = result.dry_run
      ? "Dry run finished with errors — this data can't be written as it stands"
      : "Not written — the data has errors";
  } else if (result.notice_counts.warning > 0) {
    intent = "warning";
  }

  let summaryLine = null;
  if (summary != null) {
    summaryLine = h("p", [
      `${summary.n_columns} column${summary.n_columns === 1 ? "" : "s"}, `,
      `${summary.n_units} unit${summary.n_units === 1 ? "" : "s"} `,
      `in project `,
      h("strong", summary.project.name),
      ".",
    ]);
  }

  let columnList = null;
  if (columns.length > 0) {
    columnList = h(
      "ul.result-columns",
      columns.map((column, index) =>
        h(ResultColumn, {
          key:
            column.columnInfo.local_id ?? column.columnInfo.col_name ?? index,
          column,
          index,
          columns,
          dryRun: result.dry_run,
          onOpenColumn,
        })
      )
    );
  }

  return h("div.ingest-result", [
    h(Callout, { intent, title }, [
      summaryLine,
      h(NoticeCountTags, { counts: result.notice_counts }),
    ]),
    columnList,
    h(NoticesList, { notices: result.notices, emptyText: null }),
  ]);
}

function ResultColumn({
  column,
  index,
  columns,
  dryRun,
  onOpenColumn,
}: {
  column: ColumnEditorData;
  index: number;
  columns: ColumnEditorData[];
  dryRun: boolean;
  onOpenColumn?: (column: ColumnEditorData) => void;
}) {
  const info = column.columnInfo;
  const errors = (column.notices ?? []).filter(
    (n) => n.level === "error"
  ).length;

  let errorTag = null;
  if (errors > 0) {
    errorTag = h(
      Tag,
      { minimal: true, intent: "danger", size: "small" },
      `${errors} error${errors === 1 ? "" : "s"}`
    );
  }

  // A written column has a real id and a page of its own; a dry run's exists
  // only in the result, so it opens in the editor from here
  let action = null;
  if (dryRun && onOpenColumn != null) {
    action = h(ButtonGroup, { minimal: true }, [
      h(Button, {
        small: true,
        icon: "edit",
        text: "Open in editor",
        onClick: () => onOpenColumn(column),
      }),
      h(Button, {
        small: true,
        icon: "share",
        title: "Open in new tab",
        "aria-label": "Open in new tab",
        onClick: () => openInNewTab(columns, index),
      }),
    ]);
  } else if (!dryRun && info.col_id > 0) {
    action = h(Button, {
      small: true,
      minimal: true,
      icon: "arrow-right",
      text: "Open",
      onClick: () => {
        window.location.href = `/columns/${info.col_id}/edit`;
      },
    });
  }

  return h("li.result-column", [
    h("span.column-name", info.col_name),
    h(
      "span.column-meta",
      `${column.units.length} units · ${info.col_type ?? "column"}`
    ),
    errorTag,
    h("span.spacer"),
    action,
  ]);
}
