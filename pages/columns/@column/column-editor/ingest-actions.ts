/** Checking and submitting the column through the ingestion pipeline.
 *
 * *Check* runs the column as it now stands through `/columns/submit` as a
 * dry run and brings back the pipeline's notices — the database-aware
 * complement to the sheets' own validation. *Write* does the same without
 * the rollback; it is for admins, and only for a column the pipeline can
 * create, since the importer reconciles columns within a project's default
 * group rather than updating a column by id. Either way the notices land in
 * `noticesAtom`, where the toolbar's Notices button shows them. */
import hyper from "@macrostrat/hyper";
import { useCallback } from "react";
import { Button, ButtonGroup } from "@blueprintjs/core";
import { useAtomValue, useSetAtom } from "./state/ctx";
import { useAuth } from "@macrostrat/form-components";
import { isAdminSession } from "~/components/auth";
import { submitColumnData } from "./ingest-api";
import { buildSubmission } from "./submission";
import {
  editedColumnInfoAtom,
  editedUnitsAtom,
  faciesSchemeAtom,
  footprintAtom,
  lastIngestResultAtom,
  noticesAtom,
  snapshotAtom,
  submissionErrorAtom,
  submissionPhaseAtom,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** Submit the column; `dryRun` false writes it. */
function useSubmitColumn() {
  const columnInfo = useAtomValue(editedColumnInfoAtom);
  const footprint = useAtomValue(footprintAtom);
  const units = useAtomValue(editedUnitsAtom);
  const facies = useAtomValue(faciesSchemeAtom);
  const setNotices = useSetAtom(noticesAtom);
  const setResult = useSetAtom(lastIngestResultAtom);
  const setPhase = useSetAtom(submissionPhaseAtom);
  const setError = useSetAtom(submissionErrorAtom);

  return useCallback(
    async (dryRun: boolean) => {
      setPhase("working");
      setError(null);
      try {
        const submission = buildSubmission(
          columnInfo,
          units,
          facies,
          footprint
        );
        // The pickers' choice travels beside the sheets: a group chosen by id,
        // or one named here that the write creates.
        const result = await submitColumnData(submission, dryRun, {
          project_id: columnInfo?.project_id ?? null,
          col_group_id: columnInfo?.col_group_id ?? null,
          col_group:
            columnInfo?.col_group_id == null ? columnInfo?.col_group : null,
        });
        setNotices(result.notices);
        setResult(result);
        setPhase("done");
      } catch (err: any) {
        setError(err?.message ?? String(err));
        setPhase("error");
      }
    },
    [
      columnInfo,
      footprint,
      units,
      facies,
      setNotices,
      setResult,
      setPhase,
      setError,
    ]
  );
}

function statusText(
  phase: string,
  error: string | null,
  result: any
): string | null {
  if (phase === "working") return "Checking…";
  if (phase === "error") return error ?? "Failed";
  if (phase !== "done" || result == null) return null;
  if (!result.dry_run && result.ok && result.summary != null) {
    return `Written to ${result.summary.project.name}`;
  }
  if (result.ok) return "No errors";
  return "Has errors";
}

export function IngestActions() {
  const { user } = useAuth();
  const isAdmin = isAdminSession(user);
  const snapshot = useAtomValue(snapshotAtom);
  const phase = useAtomValue(submissionPhaseAtom);
  const error = useAtomValue(submissionErrorAtom);
  const result = useAtomValue(lastIngestResultAtom);
  const submit = useSubmitColumn();

  const busy = phase === "working";
  // A column already in the database would be created again, not updated:
  // the importer has no update-by-id path yet
  const existing = (snapshot?.col_id ?? 0) > 0;
  let writeTitle =
    "Write the column to the database through the ingestion pipeline";
  if (!isAdmin) {
    writeTitle = "Only admins can write";
  } else if (existing) {
    writeTitle = "An existing column can be checked but not yet rewritten";
  } else if (result != null && !result.ok) {
    writeTitle = "Fix the errors first";
  }
  const canWrite =
    isAdmin && !existing && !busy && (result == null || result.ok);

  const status = statusText(phase, error, result);
  let statusEl = null;
  if (status != null) {
    statusEl = h("span.submission-status", status);
  }

  return h(ButtonGroup, { minimal: true }, [
    h(Button, {
      icon: "tick-circle",
      text: "Check",
      small: true,
      loading: busy,
      title: "Run the column through the ingestion pipeline without saving",
      onClick: () => submit(true),
    }),
    h(Button, {
      icon: "cloud-upload",
      text: "Write",
      small: true,
      intent: "primary",
      disabled: !canWrite,
      title: writeTitle,
      onClick: () => submit(false),
    }),
    statusEl,
  ]);
}
