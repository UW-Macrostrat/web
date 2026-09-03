import hyper from "@macrostrat/hyper";
import styles from "~/components/knowledge-graph/knowledge-graph.module.sass";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { reload } from "vike/client/router";
import { AnchorButton, ButtonGroup, NonIdealState } from "@blueprintjs/core";
import { AuthStatus } from "@macrostrat/form-components";
import {
  autoSelectFromSearch,
  FeedbackEditorClient,
  humanFeedbackHref,
  KGToolbar,
  paperHref,
  PublicationCitation,
  sourceTextHref,
  xddRoot,
} from "~/components/knowledge-graph";
import type { SourceTextPageData } from "./+data";

const h = hyper.styled(styles);

/** Review one source text: step through the queue, see where the paragraph
 * came from, and correct the model's entities. The editor is a client island;
 * the layout (`pageStyle: "content"`) owns breadcrumbs, title, and footer. */
export function Page() {
  const data = useData<SourceTextPageData>();
  const { sourceText, publication, modelRuns, lookups } = data;
  const ctx = usePageContext();
  const autoSelect = autoSelectFromSearch(ctx.urlParsed?.search);

  return h([
    h(SourceTextToolbar, { data }),
    h.if(publication != null)(PublicationCitation, {
      citation: publication?.citation,
      href: paperHref(sourceText.paper_id),
      headingLevel: 3,
    }),
    h(Editor, { modelRuns, lookups, autoSelect }),
  ]);
}

function SourceTextToolbar({ data }: { data: SourceTextPageData }) {
  const { sourceText, adjacent, humanRunCount } = data;

  let humanFeedbackLink = null;
  if (humanRunCount > 0) {
    humanFeedbackLink = h(
      AnchorButton,
      { icon: "people", href: humanFeedbackHref(sourceText.id) },
      `Human feedback (${humanRunCount})`
    );
  }

  let previous = null;
  if (adjacent.previous != null) {
    previous = h(AnchorButton, {
      icon: "chevron-left",
      href: sourceTextHref(adjacent.previous),
      "aria-label": "Previous source text",
    });
  }
  let next = null;
  if (adjacent.next != null) {
    next = h(
      AnchorButton,
      { rightIcon: "chevron-right", href: sourceTextHref(adjacent.next) },
      "Next"
    );
  }

  return h(KGToolbar, { right: h(AuthStatus, { large: false }) }, [
    h(ButtonGroup, { minimal: true }, [
      h(AnchorButton, { icon: "list", href: `${xddRoot}/feedback` }, "Queue"),
      previous,
      next,
    ]),
    humanFeedbackLink,
  ]);
}

function Editor({ modelRuns, lookups, autoSelect }) {
  if (modelRuns.length === 0) {
    return h(NonIdealState, {
      icon: "search-text",
      title: "Nothing to review",
      description:
        "No model run with a recorded version exists for this source text.",
    });
  }
  return h(FeedbackEditorClient, {
    runs: modelRuns,
    models: lookups.models,
    entityTypes: lookups.entityTypes,
    autoSelect,
    // A saved correction is a new human run: refresh the page data so the
    // "Human feedback" count and link reflect it.
    onSaved: () => reload(),
  });
}
