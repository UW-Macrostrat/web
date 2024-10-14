import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import { enhanceData } from "../../extractions/lib";
import {
  useEntityTypeIndex,
  useModelIndex,
  usePostgresQuery,
} from "../../extractions/lib/data-service";
import { FeedbackComponent } from "./lib";
import { OverlaysProvider } from "@blueprintjs/core";

/**
 * Get a single text window for feedback purposes
 */

export function Page() {
  return h(
    OverlaysProvider,
    h(ContentPage, [
      h(PageBreadcrumbs),
      h("h1", "Feedback"),
      h(ExtractionIndex),
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
    return h("div", "Loading...");
  }

  return h(
    "div.feedback-windows",
    data.map((d) => {
      console.log(data);
      const window = enhanceData(d, models, entityTypes);
      const { entities = [], paragraph_text, model } = window;
      //h("h1", paper.citation?.title ?? "Model extractions"),
      return h(FeedbackComponent, {
        entities,
        text: paragraph_text,
        model,
        entityTypes,
        sourceTextID: window.source_text,
        runID: window.model_run,
      });
    })
  );
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
