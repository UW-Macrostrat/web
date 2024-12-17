import h from "./+Page.client.module.sass";
import { FullscreenPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import {
  enhanceData,
  FeedbackComponent,
} from "@macrostrat/feedback-components";
import {
  useEntityTypeIndex,
  useModelIndex,
  usePostgresQuery,
} from "../../extractions/data-service";
import { NonIdealState, OverlaysProvider, Spinner } from "@blueprintjs/core";
import {
  ErrorBoundary,
  FlexRow,
  Pagination,
  Spacer,
} from "@macrostrat/ui-components";
import { useState } from "react";
import { AuthStatus } from "@macrostrat/auth-components";

/**
 * Get a single text window for feedback purposes
 */

export function Page() {
  return h(
    OverlaysProvider,
    h(FullscreenPage, [
      h("div.feedback-main", [
        h(PageBreadcrumbs),
        h(FlexRow, { alignItems: "center" }, [
          h("h1", "Feedback"),
          h(Spacer),
          h(AuthStatus),
        ]),
        h(ExtractionIndex),
      ]),
    ])
  );
}

function ExtractionIndex() {
  const { routeParams } = usePageContext();
  const { sourceTextID } = routeParams;

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const data = usePostgresQuery("kg_context_entities", {
    subject: "source_text",
    predicate: sourceTextID,
  });

  if (data == null || models == null || entityTypes == null) {
    return h(Spinner);
  }

  console.log(data);

  return h(
    ErrorBoundary,
    h(MultiFeedbackInterface, { data, models, entityTypes })
  );
}

function MultiFeedbackInterface({ data, models, entityTypes }) {
  const [ix, setIX] = useState(0);
  const currentData = data[ix];
  const count = data.length;

  return h("div.feedback-interface", [
    h.if(data.length > 1)([
      h(NonIdealState, {
        icon: "warning-sign",
        title: "Multiple model runs for feedback",
        description: `Showing entities from ${
          ix + 1
        } of ${count} model runs. Merging several runs is not yet supported.`,
      }),
      h(Pagination, {
        count,
        page: ix,
        setPage: setIX,
        nextDisabled: ix >= count - 1,
      }),
    ]),
    h(FeedbackInterface, {
      data: currentData,
      models,
      entityTypes,
    }),
  ]);
}

function FeedbackInterface({ data, models, entityTypes }) {
  const window = enhanceData(data, models, entityTypes);
  const { entities = [], paragraph_text, model } = window;
  return h(FeedbackComponent, {
    entities,
    text: paragraph_text,
    model,
    entityTypes,
    sourceTextID: window.source_text,
    runID: window.model_run,
  });
}


// function FeedbackDevTool() {
//   const entities = useStore((state) => state.entities);
//   if (entities == null)
//     return h(NonIdealState, { icon: h(Spinner), title: "Loading..." });
//
//   return h(JSONView, { data: entities, showRoot: false, keyPath: 0 });
// }
//
// FeedbackDevTool.title = "Feedback";
//
// export const devTools = [FeedbackDevTool];
