import h from "./+Page.client.module.sass";
import { ContentPage } from "~/layouts";
import { Footer, getPGData, PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import {
  enhanceData,
  FeedbackComponent,
} from "@macrostrat/feedback-components";
import {
  useEntityTypeIndex,
  useModelIndex,
} from "../../../extractions/data-service";
import { NonIdealState, OverlaysProvider, Spinner, Button, Divider } from "@blueprintjs/core";
import {
  ErrorBoundary,
  FlexRow,
  Pagination,
} from "@macrostrat/ui-components";
import { useState } from "react";
import { MatchedEntityLink } from "#/integrations/xdd/extractions/match";

/**
 * Get a single text window for feedback purposes
 */

export function Page() {
  const [paper_id, setPaperID] = useState<number | null>(null);

  return h(
    OverlaysProvider,
    [
      h(ContentPage, [
        h("div.feedback-main", [
          h(PageBreadcrumbs, { title: "Human Feedback" }),
          h(ExtractionIndex, { setPaperID }),
        ]),
      ]),
      h(Footer)
    ]
  );
}

function ExtractionIndex({setPaperID}) {
  const { routeParams } = usePageContext();
  const { sourceTextID } = routeParams;

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const data = getPGData("/kg_context_entities", {
    source_text: "eq." + sourceTextID,
    version_id: "is.null"
  });

  if (data == null || models == null || entityTypes == null) {
    return h(Spinner);
  }

  setPaperID(data[0]?.paper_id || null);

  return h(
    ErrorBoundary,
    h(MultiFeedbackInterface, { data, models, entityTypes })
  );
}

function MultiFeedbackInterface({ data, models, entityTypes }) {
  const [ix, setIX] = useState(0);
  const currentData = data[ix];
  const count = data.length;

  const { feedback_id } = currentData;

  const autoSelect = window.location.href.split('autoselect=')[1]?.split(",");

  return h("div.feedback-interface", [
    h.if(data.length > 1)(NonIdealState, {
      title: "Feedback from multiple users",
      description: `Showing entities from feedback #${
        ix + 1
      } of ${count} feedback entries`,
    }),
    h(FlexRow, { justifyContent: "space-between" },  [
      h(FeedbackNotes, { feedback_id }),
      h.if(data.length > 1)(Pagination, {
        currentPage: ix,
        setPage: setIX,
        nextDisabled: ix >= count - 1,
      }),
    ]),
    h(Divider),
    h(FeedbackInterface, {
      data: currentData,
      models,
      entityTypes,
      autoSelect
    }),
  ]);
}

function FeedbackInterface({ data, models, entityTypes, autoSelect }) {
  const window = enhanceData(data, models, entityTypes);
  const { entities = [], paragraph_text, model } = window;

  return h(FeedbackComponent, {
    entities,
    text: paragraph_text,
    model,
    entityTypes,
    matchComponent: MatchedEntityLink,
    matchLinks: {
      lithology: "/lex/lithologies",
      lith_att: "/lex/lith-atts",
      strat_name: "/lex/strat-names",
      concept: "/lex/strat-concepts",
    },
    lineHeight: 3,
    view: true,
    autoSelect,
  });
}

function FeedbackNotes({ feedback_id }) {
  const feedback = getPGData("/extraction_feedback_combined", {
    feedback_id: "eq." + feedback_id,
  });

  console.log("feedback", feedback)

  if (feedback == null) {
    return h("div", "Loading feedback notes...");
  }

  if (feedback.length === 0) {
    return null
  }

  const { date, note, types } = feedback[0];

  const formattedTypes = types.map(e => e.type)

  return h("div.feedback-notes", [
    h("h3", "Feedback Notes"),
    h("p", "From " + new Date(date).toLocaleDateString()),
    h.if(note.length > 0)("p", "Note: " + note || "No notes provided."),
    h.if(types.length > 0)("p", "Types: " + (formattedTypes.join(", "))),
  ]);
}