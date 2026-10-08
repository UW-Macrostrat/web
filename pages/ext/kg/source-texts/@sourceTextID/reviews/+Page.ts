import hyper from "@macrostrat/hyper";
import { useEffect, useState } from "react";
import styles from "~/components/knowledge-graph/knowledge-graph.module.sass";
import { useData } from "vike-react/useData";
import { reload } from "vike/client/router";
import {
  AnchorButton,
  Button,
  ButtonGroup,
  Callout,
  NonIdealState,
} from "@blueprintjs/core";
import { AuthStatus } from "@macrostrat/form-components";
import {
  ExtractionViewClient,
  FeedbackNotesView,
  FeedbackRunEditorClient,
  formatDate,
  indexById,
  KGToolbar,
  type KGRun,
  RunMeta,
  sourceTextHref,
} from "~/components/knowledge-graph";
import {
  deleteFeedback,
  getFeedbackAccess,
  hasFeedbackAccess,
  type FeedbackAccess,
} from "~/components/knowledge-graph/feedback-api";
import type { HumanFeedbackPageData } from "./+data";

const h = hyper.styled(styles);

/** Reviews recorded for one source text. */
export function Page() {
  const { sourceText, humanRuns, notesByRun, lookups } =
    useData<HumanFeedbackPageData>();

  return h([
    h(KGToolbar, { right: h(AuthStatus, { large: false }) }, [
      h(ButtonGroup, { minimal: true }, [
        h(
          AnchorButton,
          { icon: "arrow-left", href: sourceTextHref(sourceText.id) },
          "Back to source text",
        ),
      ]),
    ]),
    h(HumanRuns, {
      key: sourceText.id,
      humanRuns,
      notesByRun,
      lookups,
    }),
  ]);
}

function HumanRuns({ humanRuns, notesByRun, lookups }) {
  const [access, setAccess] = useState<FeedbackAccess | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(
    () => new Set(),
  );

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      try {
        const result = await getFeedbackAccess();
        if (!active) return;

        setAccess(result);
        setAccessError(null);
      } catch {
        if (!active) return;

        setAccess(null);
        setAccessError(
          "Edit permissions could not be loaded. Sign in with an authorized account, then refresh.",
        );
      }
    }

    void loadAccess();

    // Refresh permissions when returning from a login tab/window.
    window.addEventListener("focus", loadAccess);

    return () => {
      active = false;
      window.removeEventListener("focus", loadAccess);
    };
  }, []);

  function onDeleted(runId: number) {
    setDeletedIds((previous) => {
      const next = new Set(previous);
      next.add(runId);
      return next;
    });
  }

  const visibleRuns = humanRuns.filter(
    (run: KGRun) => !deletedIds.has(Number(run.model_run)),
  );

  if (visibleRuns.length === 0) {
    return h(NonIdealState, {
      icon: "people",
      title: "No reviews yet",
      description: "There are no reviews for this source text.",
    });
  }

  const models = indexById(lookups.models);
  let accessWarning = null;
  if (accessError) {
    accessWarning = h(Callout, { intent: "warning" }, accessError);
  }

  return h("div.source-text-sections", [
    accessWarning,

    ...visibleRuns.map((run: KGRun) =>
      h(HumanRun, {
        key: run.model_run,
        run,
        model: models.get(run.model_id),
        notes: notesByRun[run.model_run] ?? null,
        lookups,
        canManage: hasFeedbackAccess(access, Number(run.model_run)),
        onDeleted,
      }),
    ),
  ]);
}

function HumanRun({
  run,
  model,
  notes,
  lookups,
  canManage,
  onDeleted,
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleDelete() {
    if (!canManage || deleting || editing || saving) return;

    const runId = Number(run.model_run);

    if (!window.confirm(`Permanently delete review #${runId}?`)) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteFeedback(runId);
    } catch (error) {
      let message = "Could not delete review.";
      if (error instanceof Error) message = error.message;
      setDeleteError(message);
      setDeleting(false);
      return;
    }

    onDeleted(runId);
  }

  function handleSaved() {
    setEditing(false);
    void reload();
  }

  let actions = null;
  if (canManage) {
    let editAction = h(
      Button,
      {
        icon: "edit",
        disabled: deleting,
        onClick: () => setEditing(true),
      },
      "Edit",
    );
    if (editing) {
      editAction = h(
        Button,
        {
          icon: "cross",
          disabled: saving,
          onClick: () => setEditing(false),
        },
        "Cancel",
      );
    }
    actions = h(ButtonGroup, { minimal: true }, [
      editAction,
      h(
        Button,
        {
          icon: "trash",
          intent: "danger",
          loading: deleting,
          disabled: deleting || editing || saving,
          onClick: handleDelete,
        },
        "Delete",
      ),
    ]);
  }

  let errorMessage = null;
  if (deleteError) {
    errorMessage = h(Callout, { intent: "danger" }, deleteError);
  }

  let extraction = h(ExtractionViewClient, {
    runs: [run],
    models: lookups.models,
    entityTypes: lookups.entityTypes,
  });
  if (editing && canManage) {
    extraction = h(FeedbackRunEditorClient, {
      key: run.model_run,
      run,
      models: lookups.models,
      entityTypes: lookups.entityTypes,
      overwrite: true,
      onSavingChange: setSaving,
      onSaved: handleSaved,
    });
  }

  return h("section.source-text-body", [
    h("div.run-header", [
      h("h3", ["Review ", `#${run.model_run}`]),
      h("span.bp6-text-muted", formatDate(notes?.date)),

      actions,
    ]),

    errorMessage,

    h(RunMeta, { run, model }),
    h(FeedbackNotesView, { notes }),
    extraction,
  ]);
}
