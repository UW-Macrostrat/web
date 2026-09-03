import hyper from "@macrostrat/hyper";
import styles from "~/components/knowledge-graph/knowledge-graph.module.sass";
import { useData } from "vike-react/useData";
import { AnchorButton, ButtonGroup, NonIdealState } from "@blueprintjs/core";
import { AuthStatus } from "@macrostrat/form-components";
import {
  ExtractionViewClient,
  FeedbackNotesView,
  formatDate,
  indexById,
  KGToolbar,
  type KGRun,
  RunMeta,
  sourceTextHref,
} from "~/components/knowledge-graph";
import type { HumanFeedbackPageData } from "./+data";

const h = hyper.styled(styles);

/** The corrections reviewers have recorded for one source text, each with the
 * note and categories attached to it. */
export function Page() {
  const { sourceText, humanRuns, notesByRun, lookups } =
    useData<HumanFeedbackPageData>();

  return h([
    h(KGToolbar, { right: h(AuthStatus, { large: false }) }, [
      h(ButtonGroup, { minimal: true }, [
        h(
          AnchorButton,
          { icon: "arrow-left", href: sourceTextHref(sourceText.id) },
          "Back to source text"
        ),
      ]),
    ]),
    h(HumanRuns, { humanRuns, notesByRun, lookups }),
  ]);
}

function HumanRuns({ humanRuns, notesByRun, lookups }) {
  if (humanRuns.length === 0) {
    return h(NonIdealState, {
      icon: "people",
      title: "No human feedback yet",
      description: "Nobody has reviewed this source text.",
    });
  }
  const models = indexById(lookups.models);
  return h(
    "div.source-text-sections",
    humanRuns.map((run: KGRun) =>
      h(HumanRun, {
        key: run.model_run,
        run,
        model: models.get(run.model_id),
        notes: notesByRun[run.model_run] ?? null,
        lookups,
      })
    )
  );
}

function HumanRun({ run, model, notes, lookups }) {
  return h("section.source-text-body", [
    h("div.run-header", [
      h("h3", ["Feedback run ", `#${run.model_run}`]),
      h("span.bp6-text-muted", formatDate(notes?.date)),
    ]),
    h(RunMeta, { run, model }),
    h(FeedbackNotesView, { notes }),
    h(ExtractionViewClient, {
      runs: [run],
      models: lookups.models,
      entityTypes: lookups.entityTypes,
    }),
  ]);
}
