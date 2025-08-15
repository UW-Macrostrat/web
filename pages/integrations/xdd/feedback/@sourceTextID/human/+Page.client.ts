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
import { useState, useEffect } from "react";
import { MatchedEntityLink } from "#/integrations/xdd/extractions/match";
import { fetchPGData } from "~/_utils";

/**
 * Get a single text window for feedback purposes
 */

export function Page() {
  const [paper_id, setPaperID] = useState<number | null>(null);
  const [title, setTitle] = useState("Loading title...");

  useEffect(() => {
    if (paper_id) {
      fetchPGData("kg_publication_entities", { paper_id: "eq." + paper_id })
        .then((paper) => {
          setTitle(paper[0]?.citation?.title);
        });
    }
  }, [paper_id]);
  

  return h(
    OverlaysProvider,
    [
      h(ContentPage, [
        h("div.feedback-main", [
          h(ExtractionIndex, { setPaperID, title }),
        ]),
      ]),
      h(Footer)
    ]
  );
}

function ExtractionIndex({setPaperID, title}) {
  const { routeParams } = usePageContext();
  const { sourceTextID } = routeParams;
  const [ix, setIX] = useState(0);

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const data = getPGData("/kg_context_entities", {
    source_text: "eq." + sourceTextID,
    version_id: "is.null"
  });

  const count = data?.length || 0;
  const extra = data?.length ? " #" + (ix + 1) + " of " + count : "";

  const HeaderComponent = h(FlexRow, { alignItems: "center", justifyContent: "space-between" }, [
      h(PageBreadcrumbs, { title: "Human Feedback" + extra }),
      h.if(data?.length > 1)('div.pagination', [
        h(Pagination, {
          currentPage: ix,
          setPage: setIX,
          nextDisabled: ix >= count - 1,
        }),
      ])
    ]);

  if (data == null || models == null || entityTypes == null) {
    return h('div', [
      HeaderComponent,
      h(Spinner)
    ]);
  }

  setPaperID(data[0]?.paper_id || null);

  return h('div', [
    HeaderComponent,
    h(
      ErrorBoundary,
      h(MultiFeedbackInterface, { data, models, entityTypes, title, ix, setIX })
    )
  ])
}

function MultiFeedbackInterface({ data, models, entityTypes, title, ix, setIX }) {
  const currentData = data[ix];

  const { feedback_id } = currentData;

  const autoSelect = window.location.href.split('autoselect=')[1]?.split(",");

  return h("div.feedback-interface", [
    h('h1', title),
    h(FeedbackNotes, { feedback_id }),
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
    return h('div')
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