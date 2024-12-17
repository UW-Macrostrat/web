import h from "@macrostrat/hyper";

import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import {
  ExtractionContext,
  enhanceData,
} from "@macrostrat/feedback-components/src/extractions";
import {
  useEntityTypeIndex,
  useModelIndex,
  usePostgresQuery,
} from "./data-service";

export function Page() {
  return h(ContentPage, [h(PageBreadcrumbs), h(PageMain)]);
}

function PageMain() {
  return h("div", [h(ExtractionIndex)]);
}

function ExtractionIndex() {
  const { routeParams } = usePageContext();
  const { paperId } = routeParams;

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const filters = {
    subject: "paper_id",
    predicate: paperId,
  };

  const paper = usePostgresQuery("kg_publication_entities", filters)?.[0];

  const data = usePostgresQuery("kg_context_entities", filters);

  if (data == null || models == null || paper == null || entityTypes == null) {
    return h("div", "Loading...");
  }

  return h([
    h("h1", paper.citation?.title ?? "Model extractions"),
    data.map((d) => {
      return h([
        h("a", { href: `../feedback/${d.source_text}` }, "Feedback"),
        h(ExtractionContext, {
          data: enhanceData(d, models, entityTypes),
          entityTypes,
        }),
      ]);
    }),
  ]);
}
