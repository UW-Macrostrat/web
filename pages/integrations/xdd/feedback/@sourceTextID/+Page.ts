import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import { enhanceData, ExtractionContext } from "../../extractions/lib";
import {
  usePostgresQuery,
  useModelIndex,
  useEntityTypeIndex,
} from "../../extractions/lib/data-service";
import { FeedbackComponent } from "./lib";

/**
 * Get a single text window for feedback purposes
 */

// noinspection JSUnusedGlobalSymbols
export function Page() {
  return h(ContentPage, [h(PageBreadcrumbs), h(ExtractionIndex)]);
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

  const window = data[0];

  return h([
    //h("h1", paper.citation?.title ?? "Model extractions"),
    h(FeedbackComponent),

    h(ExtractionContext, {
      data: enhanceData(window, models, entityTypes),
      entityTypes,
    }),
  ]);
}
