/** The interactive extraction viewer/editor. Client-only: it loads
 * `@macrostrat/feedback-components` (react-arborist, element measurement) and
 * the save flow. Pages reach it through the `clientOnly()` wrappers in
 * `./index.ts`, so the page modules themselves stay server-safe. */
import hyper from "@macrostrat/hyper";
import styles from "./knowledge-graph.module.sass";
import {
  enhanceData,
  FeedbackComponent,
} from "@macrostrat/feedback-components";
import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  MenuItem,
  OverlaysProvider,
  OverlayToaster,
  TextArea,
} from "@blueprintjs/core";
import { MultiSelect } from "@blueprintjs/select";
import { AuthStatus, useAuth } from "@macrostrat/form-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchFeedbackTypes, indexById } from "./api";
import { MATCH_LINKS } from "./match-links";
import {
  EMPTY_FEEDBACK_NOTES,
  type FeedbackNotes,
  saveFeedback,
} from "./feedback-api";
import type { KGEntityType, KGFeedbackType, KGModel, KGRun } from "./types";

const h = hyper.styled(styles);

export interface RunViewProps {
  run: KGRun;
  models: KGModel[];
  entityTypes: KGEntityType[];
  /** Entity names to pre-select (from the `autoselect` query parameter). */
  autoSelect?: string[];
}

function useEnhancedRun(run: KGRun, models: KGModel[], entityTypes: KGEntityType[]) {
  const entityTypeIndex = useMemo(() => indexById(entityTypes), [entityTypes]);
  const modelIndex = useMemo(() => indexById(models), [models]);
  const data = useMemo(
    () => enhanceData(run, modelIndex, entityTypeIndex),
    [run, modelIndex, entityTypeIndex]
  );
  return { data, entityTypeIndex };
}

/** Read-only rendering of one run's entity tree over its paragraph. */
export function ExtractionView({
  run,
  models,
  entityTypes,
  autoSelect = [],
}: RunViewProps) {
  const { data, entityTypeIndex } = useEnhancedRun(run, models, entityTypes);
  return h(
    OverlaysProvider,
    h(
      "div.extraction-view",
      h(FeedbackComponent, {
        key: run.model_run,
        entities: data.entities ?? [],
        text: data.paragraph_text,
        model: data.model,
        entityTypes: entityTypeIndex,
        matchLinks: MATCH_LINKS,
        allowOverlap: true,
        view: true,
        autoSelect,
      })
    )
  );
}

export interface FeedbackEditorProps extends RunViewProps {
  /** Called with the new run id after a successful save. */
  onSaved?: (runId: number) => void;
}

/** The feedback editor for a single model run. Editing requires a signed-in
 * user (the site-wide `AuthProvider`); anonymous visitors get the read-only
 * view with a sign-in prompt instead of a form they cannot submit. */
export function FeedbackEditor(props: FeedbackEditorProps) {
  const { user } = useAuth();
  if (user == null) {
    return h("div.feedback-editor", [
      h(SignInPrompt),
      h(ExtractionView, props),
    ]);
  }
  return h(EditableRun, props);
}

function SignInPrompt() {
  return h(
    Callout,
    {
      intent: "primary",
      icon: "blocked-person",
      title: "Sign in to give feedback",
    },
    [
      h(
        "p",
        "Extractions can be browsed anonymously. Correcting entities and saving feedback requires a Macrostrat account."
      ),
      h(AuthStatus, { large: false }),
    ]
  );
}

function EditableRun({
  run,
  models,
  entityTypes,
  autoSelect = [],
  onSaved,
}: FeedbackEditorProps) {
  const { data, entityTypeIndex } = useEnhancedRun(run, models, entityTypes);
  const [notes, setNotes] = useState<FeedbackNotes>(EMPTY_FEEDBACK_NOTES);

  const onSave = useCallback(
    async (tree) => {
      const runId = await withSaveToasts(() =>
        saveFeedback({
          tree,
          sourceTextId: run.source_text,
          supersedesRunIds: [run.model_run],
          modelId: run.model_id,
          versionId: run.version_id,
          notes,
        })
      );
      if (runId != null) onSaved?.(runId);
    },
    [run, notes, onSaved]
  );

  return h(OverlaysProvider, [
    h("div.feedback-editor", [
      h(FeedbackComponent, {
        key: run.model_run,
        entities: data.entities ?? [],
        text: data.paragraph_text,
        model: data.model,
        entityTypes: entityTypeIndex,
        matchLinks: MATCH_LINKS,
        allowOverlap: true,
        autoSelect,
        onSave,
      }),
      h(FeedbackNotesCard, { notes, setNotes }),
    ]),
  ]);
}

// ---- Notes and categories -------------------------------------------------

function useFeedbackTypes(): KGFeedbackType[] | null {
  const [types, setTypes] = useState<KGFeedbackType[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchFeedbackTypes()
      .then((rows) => {
        if (!cancelled) setTypes(rows);
      })
      .catch(() => {
        if (!cancelled) setTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return types;
}

function FeedbackNotesCard({
  notes,
  setNotes,
}: {
  notes: FeedbackNotes;
  setNotes: (n: FeedbackNotes) => void;
}) {
  const allTypes = useFeedbackTypes();

  const isSelected = (item: KGFeedbackType) =>
    notes.types.some((d) => d.type_id === item.type_id);

  const selectType = (item: KGFeedbackType) => {
    if (isSelected(item)) return;
    setNotes({ ...notes, types: [...notes.types, item] });
  };

  const removeType = (item: KGFeedbackType) => {
    setNotes({
      ...notes,
      types: notes.types.filter((d) => d.type_id !== item.type_id),
    });
  };

  const renderItem = (item: KGFeedbackType, { handleClick, modifiers }) => {
    if (!modifiers.matchesPredicate) return null;
    return h(MenuItem, {
      key: item.type_id,
      text: item.type,
      onClick: handleClick,
      active: modifiers.active,
      shouldDismissPopover: false,
    });
  };

  const items = (allTypes ?? []).filter((d) => !isSelected(d));
  let placeholder = "Feedback categories…";
  if (allTypes == null) placeholder = "Loading feedback types…";

  return h(Card, { className: "feedback-notes" }, [
    h("h4", "Notes on this extraction"),
    h(
      "p.bp6-text-muted",
      "Categorize the problems you corrected and leave a note. Notes are saved together with the entity edits."
    ),
    h(MultiSelect<KGFeedbackType>, {
      items,
      itemRenderer: renderItem,
      itemPredicate: (query, item) =>
        item.type.toLowerCase().includes(query.toLowerCase()),
      selectedItems: notes.types,
      onItemSelect: selectType,
      onRemove: removeType,
      tagRenderer: (item) => item.type,
      placeholder,
      popoverProps: { minimal: true },
      fill: true,
      resetOnSelect: true,
    }),
    h(TextArea, {
      value: notes.note,
      onChange: (e) => setNotes({ ...notes, note: e.target.value }),
      placeholder: "Optional note about this extraction…",
      autoResize: true,
      fill: true,
    }),
  ]);
}

// ---- Run switcher ---------------------------------------------------------

interface RunSwitcherProps {
  runs: KGRun[];
  models: KGModel[];
  entityTypes: KGEntityType[];
  autoSelect?: string[];
  /** Render one run: the read-only view or the editor. */
  renderRun: (props: RunViewProps) => React.ReactNode;
}

/** Steps through several runs over the same source text one at a time.
 * Merging runs into a single editable tree is not supported, so each run is
 * reviewed on its own. */
export function RunSwitcher({
  runs,
  models,
  entityTypes,
  autoSelect,
  renderRun,
}: RunSwitcherProps) {
  const [ix, setIX] = useState(0);
  const count = runs.length;
  const current = runs[Math.min(ix, count - 1)];
  if (current == null) return null;

  let switcher = null;
  if (count > 1) {
    switcher = h("div.run-switcher", [
      h(ButtonGroup, { minimal: true }, [
        h(Button, {
          icon: "chevron-left",
          disabled: ix <= 0,
          onClick: () => setIX(ix - 1),
          "aria-label": "Previous run",
        }),
        h(Button, {
          icon: "chevron-right",
          disabled: ix >= count - 1,
          onClick: () => setIX(ix + 1),
          "aria-label": "Next run",
        }),
      ]),
      h(
        "span.run-switcher-label",
        `Run ${ix + 1} of ${count} for this text (#${current.model_run})`
      ),
    ]);
  }

  return h([
    switcher,
    renderRun({ run: current, models, entityTypes, autoSelect }),
  ]);
}

/** Convenience wrappers so pages can pass a run list without knowing about
 * `renderRun`. */
export function ExtractionViewForRuns(props: Omit<RunSwitcherProps, "renderRun">) {
  return h(RunSwitcher, { ...props, renderRun: (p) => h(ExtractionView, p) });
}

export function FeedbackEditorForRuns(
  props: Omit<RunSwitcherProps, "renderRun"> & { onSaved?: (id: number) => void }
) {
  const { onSaved, ...rest } = props;
  return h(RunSwitcher, {
    ...rest,
    renderRun: (p) => h(FeedbackEditor, { ...p, onSaved }),
  });
}

// ---- Save status ----------------------------------------------------------

let toasterPromise: Promise<OverlayToaster> | null = null;

function getToaster() {
  toasterPromise ??= OverlayToaster.createAsync({ position: "top" });
  return toasterPromise;
}

/** Run a save, showing progress and its outcome as toasts. Resolves to the
 * save's result, or null if it failed (the error is shown, not rethrown). */
async function withSaveToasts<T>(fn: () => Promise<T>): Promise<T | null> {
  const toaster = await getToaster();
  const key = toaster.show({
    message: "Saving feedback…",
    intent: "primary",
    icon: "cloud-upload",
    timeout: 0,
  });
  try {
    const result = await fn();
    toaster.dismiss(key);
    toaster.show({
      message: "Feedback saved",
      intent: "success",
      icon: "tick-circle",
    });
    return result;
  } catch (e) {
    toaster.dismiss(key);
    toaster.show({
      message: `Feedback was not saved: ${e?.message ?? e}`,
      intent: "danger",
      icon: "warning-sign",
      timeout: 0,
    });
    return null;
  }
}
